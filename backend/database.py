"""
database.py — Full async Supabase layer for the Food Inventory Optimization App.
"""

from __future__ import annotations
import os
import json
from datetime import date, timedelta

from supabase._async.client import create_client as create_async_client, AsyncClient

_supabase: AsyncClient | None = None

async def get_supabase() -> AsyncClient:
    global _supabase
    if _supabase is None:
        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_KEY", "")
        _supabase = await create_async_client(url, key)
    return _supabase

# ═══════════════════════════════════════════════════════════════════
#  PRODUCTS
# ═══════════════════════════════════════════════════════════════════

async def get_all_products() -> list[dict]:
    client = await get_supabase()
    res = await client.table("products").select("*").order("category").order("name").execute()
    return res.data

async def get_product(pid: int) -> dict | None:
    client = await get_supabase()
    res = await client.table("products").select("*").eq("id", pid).execute()
    return res.data[0] if res.data else None

async def create_product(data: dict) -> int:
    client = await get_supabase()
    if "requires_cold_chain" in data:
        data["requires_cold_chain"] = bool(data["requires_cold_chain"])
    res = await client.table("products").insert(data).execute()
    return res.data[0]["id"] if res.data else -1

async def update_product(pid: int, data: dict) -> None:
    if not data:
        return
    client = await get_supabase()
    await client.table("products").update(data).eq("id", pid).execute()

async def delete_product(pid: int) -> None:
    client = await get_supabase()
    await client.table("products").delete().eq("id", pid).execute()

# ═══════════════════════════════════════════════════════════════════
#  WAREHOUSES
# ═══════════════════════════════════════════════════════════════════

async def get_all_warehouses() -> list[dict]:
    client = await get_supabase()
    res = await client.table("warehouses").select("*").order("region").order("city").execute()
    return res.data

async def get_warehouse(wid: int) -> dict | None:
    client = await get_supabase()
    res = await client.table("warehouses").select("*").eq("id", wid).execute()
    return res.data[0] if res.data else None

async def create_warehouse(data: dict) -> int:
    client = await get_supabase()
    # Fix types for Postgres
    if "transport_time_days" in data:
        data["transport_time_days"] = int(data["transport_time_days"])
    if "has_cold_storage" in data:
        data["has_cold_storage"] = bool(data["has_cold_storage"])
        
    res = await client.table("warehouses").insert(data).execute()
    return res.data[0]["id"] if res.data else -1

async def update_warehouse(wid: int, data: dict) -> None:
    if not data:
        return
    client = await get_supabase()
    await client.table("warehouses").update(data).eq("id", wid).execute()

async def delete_warehouse(wid: int) -> None:
    client = await get_supabase()
    await client.table("warehouses").delete().eq("id", wid).execute()

# ═══════════════════════════════════════════════════════════════════
#  INVENTORY BATCHES
# ═══════════════════════════════════════════════════════════════════

async def get_all_batches(product_id: int | None = None,
                           warehouse_id: int | None = None,
                           include_expired: bool = False) -> list[dict]:
    client = await get_supabase()
    query = client.table("inventory_batches").select("*, products(name, category, unit, requires_cold_chain), warehouses(name, city, has_cold_storage)")
    if product_id:
        query = query.eq("product_id", product_id)
    if warehouse_id:
        query = query.eq("warehouse_id", warehouse_id)
    if not include_expired:
        query = query.gte("expiry_date", date.today().isoformat())
    
    res = await query.execute()
    
    batches = []
    for b in res.data:
        p = b.get("products", {}) or {}
        w = b.get("warehouses", {}) or {}
        
        days_until = (date.fromisoformat(b["expiry_date"][:10]) - date.today()).days
        
        flat = {
            **b,
            "product_name": p.get("name"),
            "category": p.get("category"),
            "unit": p.get("unit"),
            "requires_cold_chain": p.get("requires_cold_chain"),
            "warehouse_name": w.get("name"),
            "city": w.get("city"),
            "has_cold_storage": w.get("has_cold_storage"),
            "days_until_expiry": days_until,
        }
        flat.pop("products", None)
        flat.pop("warehouses", None)
        batches.append(flat)
        
    return sorted(batches, key=lambda x: (x["expiry_date"], x["product_name"] or ""))


