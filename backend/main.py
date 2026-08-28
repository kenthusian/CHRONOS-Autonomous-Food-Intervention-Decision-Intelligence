"""
main.py — FastAPI application entry point.

Routes:
  /api/products          — Product catalogue CRUD
  /api/warehouses        — Warehouse CRUD
  /api/inventory         — Batch inventory CRUD + summary + expiring
  /api/demand            — Demand history + config
  /api/agent/run         — Trigger AI analysis
  /api/recommendations   — List / Accept / Reject recommendations
  /api/operations        — Operations log + status updates
  /api/dashboard/kpis    — Dashboard KPI strip
  /                      — Serves frontend/index.html
  /static                — Serves frontend/ assets
"""

from __future__ import annotations
from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()

from .models import (
    ProductCreate, ProductUpdate,
    WarehouseCreate, WarehouseUpdate,
    BatchCreate, BatchUpdate,
    DemandRecord, DemandConfigSet,
    RecommendationReject,
    OperationStatusUpdate,
)
from . import database as db
from . import agent as ai_agent
from .seed import seed_data

FRONTEND = Path(__file__).parent.parent / "frontend"


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.init_db()
    # Seed only if empty
    existing = await db.get_all_products()
    if not existing:
        await seed_data()
    yield


app = FastAPI(title="Food Freshness & Inventory Optimization", lifespan=lifespan)

# ── static files ──────────────────────────────────────────────────
app.mount("/static", StaticFiles(directory=str(FRONTEND)), name="static")

@app.get("/", include_in_schema=False)
async def serve_index():
    return FileResponse(FRONTEND / "index.html")

from .mcp_server import mcp
app.mount("/mcp", mcp.sse_app)



# ═══════════════════════════════════════════════════════════════════
#  PRODUCTS
# ═══════════════════════════════════════════════════════════════════

@app.get("/api/products")
async def list_products():
    return await db.get_all_products()


@app.get("/api/products/{pid}")
async def get_product(pid: int):
    p = await db.get_product(pid)
    if not p:
        raise HTTPException(404, "Product not found")
    return p


@app.post("/api/products", status_code=201)
async def create_product(body: ProductCreate):
    pid = await db.create_product(body.model_dump())
    return await db.get_product(pid)


@app.put("/api/products/{pid}")
async def update_product(pid: int, body: ProductUpdate):
    if not await db.get_product(pid):
        raise HTTPException(404, "Product not found")
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    await db.update_product(pid, data)
    return await db.get_product(pid)


@app.delete("/api/products/{pid}", status_code=204)
async def delete_product(pid: int):
    if not await db.get_product(pid):
        raise HTTPException(404, "Product not found")
    await db.delete_product(pid)


# ═══════════════════════════════════════════════════════════════════
#  WAREHOUSES
# ═══════════════════════════════════════════════════════════════════

@app.get("/api/warehouses")
async def list_warehouses():
    return await db.get_all_warehouses()


@app.get("/api/warehouses/{wid}")
async def get_warehouse(wid: int):
    w = await db.get_warehouse(wid)
    if not w:
        raise HTTPException(404, "Warehouse not found")
    return w


@app.post("/api/warehouses", status_code=201)
async def create_warehouse(body: WarehouseCreate):
    wid = await db.create_warehouse(body.model_dump())
    return await db.get_warehouse(wid)


@app.put("/api/warehouses/{wid}")
async def update_warehouse(wid: int, body: WarehouseUpdate):
    if not await db.get_warehouse(wid):
        raise HTTPException(404, "Warehouse not found")
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    await db.update_warehouse(wid, data)
    return await db.get_warehouse(wid)


@app.delete("/api/warehouses/{wid}", status_code=204)
async def delete_warehouse(wid: int):
    if not await db.get_warehouse(wid):
        raise HTTPException(404, "Warehouse not found")
    await db.delete_warehouse(wid)


# ═══════════════════════════════════════════════════════════════════
#  INVENTORY BATCHES
# ═══════════════════════════════════════════════════════════════════

@app.get("/api/inventory")
async def list_batches(
    product_id:      int | None = Query(None),
    warehouse_id:    int | None = Query(None),
    include_expired: bool       = Query(False),
):
    return await db.get_all_batches(product_id, warehouse_id, include_expired)


@app.get("/api/inventory/summary")
async def inventory_summary():
    return await db.get_inventory_summary()


@app.get("/api/inventory/expiring")
async def expiring_batches(days: int = Query(3, ge=1, le=60)):
    return await db.get_expiring_batches(days)


@app.get("/api/inventory/{bid}")
async def get_batch(bid: int):
    b = await db.get_batch(bid)
    if not b:
        raise HTTPException(404, "Batch not found")
    return b


@app.post("/api/inventory", status_code=201)
async def create_batch(body: BatchCreate):
    data = body.model_dump()
    if not data.get("received_date"):
        from datetime import date
        data["received_date"] = date.today().isoformat()
    bid = await db.create_batch(data)
    return await db.get_batch(bid)


@app.put("/api/inventory/{bid}")
async def update_batch(bid: int, body: BatchUpdate):
    if not await db.get_batch(bid):
        raise HTTPException(404, "Batch not found")
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    await db.update_batch(bid, data)
    return await db.get_batch(bid)


@app.delete("/api/inventory/{bid}", status_code=204)
async def delete_batch(bid: int):
    if not await db.get_batch(bid):
        raise HTTPException(404, "Batch not found")
    await db.delete_batch(bid)


# ═══════════════════════════════════════════════════════════════════
#  DEMAND
# ═══════════════════════════════════════════════════════════════════

