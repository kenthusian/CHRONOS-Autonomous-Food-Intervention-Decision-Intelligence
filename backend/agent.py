"""
agent.py — On-demand AI analysis engine.

Call run_analysis() to scan all active inventory, compute risk, find
redistribution opportunities, and generate ranked Recommendations saved to DB.
"""

from __future__ import annotations
from datetime import date
from typing import Any

from . import database as db


# ═══════════════════════════════════════════════════════════════════
#  RISK SCORING
# ═══════════════════════════════════════════════════════════════════

def compute_risk(item: dict) -> float:
    """
    0–1 composite wastage + stockout risk score.

    Components:
      wastage_component  — % of stock expected to expire unsold      (40 %)
      urgency_component  — how imminent the expiry is                (30 %)
      stockout_component — coverage below 3-day safety buffer        (30 %)
    """
    days_expiry  = max(item.get("days_until_expiry", 999), 0)
    days_stock   = item.get("days_of_stock", 999)
    wastage_pct  = item.get("wastage_ratio", 0.0)

    urgency   = max(0.0, 1.0 - days_expiry / 10.0)          # 0 at ≥10d, 1 at 0d
    stockout  = max(0.0, 1.0 - days_stock  / 3.0) if days_stock < 3 else 0.0

    risk = 0.40 * wastage_pct + 0.30 * urgency + 0.30 * stockout
    return round(min(risk, 1.0), 4)


def _urgency_label(item: dict) -> str:
    s, e, wr = item["days_of_stock"], item["days_until_expiry"], item["wastage_ratio"]
    if s < 1.0 or (e <= 2 and wr > 0.50):
        return "critical"
    if s < 2.0 or (e <= 4 and wr > 0.30):
        return "high"
    if s < 4.0 or wr > 0.25:
        return "medium"
    return "low"


# ═══════════════════════════════════════════════════════════════════
#  REDISTRIBUTION FEASIBILITY
# ═══════════════════════════════════════════════════════════════════

def _check_redistribution(source: dict, dest: dict) -> tuple[bool, float, str]:
    """
    Returns (feasible, units_to_transfer, human_readable_reason).

    Gates (all must pass):
      1. Cold-chain compatibility
      2. Shelf life survives transit + 1 day safety margin
      3. Source has surplus beyond its own 2-day buffer
      4. Transfer quantity ≥ minimum meaningful threshold
    """
    # Gate 1: cold-chain
    if source.get("requires_cold_chain") and not dest.get("has_cold_storage"):
        return False, 0.0, (
            f"Cold-chain product cannot be sent to {dest['warehouse_name']} "
            "(no refrigeration)."
        )

    # Gate 2: shelf life vs transit
    transit = max(
        source.get("transport_time_days", 1.5),
        dest.get("transport_time_days", 1.5),
    )
    if source["days_until_expiry"] <= transit + 1.0:
        return False, 0.0, (
            f"Remaining shelf life ({source['days_until_expiry']}d) is too short "
            f"for transit ({transit:.1f}d) + 1d safety margin."
        )

    # Gate 3: source surplus
    src_buffer = source["avg_daily_demand"] * 2.0
    surplus    = source["total_quantity"] - src_buffer
    if surplus < 20.0:
        return False, 0.0, (
            f"{source['warehouse_name']} has insufficient surplus "
            f"({source['total_quantity']:.0f} {source['unit']} ≤ 2-day buffer)."
        )

    # Quantity: fill destination to cover min(dest_shelf_life, 5) days
    dest_target   = dest["avg_daily_demand"] * min(dest["days_until_expiry"], 5.0)
    dest_gap      = max(0.0, dest_target - dest["total_quantity"])
    space_at_dest = dest.get("capacity_units", 99999) - dest["total_quantity"]
    qty           = min(surplus, dest_gap, space_at_dest)

    # Gate 4: meaningful transfer
    if qty < 20.0:
        return False, 0.0, "Transfer quantity below minimum threshold (20 units)."

    reason = (
        f"{source['warehouse_name']} holds {source['total_quantity']:.0f} {source['unit']} "
        f"of {source['product_name']} with {source['days_until_expiry']}d until expiry "
        f"(surplus {surplus:.0f} {source['unit']} after 2-day buffer). "
        f"{dest['warehouse_name']} has only {dest['total_quantity']:.0f} {source['unit']} "
        f"({dest['days_of_stock']:.1f}d coverage at {dest['avg_daily_demand']:.0f} {source['unit']}/day). "
        f"Transit time: {transit:.1f}d. Transferring {qty:.0f} {source['unit']} "
        f"will cover {qty/max(dest['avg_daily_demand'],0.1):.1f}d of demand at destination."
    )
    return True, round(qty, 1), reason