async def get_batch(bid: int) -> dict | None:
    client = await get_supabase()
    res = await client.table("inventory_batches").select("*, products(name, unit), warehouses(name)").eq("id", bid).execute()
    if not res.data:
        return None
    b = res.data[0]
    p = b.get("products", {}) or {}
    w = b.get("warehouses", {}) or {}
    flat = {
        **b,
        "product_name": p.get("name"),
        "unit": p.get("unit"),
        "warehouse_name": w.get("name"),
    }
    flat.pop("products", None)
    flat.pop("warehouses", None)
    return flat


async def get_expiring_batches(days: int = 3) -> list[dict]:
    client = await get_supabase()
    target_date = (date.today() + timedelta(days=days)).isoformat()
    today_date = date.today().isoformat()
    res = await client.table("inventory_batches").select("*, products(name, category, unit), warehouses(name, city)").gte("expiry_date", today_date).lte("expiry_date", target_date).gt("quantity", 0).order("expiry_date").execute()
    
    batches = []
    for b in res.data:
        p = b.get("products", {}) or {}
        w = b.get("warehouses", {}) or {}
        days_until = (date.fromisoformat(b["expiry_date"][:10]) - date.today()).days
        flat = {
            **b,
            "product_name": p.get("name"),
            "category": p.get("category"),
            "unit": p.get("unit"),
            "warehouse_name": w.get("name"),
            "city": w.get("city"),
            "days_until_expiry": days_until,
        }
        flat.pop("products", None)
        flat.pop("warehouses", None)
        batches.append(flat)
    return sorted(batches, key=lambda x: (x["expiry_date"], x["product_name"] or ""))


async def get_inventory_summary() -> list[dict]:
    client = await get_supabase()
    today_date = date.today().isoformat()
    res = await client.table("inventory_batches").select("*, products(*), warehouses(*)").gte("expiry_date", today_date).gt("quantity", 0).execute()
    
    summary = {}
    for b in res.data:
        p = b.get("products", {}) or {}
        w = b.get("warehouses", {}) or {}
        key = (b["product_id"], b["warehouse_id"])
        if key not in summary:
            summary[key] = {
                "product_id": p.get("id"),
                "product_name": p.get("name"),
                "category": p.get("category"),
                "unit": p.get("unit"),
                "requires_cold_chain": p.get("requires_cold_chain"),
                "product_cost": p.get("cost_per_unit"),
                "default_shelf_days": p.get("default_shelf_days"),
                "default_daily_demand": p.get("default_daily_demand"),
                "supplier_lead_days": p.get("supplier_lead_days"),
                "reorder_qty": p.get("reorder_qty"),
                "warehouse_id": w.get("id"),
                "warehouse_name": w.get("name"),
                "city": w.get("city"),
                "region": w.get("region"),
                "has_cold_storage": w.get("has_cold_storage"),
                "capacity_units": w.get("capacity_units"),
                "transport_time_days": w.get("transport_time_days"),
                "total_quantity": 0.0,
                "earliest_expiry": None,
                "active_batch_count": 0
            }
        
        s = summary[key]
        s["total_quantity"] += b["quantity"]
        s["active_batch_count"] += 1
        
        exp = b["expiry_date"]
        if not s["earliest_expiry"] or exp < s["earliest_expiry"]:
            s["earliest_expiry"] = exp

    res_list = list(summary.values())
    res_list.sort(key=lambda x: (x["product_name"] or "", x["warehouse_name"] or ""))
    return res_list