@app.get("/api/demand/history")
async def demand_history(
    product_id:   int | None = Query(None),
    warehouse_id: int | None = Query(None),
    days:         int        = Query(14, ge=1, le=90),
):
    return await db.get_demand_history(product_id, warehouse_id, days)


@app.post("/api/demand/history", status_code=201)
async def add_demand_record(body: DemandRecord):
    await db.upsert_demand_record(
        body.product_id, body.warehouse_id,
        body.date, body.quantity_sold, body.is_manual,
    )
    return {"status": "ok"}


@app.get("/api/demand/config")
async def get_demand_config(product_id: int = Query(...), warehouse_id: int = Query(...)):
    cfg = await db.get_demand_config(product_id, warehouse_id)
    return cfg or {"product_id": product_id, "warehouse_id": warehouse_id, "manual_daily_demand": None}


@app.post("/api/demand/config")
async def set_demand_config(body: DemandConfigSet):
    await db.set_demand_config(body.product_id, body.warehouse_id, body.manual_daily_demand)
    return {"status": "ok"}


# ═══════════════════════════════════════════════════════════════════
#  AGENT
# ═══════════════════════════════════════════════════════════════════

@app.post("/api/agent/run")
async def trigger_agent():
    decisions = await ai_agent.run_analysis()
    return {"status": "success", "recommendations_generated": len(decisions)}

@app.post("/api/agent/autopilot")
async def trigger_autopilot():
    logs = await ai_agent.run_autopilot()
    return {"status": "success", "logs": logs}


# ═══════════════════════════════════════════════════════════════════
#  RECOMMENDATIONS
# ═══════════════════════════════════════════════════════════════════

@app.get("/api/recommendations")
async def list_recommendations(status: str | None = Query(None)):
    return await db.get_recommendations(status)


@app.get("/api/recommendations/{rid}")
async def get_recommendation(rid: int):
    r = await db.get_recommendation(rid)
    if not r:
        raise HTTPException(404, "Recommendation not found")
    return r


@app.put("/api/recommendations/{rid}/accept")
async def accept_recommendation(rid: int):
    rec = await db.get_recommendation(rid)
    if not rec:
        raise HTTPException(404, "Recommendation not found")
    if rec["status"] != "pending":
        raise HTTPException(400, f"Recommendation is already {rec['status']}")

    # Mark as accepted
    await db.resolve_recommendation(rid, "accepted")

    # Create corresponding operation record
    from datetime import date, timedelta
    op_type_map = {
        "redistribute":  "transfer",
        "discount":      "discount_event",
        "reorder":       "purchase_order",
        "priority_ship": "purchase_order",
        "hold":          "hold_note",
    }
    op_type = op_type_map.get(rec["action_type"], "note")

    detail = rec.get("detail") or {}
    lead   = detail.get("eta_days", detail.get("lead_time_days", 3))

    op_data = {
        "recommendation_id": rid,
        "op_type":           op_type,
        "product_id":        rec["product_id"],
        "from_warehouse_id": rec["from_warehouse_id"],
        "to_warehouse_id":   rec["to_warehouse_id"],
        "quantity":          rec["quantity"],
        "status":            "planned",
        "scheduled_date":    (date.today() + timedelta(days=int(lead or 1))).isoformat(),
        "estimated_cost":    rec["estimated_cost"],
        "notes":             detail.get("reason", ""),
    }
    oid = await db.create_operation(op_data)
    op  = await db.get_operation(oid)
    return {"recommendation": await db.get_recommendation(rid), "operation": op}


@app.put("/api/recommendations/{rid}/reject")
async def reject_recommendation(rid: int, body: RecommendationReject):
    rec = await db.get_recommendation(rid)
    if not rec:
        raise HTTPException(404, "Recommendation not found")
    if rec["status"] != "pending":
        raise HTTPException(400, f"Recommendation is already {rec['status']}")
    await db.resolve_recommendation(rid, "rejected", body.reason)
    return await db.get_recommendation(rid)


# ═══════════════════════════════════════════════════════════════════
#  OPERATIONS
# ═══════════════════════════════════════════════════════════════════

@app.get("/api/operations")
async def list_operations(
    op_type: str | None = Query(None),
    status:  str | None = Query(None),
):
    return await db.get_operations(op_type, status)


@app.get("/api/operations/{oid}")
async def get_operation(oid: int):
    op = await db.get_operation(oid)
    if not op:
        raise HTTPException(404, "Operation not found")
    return op


@app.put("/api/operations/{oid}/status")
async def update_operation_status(oid: int, body: OperationStatusUpdate):
    op = await db.get_operation(oid)
    if not op:
        raise HTTPException(404, "Operation not found")

    VALID = {
        "planned":     ["in_transit", "completed", "cancelled"],
        "in_transit":  ["completed", "cancelled"],
        "completed":   [],
        "cancelled":   [],
    }
    allowed = VALID.get(op["status"], [])
    if body.status not in allowed:
        raise HTTPException(400, f"Cannot move from '{op['status']}' to '{body.status}'")

    await db.advance_operation_status(oid, body.status, body.actual_cost)
    return await db.get_operation(oid)


# ═══════════════════════════════════════════════════════════════════
#  DASHBOARD
# ═══════════════════════════════════════════════════════════════════

@app.get("/api/dashboard/kpis")
async def dashboard_kpis():
    return await db.get_dashboard_kpis()


# ── Reset (dev helper) ────────────────────────────────────────────
@app.post("/api/dev/reset", include_in_schema=False)
async def dev_reset():
    await seed_data()
    return {"status": "reset complete"}
