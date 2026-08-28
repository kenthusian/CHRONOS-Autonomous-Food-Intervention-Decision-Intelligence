"""
models.py — Pydantic schemas for all API request bodies.
"""
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional


# ── Products ──────────────────────────────────────────────────────
class ProductCreate(BaseModel):
    name:                 str
    category:             str            = ""
    unit:                 str            = "kg"
    default_shelf_days:   int            = Field(ge=1, default=7)
    default_daily_demand: float          = Field(ge=0.1, default=50)
    reorder_qty:          float          = Field(ge=0, default=200)
    supplier_lead_days:   int            = Field(ge=0, default=3)
    requires_cold_chain:  int            = Field(ge=0, le=1, default=0)
    cost_per_unit:        float          = Field(ge=0, default=0)

class ProductUpdate(BaseModel):
    name:                 Optional[str]   = None
    category:             Optional[str]   = None
    unit:                 Optional[str]   = None
    default_shelf_days:   Optional[int]   = None
    default_daily_demand: Optional[float] = None
    reorder_qty:          Optional[float] = None
    supplier_lead_days:   Optional[int]   = None
    requires_cold_chain:  Optional[int]   = None
    cost_per_unit:        Optional[float] = None


# ── Warehouses ────────────────────────────────────────────────────
class WarehouseCreate(BaseModel):
    name:                str
    city:                str            = ""
    region:              str            = ""
    lat:                 float          = 20.5
    lng:                 float          = 78.9
    capacity_units:      float          = Field(ge=1, default=10000)
    has_cold_storage:    int            = Field(ge=0, le=1, default=0)
    transport_time_days: float          = Field(ge=0, default=1.5)
    contact_person:      str            = ""
    contact_phone:       str            = ""

class WarehouseUpdate(BaseModel):
    name:                Optional[str]   = None
    city:                Optional[str]   = None
    region:              Optional[str]   = None
    lat:                 Optional[float] = None
    lng:                 Optional[float] = None
    capacity_units:      Optional[float] = None
    has_cold_storage:    Optional[int]   = None
    transport_time_days: Optional[float] = None
    contact_person:      Optional[str]   = None
    contact_phone:       Optional[str]   = None


# ── Inventory Batches ─────────────────────────────────────────────
class BatchCreate(BaseModel):
    product_id:       int
    warehouse_id:     int
    batch_no:         str
    quantity:         float  = Field(ge=0)
    manufacture_date: Optional[str] = None
    expiry_date:      str
    cost_per_unit:    float  = Field(ge=0, default=0)
    received_date:    Optional[str] = None
    notes:            str   = ""

class BatchUpdate(BaseModel):
    batch_no:         Optional[str]   = None
    quantity:         Optional[float] = None
    manufacture_date: Optional[str]   = None
    expiry_date:      Optional[str]   = None
    cost_per_unit:    Optional[float] = None
    notes:            Optional[str]   = None


# ── Demand ────────────────────────────────────────────────────────
class DemandRecord(BaseModel):
    product_id:    int
    warehouse_id:  int
    date:          str
    quantity_sold: float = Field(ge=0)
    is_manual:     bool  = True

class DemandConfigSet(BaseModel):
    product_id:          int
    warehouse_id:        int
    manual_daily_demand: Optional[float] = None   # None = clear override


# ── Recommendations ───────────────────────────────────────────────
class RecommendationReject(BaseModel):
    reason: str = ""


# ── Operations ────────────────────────────────────────────────────
class OperationStatusUpdate(BaseModel):
    status:      str
    actual_cost: Optional[float] = None
    notes:       Optional[str]   = None