# ═══════════════════════════════════════════════════════════════════
#  SOLO-LOCATION ACTIONS
# ═══════════════════════════════════════════════════════════════════

def _decide_solo(item: dict) -> dict[str, Any]:
    """Assign the best single-location action for an item NOT in a redistribution pair."""
    stock   = item["total_quantity"]
    demand  = max(item["avg_daily_demand"], 0.1)
    days_s  = item["days_of_stock"]
    days_e  = item["days_until_expiry"]
    lead    = item.get("supplier_lead_days", 3)
    reorder = item.get("reorder_qty", 200)
    cost    = item.get("product_cost", 0)
    unit    = item.get("unit", "units")
    urgency = _urgency_label(item)

    # ── DISCOUNT: shelf life too short to wait for normal sales velocity
    if days_e <= 3 and item["wastage_ratio"] > 0.25:
        discount_pct = 30 if days_e <= 1 else (25 if days_e <= 2 else 15)
        extra_sales  = round(stock * (discount_pct / 100) * 0.6, 1)   # rough uplift
        saving       = round(extra_sales * cost * 0.7, 2)
        return {
            "action_type": "discount",
            "urgency":     urgency,
            "quantity":    round(stock, 1),
            "estimated_saving": saving,
            "estimated_cost":   0.0,
            "detail": {
                "reason": (
                    f"{stock:.0f} {unit} of {item['product_name']} at "
                    f"{item['warehouse_name']} expire in {days_e}d. "
                    f"At current demand of {demand:.0f} {unit}/day, "
                    f"{item['expected_wastage']:.0f} {unit} ({item['wastage_ratio']*100:.0f}%) "
                    f"will be wasted. Recommend {discount_pct}% markdown to accelerate "
                    f"sell-through and recover ~₹{saving:,.0f} in value."
                ),
                "discount_pct":         discount_pct,
                "expected_wastage":     round(item["expected_wastage"], 1),
                "wastage_value":        round(item["expected_wastage"] * cost, 2),
                "estimated_extra_sales": extra_sales,
            },
        }

    # ── PRIORITY SHIP: imminent stock-out, normal order arrives too late
    if days_s < 1.0:
        qty_needed = round(demand * (lead + 3), 1)
        return {
            "action_type": "priority_ship",
            "urgency":     "critical",
            "quantity":    qty_needed,
            "estimated_saving": round(qty_needed * cost * 0.05, 2),
            "estimated_cost":   round(qty_needed * cost * 0.08, 2),  # premium freight
            "detail": {
                "reason": (
                    f"Critical stock-out: {stock:.0f} {unit} of {item['product_name']} "
                    f"at {item['warehouse_name']} = {days_s:.2f}d coverage "
                    f"at {demand:.0f} {unit}/day. Standard lead time is {lead}d — "
                    f"will arrive too late. Priority expedited shipment of "
                    f"{qty_needed:.0f} {unit} required immediately."
                ),
                "current_stock":   round(stock, 1),
                "days_of_stock":   round(days_s, 2),
                "units_needed":    qty_needed,
                "lead_time_days":  lead,
            },
        }

    # ── REORDER: approaching reorder point
    reorder_threshold = lead + 1.5
    if days_s < reorder_threshold:
        qty_to_order = round(demand * (lead + 4), 1)
        saving       = round(qty_to_order * cost * 0.02, 2)
        return {
            "action_type": "reorder",
            "urgency":     urgency,
            "quantity":    qty_to_order,
            "estimated_saving": saving,
            "estimated_cost":   round(qty_to_order * cost, 2),
            "detail": {
                "reason": (
                    f"{item['product_name']} at {item['warehouse_name']}: "
                    f"{stock:.0f} {unit} ({days_s:.1f}d) is below the reorder point "
                    f"({reorder_threshold:.1f}d). Supplier lead time: {lead}d. "
                    f"Placing order for {qty_to_order:.0f} {unit} to prevent stock-out."
                ),
                "current_stock":      round(stock, 1),
                "days_of_stock":      round(days_s, 2),
                "units_to_order":     qty_to_order,
                "eta_days":           lead,
                "reorder_point_days": reorder_threshold,
            },
        }

    # ── HOLD: no action needed
    return {
        "action_type": "hold",
        "urgency":     "low",
        "quantity":    round(stock, 1),
        "estimated_saving": 0.0,
        "estimated_cost":   0.0,
        "detail": {
            "reason": (
                f"{item['product_name']} at {item['warehouse_name']} is stable — "
                f"{stock:.0f} {unit} ({days_s:.1f}d coverage), "
                f"{days_e}d shelf life remaining. No action required."
            ),
            "days_of_stock":    round(days_s, 2),
            "days_until_expiry": days_e,
            "wastage_risk_pct": round(item["wastage_ratio"] * 100, 1),
        },
    }


