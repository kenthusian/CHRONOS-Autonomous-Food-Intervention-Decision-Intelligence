"""
database.py — Full async SQLite layer for the Food Inventory Optimization App.

Tables:
  products            — food item catalogue
  warehouses          — physical storage locations
  inventory_batches   — individual lots with expiry dates
  demand_history      — daily demand actuals (computed or manual)
  demand_config       — per-(product,warehouse) manual daily-demand override
  agent_recommendations — AI-generated action suggestions
  operations          — accepted actions (transfers, POs, discounts)
"""

from __future__ import annotations
import aiosqlite
import json
from pathlib import Path
from datetime import date, timedelta

DB_PATH = Path(__file__).parent.parent / "inventory.db"


# ═══════════════════════════════════════════════════════════════════
#  SCHEMA
# ═══════════════════════════════════════════════════════════════════

SCHEMA = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS products (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    name                TEXT    NOT NULL,
    category            TEXT    NOT NULL DEFAULT '',
    unit                TEXT    NOT NULL DEFAULT 'kg',
    default_shelf_days  INTEGER NOT NULL DEFAULT 7,
    default_daily_demand REAL   NOT NULL DEFAULT 50,
    reorder_qty         REAL    NOT NULL DEFAULT 200,
    supplier_lead_days  INTEGER NOT NULL DEFAULT 3,
    requires_cold_chain INTEGER NOT NULL DEFAULT 0,
    cost_per_unit       REAL    NOT NULL DEFAULT 0,
    created_at          TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS warehouses (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    name                TEXT    NOT NULL,
    city                TEXT    NOT NULL DEFAULT '',
    region              TEXT    NOT NULL DEFAULT '',
    lat                 REAL    DEFAULT 20.5,
    lng                 REAL    DEFAULT 78.9,
    capacity_units      REAL    NOT NULL DEFAULT 10000,
    has_cold_storage    INTEGER NOT NULL DEFAULT 0,
    transport_time_days REAL    NOT NULL DEFAULT 1.5,
    contact_person      TEXT    DEFAULT '',
    contact_phone       TEXT    DEFAULT '',
    created_at          TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inventory_batches (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id      INTEGER NOT NULL REFERENCES products(id)   ON DELETE CASCADE,
    warehouse_id    INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    batch_no        TEXT    NOT NULL,
    quantity        REAL    NOT NULL DEFAULT 0,
    manufacture_date TEXT,
    expiry_date     TEXT    NOT NULL,
    cost_per_unit   REAL    NOT NULL DEFAULT 0,
    received_date   TEXT    DEFAULT (date('now')),
    notes           TEXT    DEFAULT '',
    created_at      TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS demand_history (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id          INTEGER NOT NULL REFERENCES products(id)   ON DELETE CASCADE,
    warehouse_id        INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    date                TEXT    NOT NULL,
    quantity_sold       REAL    NOT NULL DEFAULT 0,
    is_manual_override  INTEGER NOT NULL DEFAULT 0,
    UNIQUE(product_id, warehouse_id, date)
);

CREATE TABLE IF NOT EXISTS demand_config (
    product_id          INTEGER NOT NULL REFERENCES products(id)   ON DELETE CASCADE,
    warehouse_id        INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    manual_daily_demand REAL,
    updated_at          TEXT DEFAULT (datetime('now')),
    PRIMARY KEY(product_id, warehouse_id)
);

CREATE TABLE IF NOT EXISTS agent_recommendations (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id          INTEGER REFERENCES products(id),
    from_warehouse_id   INTEGER REFERENCES warehouses(id),
    to_warehouse_id     INTEGER REFERENCES warehouses(id),
    action_type         TEXT    NOT NULL,
    urgency             TEXT    NOT NULL DEFAULT 'medium',
    quantity            REAL,
    estimated_saving    REAL    DEFAULT 0,
    estimated_cost      REAL    DEFAULT 0,
    detail_json         TEXT,
    status              TEXT    NOT NULL DEFAULT 'pending',
    rejection_reason    TEXT,
    created_at          TEXT    DEFAULT (datetime('now')),
    resolved_at         TEXT
);

CREATE TABLE IF NOT EXISTS operations (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    recommendation_id   INTEGER REFERENCES agent_recommendations(id),
    op_type             TEXT    NOT NULL,
    product_id          INTEGER REFERENCES products(id),
    from_warehouse_id   INTEGER REFERENCES warehouses(id),
    to_warehouse_id     INTEGER REFERENCES warehouses(id),
    quantity            REAL,
    status              TEXT    NOT NULL DEFAULT 'planned',
    scheduled_date      TEXT,
    completed_date      TEXT,
    estimated_cost      REAL    DEFAULT 0,
    actual_cost         REAL,
    notes               TEXT    DEFAULT '',
    created_at          TEXT    DEFAULT (datetime('now'))
);
"""


async def init_db() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(SCHEMA)
        await db.commit()


# ═══════════════════════════════════════════════════════════════════
#  HELPERS
# ═══════════════════════════════════════════════════════════════════

async def _fetchall(sql: str, params: tuple = ()) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(sql, params) as cur:
            return [dict(r) for r in await cur.fetchall()]


async def _fetchone(sql: str, params: tuple = ()) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(sql, params) as cur:
            row = await cur.fetchone()
            return dict(row) if row else None


async def _execute(sql: str, params: tuple = ()) -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute(sql, params)
        await db.commit()
        return cur.lastrowid


# ═══════════════════════════════════════════════════════════════════
#  PRODUCTS
# ═══════════════════════════════════════════════════════════════════

async def get_all_products() -> list[dict]:
    return await _fetchall("SELECT * FROM products ORDER BY category, name")


async def get_product(pid: int) -> dict | None:
    return await _fetchone("SELECT * FROM products WHERE id = ?", (pid,))


async def create_product(data: dict) -> int:
    return await _execute("""
        INSERT INTO products
            (name, category, unit, default_shelf_days, default_daily_demand,
             reorder_qty, supplier_lead_days, requires_cold_chain, cost_per_unit)
        VALUES (:name,:category,:unit,:default_shelf_days,:default_daily_demand,
                :reorder_qty,:supplier_lead_days,:requires_cold_chain,:cost_per_unit)
    """, data)  # type: ignore[arg-type]


async def update_product(pid: int, data: dict) -> None:
    if not data:
        return
    fields = ", ".join(f"{k} = :{k}" for k in data)
    data["id"] = pid
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(f"UPDATE products SET {fields} WHERE id = :id", data)
        await db.commit()


async def delete_product(pid: int) -> None:
    await _execute("DELETE FROM products WHERE id = ?", (pid,))


# ═══════════════════════════════════════════════════════════════════
#  WAREHOUSES
# ═══════════════════════════════════════════════════════════════════

async def get_all_warehouses() -> list[dict]:
    return await _fetchall("SELECT * FROM warehouses ORDER BY region, city")


async def get_warehouse(wid: int) -> dict | None:
    return await _fetchone("SELECT * FROM warehouses WHERE id = ?", (wid,))


async def create_warehouse(data: dict) -> int:
    return await _execute("""
        INSERT INTO warehouses
            (name, city, region, lat, lng, capacity_units, has_cold_storage,
             transport_time_days, contact_person, contact_phone)
        VALUES (:name,:city,:region,:lat,:lng,:capacity_units,:has_cold_storage,
                :transport_time_days,:contact_person,:contact_phone)
    """, data)  # type: ignore[arg-type]


async def update_warehouse(wid: int, data: dict) -> None:
    if not data:
        return
    fields = ", ".join(f"{k} = :{k}" for k in data)
    data["id"] = wid
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(f"UPDATE warehouses SET {fields} WHERE id = :id", data)
        await db.commit()


async def delete_warehouse(wid: int) -> None:
    await _execute("DELETE FROM warehouses WHERE id = ?", (wid,))


# ═══════════════════════════════════════════════════════════════════
#  INVENTORY BATCHES
# ═══════════════════════════════════════════════════════════════════

async def get_all_batches(product_id: int | None = None,
                           warehouse_id: int | None = None,
                           include_expired: bool = False) -> list[dict]:
    where = ["1=1"]
    params: list = []
    if product_id:
        where.append("b.product_id = ?"); params.append(product_id)
    if warehouse_id:
        where.append("b.warehouse_id = ?"); params.append(warehouse_id)
    if not include_expired:
        where.append("b.expiry_date >= date('now')")
    sql = f"""
        SELECT b.*,
               p.name  AS product_name, p.category, p.unit, p.requires_cold_chain,
               w.name  AS warehouse_name, w.city, w.has_cold_storage,
               CAST(julianday(b.expiry_date) - julianday('now') AS INTEGER) AS days_until_expiry
        FROM inventory_batches b
        JOIN products p ON b.product_id = p.id
        JOIN warehouses w ON b.warehouse_id = w.id
        WHERE {' AND '.join(where)}
        ORDER BY b.expiry_date, p.name
    """
    return await _fetchall(sql, tuple(params))


async def get_batch(bid: int) -> dict | None:
    return await _fetchone("""
        SELECT b.*, p.name AS product_name, p.unit,
               w.name AS warehouse_name
        FROM inventory_batches b
        JOIN products p ON b.product_id = p.id
        JOIN warehouses w ON b.warehouse_id = w.id
        WHERE b.id = ?
    """, (bid,))


async def get_expiring_batches(days: int = 3) -> list[dict]:
    return await _fetchall("""
        SELECT b.*,
               p.name AS product_name, p.category, p.unit,
               w.name AS warehouse_name, w.city,
               CAST(julianday(b.expiry_date) - julianday('now') AS INTEGER) AS days_until_expiry
        FROM inventory_batches b
        JOIN products p ON b.product_id = p.id
        JOIN warehouses w ON b.warehouse_id = w.id
        WHERE b.expiry_date >= date('now')
          AND b.expiry_date <= date('now', ?)
          AND b.quantity > 0
        ORDER BY b.expiry_date, p.name
    """, (f"+{days} days",))


async def get_inventory_summary() -> list[dict]:
    """Aggregate active stock per (product, warehouse) with expiry info."""
    return await _fetchall("""
        SELECT
            p.id   AS product_id,
            p.name AS product_name,
            p.category,
            p.unit,
            p.requires_cold_chain,
            p.cost_per_unit AS product_cost,
            p.default_shelf_days,
            p.default_daily_demand,
            p.supplier_lead_days,
            p.reorder_qty,
            w.id   AS warehouse_id,
            w.name AS warehouse_name,
            w.city,
            w.region,
            w.has_cold_storage,
            w.capacity_units,
            w.transport_time_days,
            COALESCE(SUM(CASE WHEN b.expiry_date >= date('now') AND b.quantity > 0
                              THEN b.quantity ELSE 0 END), 0) AS total_quantity,
            MIN(CASE WHEN b.expiry_date >= date('now') AND b.quantity > 0
                     THEN b.expiry_date END) AS earliest_expiry,
            COUNT(CASE WHEN b.expiry_date >= date('now') AND b.quantity > 0
                       THEN 1 END) AS active_batch_count
        FROM inventory_batches b
        JOIN products  p ON b.product_id  = p.id
        JOIN warehouses w ON b.warehouse_id = w.id
        GROUP BY p.id, w.id
        HAVING total_quantity > 0
        ORDER BY p.name, w.name
    """)


async def create_batch(data: dict) -> int:
    return await _execute("""
        INSERT INTO inventory_batches
            (product_id, warehouse_id, batch_no, quantity,
             manufacture_date, expiry_date, cost_per_unit, received_date, notes)
        VALUES (:product_id,:warehouse_id,:batch_no,:quantity,
                :manufacture_date,:expiry_date,:cost_per_unit,:received_date,:notes)
    """, data)  # type: ignore[arg-type]


async def update_batch(bid: int, data: dict) -> None:
    if not data:
        return
    fields = ", ".join(f"{k} = :{k}" for k in data)
    data["id"] = bid
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(f"UPDATE inventory_batches SET {fields} WHERE id = :id", data)
        await db.commit()


async def delete_batch(bid: int) -> None:
    await _execute("DELETE FROM inventory_batches WHERE id = ?", (bid,))


async def reduce_batch_quantities(product_id: int, warehouse_id: int, qty: float) -> None:
    """Deduct qty from batches at source (FIFO by expiry date)."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT id, quantity FROM inventory_batches
            WHERE product_id = ? AND warehouse_id = ? AND quantity > 0
                  AND expiry_date >= date('now')
            ORDER BY expiry_date
        """, (product_id, warehouse_id)) as cur:
            batches = [dict(r) for r in await cur.fetchall()]

        remaining = qty
        for b in batches:
            if remaining <= 0:
                break
            deduct = min(b["quantity"], remaining)
            await db.execute(
                "UPDATE inventory_batches SET quantity = quantity - ? WHERE id = ?",
                (deduct, b["id"])
            )
            remaining -= deduct
        await db.commit()


# ═══════════════════════════════════════════════════════════════════
#  DEMAND
# ═══════════════════════════════════════════════════════════════════

async def get_demand_history(product_id: int | None = None,
                              warehouse_id: int | None = None,
                              days: int = 14) -> list[dict]:
    where = ["dh.date >= date('now', ?)"]
    params: list = [f"-{days} days"]
    if product_id:
        where.append("dh.product_id = ?"); params.append(product_id)
    if warehouse_id:
        where.append("dh.warehouse_id = ?"); params.append(warehouse_id)
    return await _fetchall(f"""
        SELECT dh.*, p.name AS product_name, w.name AS warehouse_name
        FROM demand_history dh
        JOIN products p ON dh.product_id = p.id
        JOIN warehouses w ON dh.warehouse_id = w.id
        WHERE {' AND '.join(where)}
        ORDER BY dh.date DESC
    """, tuple(params))


async def upsert_demand_record(product_id: int, warehouse_id: int,
                                record_date: str, qty: float,
                                is_manual: bool = False) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            INSERT INTO demand_history (product_id, warehouse_id, date, quantity_sold, is_manual_override)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(product_id, warehouse_id, date)
            DO UPDATE SET quantity_sold = excluded.quantity_sold,
                          is_manual_override = excluded.is_manual_override
        """, (product_id, warehouse_id, record_date, qty, int(is_manual)))
        await db.commit()


async def get_demand_config(product_id: int, warehouse_id: int) -> dict | None:
    return await _fetchone(
        "SELECT * FROM demand_config WHERE product_id = ? AND warehouse_id = ?",
        (product_id, warehouse_id)
    )


async def set_demand_config(product_id: int, warehouse_id: int, value: float | None) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            INSERT INTO demand_config (product_id, warehouse_id, manual_daily_demand, updated_at)
            VALUES (?, ?, ?, datetime('now'))
            ON CONFLICT(product_id, warehouse_id)
            DO UPDATE SET manual_daily_demand = excluded.manual_daily_demand,
                          updated_at = datetime('now')
        """, (product_id, warehouse_id, value))
        await db.commit()


async def get_avg_demand(product_id: int, warehouse_id: int) -> float | None:
    """Returns manual override if set, else 14-day rolling average from history."""
    cfg = await get_demand_config(product_id, warehouse_id)
    if cfg and cfg.get("manual_daily_demand") is not None:
        return cfg["manual_daily_demand"]
    row = await _fetchone("""
        SELECT AVG(quantity_sold) AS avg_demand
        FROM demand_history
        WHERE product_id = ? AND warehouse_id = ? AND date >= date('now', '-14 days')
    """, (product_id, warehouse_id))
    return row["avg_demand"] if row else None


# ═══════════════════════════════════════════════════════════════════
#  RECOMMENDATIONS
# ═══════════════════════════════════════════════════════════════════

async def get_recommendations(status: str | None = None) -> list[dict]:
    where = "1=1"
    params: tuple = ()
    if status:
        where = "r.status = ?"
        params = (status,)
    rows = await _fetchall(f"""
        SELECT r.*,
               p.name  AS product_name, p.unit, p.category,
               fw.name AS from_warehouse_name, fw.city AS from_city,
               tw.name AS to_warehouse_name,   tw.city AS to_city
        FROM agent_recommendations r
        LEFT JOIN products   p  ON r.product_id       = p.id
        LEFT JOIN warehouses fw ON r.from_warehouse_id = fw.id
        LEFT JOIN warehouses tw ON r.to_warehouse_id   = tw.id
        WHERE {where}
        ORDER BY
            CASE r.urgency WHEN 'critical' THEN 1 WHEN 'high' THEN 2
                           WHEN 'medium' THEN 3 ELSE 4 END,
            r.created_at DESC
    """, params)
    for r in rows:
        if r.get("detail_json"):
            try:
                r["detail"] = json.loads(r["detail_json"])
            except Exception:
                r["detail"] = {}
    return rows


async def get_recommendation(rid: int) -> dict | None:
    rows = await get_recommendations()
    return next((r for r in rows if r["id"] == rid), None)


async def create_recommendation(data: dict) -> int:
    detail = data.pop("detail", {})
    data["detail_json"] = json.dumps(detail)
    return await _execute("""
        INSERT INTO agent_recommendations
            (product_id, from_warehouse_id, to_warehouse_id, action_type, urgency,
             quantity, estimated_saving, estimated_cost, detail_json, status)
        VALUES (:product_id,:from_warehouse_id,:to_warehouse_id,:action_type,:urgency,
                :quantity,:estimated_saving,:estimated_cost,:detail_json,:status)
    """, data)  # type: ignore[arg-type]


async def resolve_recommendation(rid: int, status: str, reason: str | None = None) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            UPDATE agent_recommendations
               SET status = ?, rejection_reason = ?, resolved_at = datetime('now')
             WHERE id = ?
        """, (status, reason, rid))
        await db.commit()


async def expire_old_recommendations() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            UPDATE agent_recommendations
               SET status = 'expired'
             WHERE status = 'pending'
        """)
        await db.commit()


# ═══════════════════════════════════════════════════════════════════
#  OPERATIONS
# ═══════════════════════════════════════════════════════════════════

async def get_operations(op_type: str | None = None,
                          status: str | None = None) -> list[dict]:
    where = ["1=1"]
    params: list = []
    if op_type:
        where.append("o.op_type = ?"); params.append(op_type)
    if status:
        where.append("o.status = ?"); params.append(status)
    return await _fetchall(f"""
        SELECT o.*,
               p.name  AS product_name, p.unit, p.category,
               fw.name AS from_warehouse_name, fw.city AS from_city,
               tw.name AS to_warehouse_name,   tw.city AS to_city
        FROM operations o
        LEFT JOIN products   p  ON o.product_id       = p.id
        LEFT JOIN warehouses fw ON o.from_warehouse_id = fw.id
        LEFT JOIN warehouses tw ON o.to_warehouse_id   = tw.id
        WHERE {' AND '.join(where)}
        ORDER BY o.created_at DESC
    """, tuple(params))


async def get_operation(oid: int) -> dict | None:
    rows = await get_operations()
    return next((o for o in rows if o["id"] == oid), None)


async def create_operation(data: dict) -> int:
    return await _execute("""
        INSERT INTO operations
            (recommendation_id, op_type, product_id, from_warehouse_id, to_warehouse_id,
             quantity, status, scheduled_date, estimated_cost, notes)
        VALUES (:recommendation_id,:op_type,:product_id,:from_warehouse_id,:to_warehouse_id,
                :quantity,:status,:scheduled_date,:estimated_cost,:notes)
    """, data)  # type: ignore[arg-type]


async def advance_operation_status(oid: int, new_status: str,
                                    actual_cost: float | None = None) -> None:
    """Update status; on 'completed' transfer, deduct source and create dest batch."""
    op = await get_operation(oid)
    if not op:
        return

    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            UPDATE operations SET status = ?, actual_cost = ?,
                   completed_date = CASE WHEN ? = 'completed' THEN date('now') ELSE completed_date END
            WHERE id = ?
        """, (new_status, actual_cost, new_status, oid))
        await db.commit()

    # When a transfer is completed: deduct from source, add to dest
    if new_status == "completed" and op["op_type"] == "transfer":
        pid  = op["product_id"]
        fwid = op["from_warehouse_id"]
        twid = op["to_warehouse_id"]
        qty  = op["quantity"]

        await reduce_batch_quantities(pid, fwid, qty)

        # Fetch source batch details for expiry reference
        src_batch = await _fetchone("""
            SELECT MIN(expiry_date) AS expiry FROM inventory_batches
            WHERE product_id = ? AND warehouse_id = ? AND quantity > 0
              AND expiry_date >= date('now')
        """, (pid, fwid))
        expiry = src_batch["expiry"] if src_batch and src_batch["expiry"] else \
                 (date.today() + timedelta(days=7)).isoformat()

        product = await get_product(pid)
        cost = product["cost_per_unit"] if product else 0

        # Check for existing identical batch
        existing = await _fetchone("""
            SELECT id FROM inventory_batches
            WHERE product_id = ? AND warehouse_id = ? AND expiry_date = ? AND cost_per_unit = ?
        """, (pid, twid, expiry, cost))

        if existing:
            async with aiosqlite.connect(DB_PATH) as db:
                await db.execute("""
                    UPDATE inventory_batches
                    SET quantity = quantity + ?,
                        notes = COALESCE(notes || ' | ', '') || ?
                    WHERE id = ?
                """, (qty, f"Transferred via Op #{oid}", existing["id"]))
                await db.commit()
        else:
            await create_batch({
                "product_id":       pid,
                "warehouse_id":     twid,
                "batch_no":         f"TRF-{oid:04d}",
                "quantity":         qty,
                "manufacture_date": None,
                "expiry_date":      expiry,
                "cost_per_unit":    cost,
                "received_date":    date.today().isoformat(),
                "notes":            f"Transferred via Operation #{oid}",
            })