async def create_batch(data: dict) -> int:
    client = await get_supabase()
    res = await client.table("inventory_batches").insert(data).execute()
    return res.data[0]["id"]


async def update_batch(bid: int, data: dict) -> None:
    if not data:
        return
    client = await get_supabase()
    await client.table("inventory_batches").update(data).eq("id", bid).execute()


async def delete_batch(bid: int) -> None:
    client = await get_supabase()
    await client.table("inventory_batches").delete().eq("id", bid).execute()


async def reduce_batch_quantities(product_id: int, warehouse_id: int, qty: float) -> None:
    client = await get_supabase()
    today = date.today().isoformat()
    res = await client.table("inventory_batches").select("id, quantity").eq("product_id", product_id).eq("warehouse_id", warehouse_id).gt("quantity", 0).gte("expiry_date", today).order("expiry_date").execute()
    
    remaining = qty
    for b in res.data:
        if remaining <= 0:
            break
        deduct = min(b["quantity"], remaining)
        await client.table("inventory_batches").update({"quantity": b["quantity"] - deduct}).eq("id", b["id"]).execute()
        remaining -= deduct


# ═══════════════════════════════════════════════════════════════════
#  DEMAND
# ═══════════════════════════════════════════════════════════════════

async def get_demand_history(product_id: int | None = None,
                              warehouse_id: int | None = None,
                              days: int = 14) -> list[dict]:
    client = await get_supabase()
    date_limit = (date.today() - timedelta(days=days)).isoformat()
    query = client.table("demand_history").select("*, products(name), warehouses(name)").gte("date", date_limit)
    if product_id:
        query = query.eq("product_id", product_id)
    if warehouse_id:
        query = query.eq("warehouse_id", warehouse_id)
    
    res = await query.order("date", desc=True).execute()
    
    history = []
    for dh in res.data:
        p = dh.get("products", {}) or {}
        w = dh.get("warehouses", {}) or {}
        flat = {
            **dh,
            "product_name": p.get("name"),
            "warehouse_name": w.get("name"),
        }
        flat.pop("products", None)
        flat.pop("warehouses", None)
        history.append(flat)
    return history


async def upsert_demand_record(product_id: int, warehouse_id: int,
                                record_date: str, qty: float,
                                is_manual: bool = False) -> None:
    client = await get_supabase()
    data = {
        "product_id": product_id,
        "warehouse_id": warehouse_id,
        "date": record_date,
        "quantity_sold": qty,
        "is_manual_override": int(is_manual)
    }
    await client.table("demand_history").upsert(data).execute()


async def get_demand_config(product_id: int, warehouse_id: int) -> dict | None:
    client = await get_supabase()
    res = await client.table("demand_config").select("*").eq("product_id", product_id).eq("warehouse_id", warehouse_id).execute()
    return res.data[0] if res.data else None


async def set_demand_config(product_id: int, warehouse_id: int, value: float | None) -> None:
    from datetime import datetime
    client = await get_supabase()
    data = {
        "product_id": product_id,
        "warehouse_id": warehouse_id,
        "manual_daily_demand": value,
        "updated_at": datetime.now().isoformat()
    }
    await client.table("demand_config").upsert(data).execute()


async def get_avg_demand(product_id: int, warehouse_id: int) -> float | None:
    cfg = await get_demand_config(product_id, warehouse_id)
    if cfg and cfg.get("manual_daily_demand") is not None:
        return cfg["manual_daily_demand"]
        
    client = await get_supabase()
    date_limit = (date.today() - timedelta(days=60)).isoformat() # Use 60 days of history for ML
    res = await client.table("demand_history").select("date, quantity_sold").eq("product_id", product_id).eq("warehouse_id", warehouse_id).gte("date", date_limit).execute()
    
    if not res.data:
        return None
        
    try:
        from .ml_forecaster import train_and_predict_demand
        # Predict demand for tomorrow
        target_date = (date.today() + timedelta(days=1)).isoformat()
        ml_prediction = train_and_predict_demand(res.data, target_date)
        return ml_prediction
    except Exception as e:
        print(f"ML Forecast Failed: {e}. Falling back to SMA.")
        total = sum(r["quantity_sold"] for r in res.data)
        return total / len(res.data)