# ═══════════════════════════════════════════════════════════════════
#  MAIN ANALYSIS PIPELINE
# ═══════════════════════════════════════════════════════════════════

async def run_analysis() -> list[dict]:
    """
    Full on-demand AI analysis pipeline.

    1. Expire stale pending recommendations.
    2. Load and enrich inventory summary with demand data.
    3. Identify redistribution pairs (cross-location).
    4. Assign solo actions to remaining items.
    5. Persist all recommendations and return them.
    """

    # ── Step 1: clean up ─────────────────────────────────────────
    await db.expire_old_recommendations()

    # ── Step 2: inventory + demand enrichment ────────────────────
    summary = await db.get_inventory_summary()
    if not summary:
        return []

    today = date.today()
    for item in summary:
        avg_demand = await db.get_avg_demand(item["product_id"], item["warehouse_id"])
        item["avg_daily_demand"] = avg_demand or item.get("default_daily_demand", 50.0)

        demand = max(item["avg_daily_demand"], 0.1)
        item["days_of_stock"] = item["total_quantity"] / demand

        if item.get("earliest_expiry"):
            delta = (date.fromisoformat(item["earliest_expiry"]) - today).days
            item["days_until_expiry"] = max(delta, 0)
        else:
            item["days_until_expiry"] = 999

        sellable         = demand * item["days_until_expiry"]
        item["expected_wastage"] = max(0.0, item["total_quantity"] - sellable)
        item["wastage_ratio"]    = item["expected_wastage"] / max(item["total_quantity"], 1)

    # ── Step 3: Heuristic Recommendations ──────────────────────────────────────
    heuristic_recs = []
    
    # Group items by product for redistribution check
    by_product = {}
    for item in summary:
        by_product.setdefault(item["product_id"], []).append(item)
        
    for pid, items in by_product.items():
        # simple redistribution check
        surplus_items = sorted([i for i in items if i["days_of_stock"] > 4.0], key=lambda x: x["days_of_stock"], reverse=True)
        shortage_items = sorted([i for i in items if i["days_of_stock"] < 2.0], key=lambda x: x["days_of_stock"])
        
        paired = set()
        for src in surplus_items:
            for dst in shortage_items:
                if dst["warehouse_id"] in paired: continue
                feasible, qty, reason = _check_redistribution(src, dst)
                if feasible:
                    cost = qty * 3.5 # Example transport cost
                    saving = qty * src.get("product_cost", 0) * 0.20 # value saved
                    heuristic_recs.append({
                        "product_id": src["product_id"],
                        "from_warehouse_id": src["warehouse_id"],
                        "to_warehouse_id": dst["warehouse_id"],
                        "action_type": "redistribute",
                        "urgency": "medium",
                        "quantity": qty,
                        "estimated_saving": round(saving, 2),
                        "estimated_cost": round(cost, 2),
                        "detail": {"reason": reason}
                    })
                    paired.add(dst["warehouse_id"])
                    break # src can only supply one for now in this simple heuristic
                    
        for item in items:
            if item["warehouse_id"] not in paired and item not in surplus_items:
                action = _decide_solo(item)
                if action["action_type"] != "hold":
                    action["product_id"] = item["product_id"]
                    action["from_warehouse_id"] = item["warehouse_id"]
                    action["to_warehouse_id"] = None
                    heuristic_recs.append(action)

    recs = heuristic_recs

    # ── Step 4: Ask Groq to augment recommendations (Optional) ────────────
    import os
    import json
    import urllib.request

    api_key = os.environ.get("GROQ_API_KEY")
    if api_key:
        prompt = f"""You are an expert AI supply chain planner.
Here is the current inventory summary:
{json.dumps(summary, indent=2)}

Your task is to analyze this data and generate a list of actionable recommendations to optimize inventory, minimize wastage, and prevent stockouts.
For each item that needs attention, recommend one of the following actions:
- "redistribute": Transfer surplus from one warehouse to another that has a shortage.
- "discount": Apply a discount to sell soon-to-expire items faster.
- "reorder": Order more stock from the supplier for a warehouse facing a stockout.
- "priority_ship": Expedite shipping for a critical stockout.

Output a JSON object with a key "recommendations" containing an array of recommendation objects. Each object MUST have this exact schema:
[{{
    "product_id": <integer>,
    "from_warehouse_id": <integer> (source warehouse, or warehouse needing reorder/discount),
    "to_warehouse_id": <integer or null> (destination warehouse, or null if not a transfer),
    "action_type": "redistribute" | "discount" | "reorder" | "priority_ship",
    "urgency": "critical" | "high" | "medium" | "low",
    "quantity": <float> (number of units to act on),
    "estimated_saving": <float> (rupees saved/generated),
    "estimated_cost": <float> (rupees cost of action),
    "detail": {{
        "reason": "<String explaining your reasoning clearly>"
    }}
}}]

Return ONLY the JSON object. Make sure the logic is smart, considers transit times vs expiry dates, and avoids recommending actions for healthy stock.
"""
        try:
            req = urllib.request.Request(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "User-Agent": "ChronosAI/1.0"
                },
                data=json.dumps({
                    "model": "qwen/qwen3.8-27b",
                    "messages": [{"role": "user", "content": prompt}],
                    "response_format": {"type": "json_object"}
                }).encode("utf-8")
            )
            with urllib.request.urlopen(req) as response:
                result = json.loads(response.read().decode())
                content = result["choices"][0]["message"]["content"]
                parsed = json.loads(content)
                llm_recs = parsed.get("recommendations", [])
            
            # Mix LLM recs with Heuristic recs (deduplication by product and warehouse)
            seen = {(r["product_id"], r["from_warehouse_id"]) for r in recs}
            for gr in llm_recs:
                if (gr["product_id"], gr["from_warehouse_id"]) not in seen:
                    recs.append(gr)
                    seen.add((gr["product_id"], gr["from_warehouse_id"]))
        except Exception as e:
            print(f"Error calling Groq for analysis: {e}")

    # ── Step 5: Persist to DB ──────────────────────────────────────
    decisions = []
    
    # Fetch existing recommendations to prevent duplicates
    existing_recs = await db.get_recommendations()
    # Only care about recently made recommendations (e.g. pending, or recently rejected/accepted)
    # We will just check if a recommendation with the same product, action, and source/dest exists.
    # To keep it simple, if a recommendation with same core attributes exists in the last 100 recs, skip it.
    recent_recs = existing_recs[:200]
    
    def is_duplicate(rec):
        for er in recent_recs:
            if (er.get("product_id") == rec["product_id"] and
                er.get("from_warehouse_id") == rec["from_warehouse_id"] and
                er.get("to_warehouse_id") == rec.get("to_warehouse_id") and
                er.get("action_type") == rec["action_type"]):
                # If it's pending, accepted, or rejected recently, we consider it a duplicate
                if er.get("status") in ["pending", "accepted", "rejected"]:
                    return True
        return False

    for rec in recs:
        if is_duplicate(rec):
            continue
            
        rec["status"] = "pending"
        try:
            rid = await db.create_recommendation(rec)
            decisions.append({**rec, "id": rid})
        except Exception as e:
            print(f"Error saving recommendation: {e}")

    return decisions

