"""
seed.py — Rich mock data: 10 real food products × 5 Indian warehouses.

All expiry dates are computed relative to today so the scenarios remain
relevant whenever the app is first launched.

Designed scenarios (triggered automatically on first "Run Analysis"):
  REDISTRIBUTE  : Chicken Breast (Bangalore → Delhi)
  REDISTRIBUTE  : Fresh Tomatoes (Mumbai → Hyderabad)
  REDISTRIBUTE  : Whole Milk     (Mumbai → Delhi)
  REDISTRIBUTE  : Fresh Paneer   (Mumbai → Bangalore)
  DISCOUNT      : Baby Spinach   (Mumbai — 2d shelf, transit infeasible)
  DISCOUNT      : White Bread    (Chennai — 3d shelf, transit infeasible)
  PRIORITY SHIP : Alphonso Mangoes (Hyderabad — no surplus source)
  REORDER       : Fresh Paneer   (Delhi — no source after Mumbai assigned)
  REORDER       : Basmati Rice   (Hyderabad — low coverage)
  HOLD          : Greek Yogurt, OJ, Basmati Rice, Milk @ Bangalore
"""

from __future__ import annotations
import random
from datetime import date, timedelta

from . import database as db


def _d(days: int) -> str:
    return (date.today() + timedelta(days=days)).isoformat()


def _dp(days: int) -> str:
    return (date.today() - timedelta(days=days)).isoformat()


# ─── Products ──────────────────────────────────────────────────────

PRODUCTS = [
    {   # 1
        "name": "Fresh Tomatoes",
        "category": "Vegetables",
        "unit": "kg",
        "default_shelf_days": 7,
        "default_daily_demand": 65.0,
        "reorder_qty": 400.0,
        "supplier_lead_days": 2,
        "requires_cold_chain": 0,
        "cost_per_unit": 28.0,
    },
    {   # 2
        "name": "Baby Spinach",
        "category": "Vegetables",
        "unit": "kg",
        "default_shelf_days": 5,
        "default_daily_demand": 45.0,
        "reorder_qty": 250.0,
        "supplier_lead_days": 1,
        "requires_cold_chain": 0,
        "cost_per_unit": 85.0,
    },
    {   # 3
        "name": "Chicken Breast (Fresh)",
        "category": "Meat & Poultry",
        "unit": "kg",
        "default_shelf_days": 4,
        "default_daily_demand": 85.0,
        "reorder_qty": 300.0,
        "supplier_lead_days": 2,
        "requires_cold_chain": 1,
        "cost_per_unit": 320.0,
    },
    {   # 4
        "name": "Whole Milk 2L",
        "category": "Dairy",
        "unit": "litres",
        "default_shelf_days": 10,
        "default_daily_demand": 110.0,
        "reorder_qty": 500.0,
        "supplier_lead_days": 2,
        "requires_cold_chain": 1,
        "cost_per_unit": 58.0,
    },
    {   # 5
        "name": "Greek Yogurt 400g",
        "category": "Dairy",
        "unit": "units",
        "default_shelf_days": 21,
        "default_daily_demand": 65.0,
        "reorder_qty": 300.0,
        "supplier_lead_days": 3,
        "requires_cold_chain": 1,
        "cost_per_unit": 75.0,
    },
    {   # 6
        "name": "Alphonso Mangoes",
        "category": "Fruits",
        "unit": "kg",
        "default_shelf_days": 8,
        "default_daily_demand": 80.0,
        "reorder_qty": 200.0,
        "supplier_lead_days": 2,
        "requires_cold_chain": 0,
        "cost_per_unit": 180.0,
    },
    {   # 7
        "name": "White Bread Loaf",
        "category": "Bakery",
        "unit": "units",
        "default_shelf_days": 6,
        "default_daily_demand": 70.0,
        "reorder_qty": 200.0,
        "supplier_lead_days": 1,
        "requires_cold_chain": 0,
        "cost_per_unit": 45.0,
    },
    {   # 8
        "name": "Basmati Rice 5kg",
        "category": "Grains & Staples",
        "unit": "units",
        "default_shelf_days": 365,
        "default_daily_demand": 30.0,
        "reorder_qty": 500.0,
        "supplier_lead_days": 5,
        "requires_cold_chain": 0,
        "cost_per_unit": 385.0,
    },
    {   # 9
        "name": "Orange Juice 1L",
        "category": "Beverages",
        "unit": "litres",
        "default_shelf_days": 14,
        "default_daily_demand": 50.0,
        "reorder_qty": 300.0,
        "supplier_lead_days": 3,
        "requires_cold_chain": 1,
        "cost_per_unit": 95.0,
    },
    {   # 10
        "name": "Fresh Paneer 200g",
        "category": "Dairy",
        "unit": "units",
        "default_shelf_days": 5,
        "default_daily_demand": 85.0,
        "reorder_qty": 250.0,
        "supplier_lead_days": 3,
        "requires_cold_chain": 1,
        "cost_per_unit": 65.0,
    },
]