# ═══════════════════════════════════════════════════════════════════
#  RECOMMENDATIONS
# ═══════════════════════════════════════════════════════════════════

async def get_recommendations(status: str | None = None) -> list[dict]:
    client = await get_supabase()
    query = client.table("agent_recommendations").select("*, products(name, unit, category), from_warehouse:from_warehouse_id(name, city), to_warehouse:to_warehouse_id(name, city)")
    if status:
        query = query.eq("status", status)
        
    res = await query.execute()
    
    recs = []
    urgency_map = {"critical": 1, "high": 2, "medium": 3}
    for r in res.data:
        p = r.get("products", {}) or {}
        fw = r.get("from_warehouse", {}) or {}
        tw = r.get("to_warehouse", {}) or {}
        
        flat = {
            **r,
            "product_name": p.get("name"),
            "unit": p.get("unit"),
            "category": p.get("category"),
            "from_warehouse_name": fw.get("name"),
            "from_city": fw.get("city"),
            "to_warehouse_name": tw.get("name"),
            "to_city": tw.get("city"),
        }
        flat.pop("products", None)
        flat.pop("from_warehouse", None)
        flat.pop("to_warehouse", None)
        
        if flat.get("detail_json"):
            try:
                flat["detail"] = json.loads(flat["detail_json"])
            except Exception:
                flat["detail"] = {}
        else:
            flat["detail"] = {}
            
        recs.append(flat)
        
    recs.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    recs.sort(key=lambda x: urgency_map.get(x.get("urgency", ""), 4))
    
    return recs


async def get_recommendation(rid: int) -> dict | None:
    rows = await get_recommendations()
    return next((r for r in rows if r["id"] == rid), None)


async def create_recommendation(data: dict) -> int:
    client = await get_supabase()
    detail = data.pop("detail", {})
    data["detail_json"] = json.dumps(detail)
    res = await client.table("agent_recommendations").insert(data).execute()
    return res.data[0]["id"]


async def resolve_recommendation(rid: int, status: str, reason: str | None = None) -> None:
    from datetime import datetime
    client = await get_supabase()
    await client.table("agent_recommendations").update({
        "status": status,
        "rejection_reason": reason,
        "resolved_at": datetime.now().isoformat()
    }).eq("id", rid).execute()


async def expire_old_recommendations() -> None:
    client = await get_supabase()
    await client.table("agent_recommendations").update({"status": "expired"}).eq("status", "pending").execute()


# ═══════════════════════════════════════════════════════════════════
#  OPERATIONS
# ═══════════════════════════════════════════════════════════════════

async def get_operations(op_type: str | None = None,
                          status: str | None = None) -> list[dict]:
    client = await get_supabase()
    query = client.table("operations").select("*, products(name, unit, category), from_warehouse:from_warehouse_id(name, city), to_warehouse:to_warehouse_id(name, city)")
    if op_type:
        query = query.eq("op_type", op_type)
    if status:
        query = query.eq("status", status)
    
    res = await query.order("created_at", desc=True).execute()
    
    ops = []
    for o in res.data:
        p = o.get("products", {}) or {}
        fw = o.get("from_warehouse", {}) or {}
        tw = o.get("to_warehouse", {}) or {}
        
        flat = {
            **o,
            "product_name": p.get("name"),
            "unit": p.get("unit"),
            "category": p.get("category"),
            "from_warehouse_name": fw.get("name"),
            "from_city": fw.get("city"),
            "to_warehouse_name": tw.get("name"),
            "to_city": tw.get("city"),
        }
        flat.pop("products", None)
        flat.pop("from_warehouse", None)
        flat.pop("to_warehouse", None)
        ops.append(flat)
        
    return ops