import os
import json
import urllib.request
import asyncio
from duckduckgo_search import DDGS

async def _call_llm(prompt: str) -> dict:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return {}
        
    try:
        req = urllib.request.Request(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "ChronosAI/1.0"
            },
            data=json.dumps({
                "model": "qwen/qwen3.8-27b",
                "messages": [{"role": "user", "content": prompt}],
                "response_format": {"type": "json_object"}
            }).encode("utf-8")
        )
        def fetch():
            with urllib.request.urlopen(req) as response:
                return json.loads(response.read().decode())
        result = await asyncio.to_thread(fetch)
        content = result["choices"][0]["message"]["content"]
        return json.loads(content)
    except Exception as e:
        error_msg = str(e)
        if hasattr(e, 'read'):
            error_msg = e.read().decode()
        with open("llm_error.log", "a") as f:
            f.write(f"LLM Error: {error_msg}\n")
        print(f"Agent LLM error: {error_msg}")
        return {}

async def _risk_agent(rec: dict) -> dict:
    prompt = f"""You are the Risk & Spoilage Agent. Evaluate this recommendation:
{json.dumps(rec)}
Output JSON: {{"risk_score": 1-10, "analysis": "brief explanation", "dialogue": "A short, professional quote stating your findings"}}"""
    res = await _call_llm(prompt)
    if not res: res = {"risk_score": 5, "analysis": "Fallback", "dialogue": "Risk assessment complete."}
    return res