# ─── Warehouses ────────────────────────────────────────────────────

WAREHOUSES = [
    {   # 1 — Mumbai
        "name": "Mumbai Distribution Centre",
        "city": "Mumbai", "region": "West India",
        "lat": 19.08, "lng": 72.88,
        "capacity_units": 15000, "has_cold_storage": 1,
        "transport_time_days": 1.0,
        "contact_person": "Rajesh Patil", "contact_phone": "+91-98200-11234",
    },
    {   # 2 — Delhi
        "name": "Delhi Central Hub",
        "city": "Delhi", "region": "North India",
        "lat": 28.61, "lng": 77.21,
        "capacity_units": 20000, "has_cold_storage": 1,
        "transport_time_days": 2.0,
        "contact_person": "Priya Sharma", "contact_phone": "+91-99100-22345",
    },
    {   # 3 — Bangalore
        "name": "Bangalore Cold Chain Facility",
        "city": "Bangalore", "region": "South India",
        "lat": 12.97, "lng": 77.59,
        "capacity_units": 12000, "has_cold_storage": 1,
        "transport_time_days": 2.0,
        "contact_person": "Kiran Rao", "contact_phone": "+91-97400-33456",
    },
    {   # 4 — Chennai
        "name": "Chennai Port Warehouse",
        "city": "Chennai", "region": "South India",
        "lat": 13.09, "lng": 80.28,
        "capacity_units": 8000, "has_cold_storage": 0,
        "transport_time_days": 2.5,
        "contact_person": "Deepa Nair", "contact_phone": "+91-94440-44567",
    },
    {   # 5 — Hyderabad
        "name": "Hyderabad Regional Depot",
        "city": "Hyderabad", "region": "Central India",
        "lat": 17.39, "lng": 78.49,
        "capacity_units": 10000, "has_cold_storage": 0,
        "transport_time_days": 1.5,
        "contact_person": "Anand Kumar", "contact_phone": "+91-96660-55678",
    },
]


# ─── Inventory Batches ─────────────────────────────────────────────
# Each tuple: (product_idx 1-based, warehouse_idx 1-based, batch_no, qty, mfg_days_ago, exp_days_from_now, cost)

def _batches():
    return [
        # ── Fresh Tomatoes ────────────────────────────────────────────
        # Mumbai: heavy surplus, expires in 5d → REDISTRIBUTE to Hyderabad
        (1, 1, "BCH-MUM-TOM-001", 840.0,  _dp(5), _d(5),  26.0),
        # Hyderabad: critically low → receives redistribution
        (1, 5, "BCH-HYD-TOM-001",  50.0,  _dp(2), _d(7),  28.0),

        # ── Baby Spinach ───────────────────────────────────────────────
        # Mumbai: 680 kg, only 2d shelf → DISCOUNT (transit ≥ 2.5d, infeasible)
        (2, 1, "BCH-MUM-SPN-001", 680.0,  _dp(3), _d(2),  82.0),
        # Bangalore: stable
        (2, 3, "BCH-BLR-SPN-001", 220.0,  _dp(2), _d(5),  85.0),

        # ── Chicken Breast (Fresh) ─────────────────────────────────────
        # Bangalore: 520 kg surplus, 5d shelf → REDISTRIBUTE to Delhi
        (3, 3, "BCH-BLR-CHK-001", 520.0,  _dp(3), _d(5), 315.0),
        # Delhi: critically low (8 kg) → receives redistribution
        (3, 2, "BCH-DEL-CHK-001",   8.0,  _dp(1), _d(7), 320.0),

        # ── Whole Milk 2L ──────────────────────────────────────────────
        # Mumbai: 2 200 L surplus, 8d shelf → REDISTRIBUTE to Delhi
        (4, 1, "BCH-MUM-MLK-001", 2200.0, _dp(8), _d(8),  56.0),
        # Delhi: critically low (18 L) → receives redistribution
        (4, 2, "BCH-DEL-MLK-001",   18.0, _dp(1), _d(9),  58.0),
        # Bangalore: healthy stock
        (4, 3, "BCH-BLR-MLK-001",  450.0, _dp(3), _d(10), 58.0),

        # ── Greek Yogurt 400g ──────────────────────────────────────────
        (5, 3, "BCH-BLR-YOG-001",  720.0, _dp(7),  _d(21), 72.0),
        (5, 2, "BCH-DEL-YOG-001",  280.0, _dp(5),  _d(14), 75.0),

        # ── Alphonso Mangoes ───────────────────────────────────────────
        # Hyderabad: only 20 kg, no surplus source → PRIORITY SHIP
        (6, 5, "BCH-HYD-MGO-001",   20.0, _dp(1), _d(8),  175.0),
        # Mumbai: 150 kg but demand 90/day → only 1.7d coverage, no surplus
        (6, 1, "BCH-MUM-MGO-001",  150.0, _dp(2), _d(6),  180.0),

        # ── White Bread Loaf ───────────────────────────────────────────
        # Chennai: 280 units, 3d shelf, demand 30/day → DISCOUNT (transit too long)
        (7, 4, "BCH-CHN-WBL-001",  280.0, _dp(3), _d(3),  43.0),
        # Bangalore: stable
        (7, 3, "BCH-BLR-WBL-001",  380.0, _dp(2), _d(5),  45.0),
        # Delhi: moderate stock
        (7, 2, "BCH-DEL-WBL-001",  210.0, _dp(1), _d(6),  45.0),

        # ── Basmati Rice 5kg ───────────────────────────────────────────
        (8, 1, "BCH-MUM-RIC-001", 2400.0, _dp(30), _d(335), 380.0),
        # Hyderabad: 65 units, demand 30/day → 2.2d → REORDER (lead 5d, threshold 6.5d)
        (8, 5, "BCH-HYD-RIC-001",   65.0, _dp(20), _d(345), 385.0),

        # ── Orange Juice 1L ────────────────────────────────────────────
        (9, 1, "BCH-MUM-OJC-001",  380.0, _dp(2), _d(12), 92.0),
        (9, 3, "BCH-BLR-OJC-001",  240.0, _dp(3), _d(11), 95.0),

        # ── Fresh Paneer 200g ──────────────────────────────────────────
        # Mumbai: 650 units surplus → REDISTRIBUTE to Bangalore
        (10, 1, "BCH-MUM-PNR-001", 650.0, _dp(2), _d(5),  62.0),
        # Bangalore: 80 units (0.94d) → receives redistribution from Mumbai
        (10, 3, "BCH-BLR-PNR-001",  80.0, _dp(1), _d(5),  65.0),
        # Delhi: 145 units (1.7d), no remaining source → REORDER
        (10, 2, "BCH-DEL-PNR-001", 145.0, _dp(2), _d(7),  65.0),
    ]