async def get_operation(oid: int) -> dict | None:
    rows = await get_operations()
    return next((o for o in rows if o["id"] == oid), None)


async def create_operation(data: dict) -> int:
    client = await get_supabase()
    res = await client.table("operations").insert(data).execute()
    return res.data[0]["id"]


async def advance_operation_status(oid: int, new_status: str,
                                    actual_cost: float | None = None) -> None:
    op = await get_operation(oid)
    if not op:
        return
        
    client = await get_supabase()
    update_data = {"status": new_status}
    if actual_cost is not None:
        update_data["actual_cost"] = actual_cost
    if new_status == 'completed':
        update_data["completed_date"] = date.today().isoformat()
        
    await client.table("operations").update(update_data).eq("id", oid).execute()

    if new_status == "completed" and op["op_type"] == "transfer":
        pid = op["product_id"]
        fwid = op["from_warehouse_id"]
        twid = op["to_warehouse_id"]
        qty = op["quantity"]

        await reduce_batch_quantities(pid, fwid, qty)

        today = date.today().isoformat()
        res = await client.table("inventory_batches").select("expiry_date").eq("product_id", pid).eq("warehouse_id", fwid).gt("quantity", 0).gte("expiry_date", today).order("expiry_date").execute()
        
        expiry = res.data[0]["expiry_date"] if res.data else (date.today() + timedelta(days=7)).isoformat()
        
        product = await get_product(pid)
        cost = product["cost_per_unit"] if product else 0

        existing_res = await client.table("inventory_batches").select("id, quantity, notes").eq("product_id", pid).eq("warehouse_id", twid).eq("expiry_date", expiry).eq("cost_per_unit", cost).execute()

        if existing_res.data:
            existing = existing_res.data[0]
            old_notes = existing.get("notes") or ""
            new_notes = f"{old_notes} | Transferred via Op #{oid}" if old_notes else f"Transferred via Op #{oid}"
            await client.table("inventory_batches").update({
                "quantity": existing["quantity"] + qty,
                "notes": new_notes
            }).eq("id", existing["id"]).execute()
        else:
            await create_batch({
                "product_id": pid,
                "warehouse_id": twid,
                "batch_no": f"TRF-{oid:04d}",
                "quantity": qty,
                "manufacture_date": None,
                "expiry_date": expiry,
                "cost_per_unit": cost,
                "received_date": today,
                "notes": f"Transferred via Operation #{oid}",
            })


# ═══════════════════════════════════════════════════════════════════
#  DASHBOARD KPIs
# ═══════════════════════════════════════════════════════════════════

async def get_dashboard_kpis() -> dict:
    client = await get_supabase()
    today = date.today().isoformat()
    
    batches_res = await client.table("inventory_batches").select("id, expiry_date").gt("quantity", 0).gte("expiry_date", today).execute()
    total_batches = len(batches_res.data)
    
    in_3_days = (date.today() + timedelta(days=3)).isoformat()
    expiring_3 = sum(1 for b in batches_res.data if b["expiry_date"] <= in_3_days)
    
    recs_res = await client.table("agent_recommendations").select("status, estimated_saving").execute()
    pending_recs = sum(1 for r in recs_res.data if r.get("status") == "pending")
    savings = sum(r.get("estimated_saving") or 0 for r in recs_res.data if r.get("status") == "accepted")
    
    ops_res = await client.table("operations").select("status").in_("status", ["planned", "in_transit"]).execute()
    active_ops = len(ops_res.data)
    
    return {
        "total_active_batches": total_batches,
        "expiring_within_3_days": expiring_3,
        "pending_recommendations": pending_recs,
        "estimated_savings_unlocked": round(savings, 2),
        "active_operations": active_ops,
    }