# ═══════════════════════════════════════════════════════════════════
#  DASHBOARD KPIs
# ═══════════════════════════════════════════════════════════════════

async def get_dashboard_kpis() -> dict:
    total_batches = (await _fetchone(
        "SELECT COUNT(*) AS n FROM inventory_batches WHERE quantity > 0 AND expiry_date >= date('now')"
    ) or {}).get("n", 0)

    expiring_3 = (await _fetchone(
        "SELECT COUNT(*) AS n FROM inventory_batches WHERE quantity > 0 "
        "AND expiry_date >= date('now') AND expiry_date <= date('now', '+3 days')"
    ) or {}).get("n", 0)

    pending_recs = (await _fetchone(
        "SELECT COUNT(*) AS n FROM agent_recommendations WHERE status = 'pending'"
    ) or {}).get("n", 0)

    savings = (await _fetchone(
        "SELECT COALESCE(SUM(estimated_saving), 0) AS s FROM agent_recommendations WHERE status = 'accepted'"
    ) or {}).get("s", 0)

    active_ops = (await _fetchone(
        "SELECT COUNT(*) AS n FROM operations WHERE status IN ('planned','in_transit')"
    ) or {}).get("n", 0)

    return {
        "total_active_batches": total_batches,
        "expiring_within_3_days": expiring_3,
        "pending_recommendations": pending_recs,
        "estimated_savings_unlocked": round(savings, 2),
        "active_operations": active_ops,
    }