# ─── Demand History ────────────────────────────────────────────────
# Map: (product_id, warehouse_id) → avg daily demand
# We generate 14 days of history with ±15% random variation.

DEMAND_RATES = {
    (1, 1): 62, (1, 5): 80,                             # Tomatoes
    (2, 1): 45, (2, 3): 40,                             # Spinach
    (3, 3): 80, (3, 2): 90,                             # Chicken
    (4, 1):110, (4, 2):110, (4, 3): 95,                 # Milk
    (5, 3): 65, (5, 2): 60,                             # Yogurt
    (6, 5): 75, (6, 1): 90,                             # Mangoes
    (7, 4): 30, (7, 3): 70, (7, 2): 70,                 # Bread
    (8, 1): 30, (8, 5): 30,                             # Rice
    (9, 1): 50, (9, 3): 45,                             # OJ
    (10,1): 85, (10,3): 85, (10,2): 85,                 # Paneer
}


async def seed_data() -> None:
    """Wipe all tables and load fresh scenario data."""
    import aiosqlite
    from pathlib import Path
    DB_PATH = Path(__file__).parent.parent / "inventory.db"

    async with aiosqlite.connect(DB_PATH) as database:
        await database.executescript("""
            PRAGMA foreign_keys = OFF;
            DELETE FROM operations;
            DELETE FROM agent_recommendations;
            DELETE FROM demand_config;
            DELETE FROM demand_history;
            DELETE FROM inventory_batches;
            DELETE FROM warehouses;
            DELETE FROM products;
            DELETE FROM sqlite_sequence;
            PRAGMA foreign_keys = ON;
        """)
        await database.commit()

    # Products
    product_ids = {}
    for idx, p in enumerate(PRODUCTS, start=1):
        pid = await db.create_product(p)
        product_ids[idx] = pid

    # Warehouses
    warehouse_ids = {}
    for idx, w in enumerate(WAREHOUSES, start=1):
        wid = await db.create_warehouse(w)
        warehouse_ids[idx] = wid

    # Inventory batches
    for (p_idx, w_idx, batch_no, qty, mfg, exp, cost) in _batches():
        await db.create_batch({
            "product_id":       product_ids[p_idx],
            "warehouse_id":     warehouse_ids[w_idx],
            "batch_no":         batch_no,
            "quantity":         qty,
            "manufacture_date": mfg,
            "expiry_date":      exp,
            "cost_per_unit":    cost,
            "received_date":    _dp(0),
            "notes":            "",
        })

    # Demand history — 14 days with ±15% variation
    rng = random.Random(42)   # fixed seed for reproducibility
    for (p_idx, w_idx), avg in DEMAND_RATES.items():
        pid = product_ids[p_idx]
        wid = warehouse_ids[w_idx]
        for days_ago in range(1, 15):
            variation = rng.uniform(0.85, 1.15)
            qty       = round(avg * variation, 1)
            rec_date  = _dp(days_ago)
            await db.upsert_demand_record(pid, wid, rec_date, qty)