async def _logistics_agent(rec: dict) -> dict:
    web_context = ""
    # Exogenous Web-Awareness
    if rec.get("to_city"):
        try:
            results = DDGS().text(f"{rec['to_city']} weather traffic disruptions today", max_results=2)
            web_context = "Live Web Data for Destination: " + json.dumps(results)
        except Exception:
            web_context = "Web search unavailable."
            
    prompt = f"""You are the Logistics & Routing Agent. Evaluate this recommendation:
{json.dumps(rec)}
{web_context}
Based on the live web data, assess if there are any real-world delays.
Output JSON: {{"feasibility": "high"|"medium"|"low", "analysis": "brief explanation", "dialogue": "A short quote stating your logistics and weather findings"}}"""
    res = await _call_llm(prompt)
    if not res: res = {"feasibility": "medium", "analysis": "Fallback", "dialogue": "Logistics checked."}
    return res

async def _finance_agent(rec: dict) -> dict:
    prompt = f"""You are the Financial Pricing Agent. Evaluate this recommendation:
{json.dumps(rec)}
If this is a discount, propose an exact discount percentage based on the urgency.
Output JSON: {{"roi_score": 1-10, "analysis": "brief explanation", "dialogue": "A short quote stating your financial stance."}}"""
    res = await _call_llm(prompt)
    if not res: res = {"roi_score": 5, "analysis": "Fallback", "dialogue": "Financials look standard."}
    return res

async def _orchestrator_agent(rec: dict, risk: dict, log: dict, fin: dict) -> dict:
    prompt = f"""You are the Orchestrator Agent. Make a final decision based on your sub-agents' analysis:
Recommendation: {json.dumps(rec)}
Risk: {json.dumps(risk)}
Logistics: {json.dumps(log)}
Finance: {json.dumps(fin)}

Rules:
- ALWAYS approve 'critical' urgency items if feasibility is not 'low'.
- Approve if roi_score > 6 and risk_score > 6.
- Otherwise, ignore.

Output JSON: {{"decision": "approve"|"ignore", "thought": "Brief explanation synthesizing the sub-agents' views.", "dialogue": "Your final executive decision."}}"""
    res = await _call_llm(prompt)
    if not res: res = {"decision": "ignore", "thought": "Error", "dialogue": "Decision deferred."}
    return res

async def run_autopilot() -> list[dict]:
    await run_analysis()
    pending = await db.get_recommendations(status="pending")
    if not pending:
        return [{"thought": "No pending recommendations.", "action": "none"}]
        
    results = []
    from .mcp_server import execute_operation
    
    # Throttle to 1 recommendation per tick to avoid exceeding 8000 TPM rate limits
    pending = pending[:1]
    
    for r in pending:
        rec_context = {
            'id': r['id'], 
            'action_type': r['action_type'], 
            'product': r['product_name'], 
            'urgency': r['urgency'],
            'estimated_saving': r.get('estimated_saving', 0),
            'from_city': r.get('from_city'),
            'to_city': r.get('to_city')
        }
        
        risk, log, fin = await asyncio.gather(
            _risk_agent(rec_context),
            _logistics_agent(rec_context),
            _finance_agent(rec_context)
        )
        
        final = await _orchestrator_agent(rec_context, risk, log, fin)
        decision = final.get("decision", "ignore")
        
        debate_log = f"<br><strong>[Risk Agent]:</strong> {risk.get('dialogue')} <br><strong>[Logistics Agent]:</strong> {log.get('dialogue')} <br><strong>[Finance Agent]:</strong> {fin.get('dialogue')} <br><strong>[Orchestrator]:</strong> {final.get('dialogue')}"
        
        rid = r['id']
        
        if final.get("thought") == "Error":
            # API failure (e.g. rate limit). Leave as pending, do not reject!
            results.append({"thought": debate_log + "<br><em>API Rate Limit hit. Deferring.</em>", "action": f"Deferred #{rid}"})
            continue
            
        if decision == "approve":
            res = await execute_operation(rid)
            if res.get("status") == "success":
                results.append({"thought": debate_log, "action": f"Multi-Agent Auto-approved #{rid}"})
            else:
                results.append({"thought": debate_log, "action": f"Failed to approve #{rid}"})
        else:
            await db.resolve_recommendation(rid, "rejected", final.get("thought", ""))
            results.append({"thought": debate_log, "action": f"Multi-Agent Rejected #{rid}"})
            
    return results
