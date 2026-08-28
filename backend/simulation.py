"""
simulation.py — Async simulation tick engine + WebSocket connection manager.

The SimulationEngine runs an asyncio task that advances one "day" every
(tick_interval / speed) seconds. On each tick it:
  1. Consumes daily demand from every location
  2. Decrements shelf life by 1 day
  3. Accounts for wastage when shelf life hits 0
  4. Runs the AI agent (evaluate_all)
  5. Applies redistribution transfers between locations
  6. Persists events and history to SQLite
  7. Broadcasts a `tick` message to all connected WebSocket clients
"""

from __future__ import annotations

import asyncio
import json
from typing import Any

from . import database as db
from .agent import evaluate_all, compute_risk, ACTION_REDISTRIBUTE


# ─── WebSocket connection manager ─────────────────────────────────────────────

class ConnectionManager:
    def __init__(self) -> None:
        self._connections: set = set()

    async def connect(self, websocket) -> None:
        await websocket.accept()
        self._connections.add(websocket)

    def disconnect(self, websocket) -> None:
        self._connections.discard(websocket)

    async def broadcast(self, payload: dict[str, Any]) -> None:
        if not self._connections:
            return
        data = json.dumps(payload, default=str)
        dead: set = set()
        for ws in list(self._connections):
            try:
                await ws.send_text(data)
            except Exception:
                dead.add(ws)
        self._connections -= dead

    @property
    def count(self) -> int:
        return len(self._connections)


manager = ConnectionManager()


# ─── Simulation engine ────────────────────────────────────────────────────────

class SimulationEngine:
    TICK_INTERVAL = 3.0   # seconds per simulated day at speed = 1×

    def __init__(self) -> None:
        self.current_day: int         = 1
        self.running: bool            = False
        self.speed: float             = 1.0
        self._task: asyncio.Task | None = None

    # ── Public controls ───────────────────────────────────────────────────────

    async def start(self) -> None:
        if self.running:
            return
        self.running = True
        self._task = asyncio.create_task(self._loop())

    async def pause(self) -> None:
        self.running = False
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self._task = None

    async def reset(self) -> None:
        await self.pause()
        self.current_day = 1
        from .seed import seed_data
        await seed_data()
        locations = await db.get_locations()
        for loc in locations:
            loc["wastage_risk"]  = compute_risk(loc)
            loc["days_of_stock"] = round(loc["stock_units"] / max(loc["daily_demand"], 0.1), 2)
        summary = await db.get_summary()
        await manager.broadcast({
            "type":      "reset",
            "day":       self.current_day,
            "locations": locations,
            "summary":   summary,
        })

    def set_speed(self, speed: float) -> None:
        self.speed = max(0.25, min(speed, 10.0))

    # ── Internal loop ─────────────────────────────────────────────────────────

    async def _loop(self) -> None:
        while self.running:
            await self._tick()
            await asyncio.sleep(self.TICK_INTERVAL / self.speed)

    async def _tick(self) -> None:
        day       = self.current_day
        locations = await db.get_locations()

        # ── Phase 1: consume demand, decrement shelf life, account for wastage
        wastage_total = 0.0
        for loc in locations:
            new_stock = max(0.0, loc["stock_units"] - loc["daily_demand"])
            new_shelf = max(0.0, loc["shelf_life_days"] - 1.0)
            wastage   = 0.0

            if new_shelf <= 0 and new_stock > 0:
                wastage   = new_stock
                new_stock = 0.0

            wastage_total += wastage
            await db.update_stock(loc["id"], new_stock, new_shelf)
            await db.insert_history(day, loc["id"], new_stock, wastage)

            # Update in-memory copy for agent
            loc["stock_units"]     = new_stock
            loc["shelf_life_days"] = new_shelf

        # ── Phase 2: run agent
        decisions = evaluate_all(locations, day)

        # ── Phase 3: apply redistribution transfers
        for decision in decisions:
            if decision["action"] != ACTION_REDISTRIBUTE:
                continue
            detail  = decision["detail"]
            src_id  = decision["location_id"]
            dst_id  = detail["to_location_id"]
            units   = detail["units"]

            src = await db.get_location(src_id)
            dst = await db.get_location(dst_id)
            if src and dst:
                await db.update_stock(src_id, max(0, src["stock_units"] - units), src["shelf_life_days"])
                await db.update_stock(dst_id, min(dst["max_capacity"], dst["stock_units"] + units), dst["shelf_life_days"])

        # ── Phase 4: persist all events
        for decision in decisions:
            await db.insert_event(day, decision["location_id"], decision["action"], decision["detail"])

        # ── Phase 5: refresh state and broadcast
        locations = await db.get_locations()
        for loc in locations:
            loc["wastage_risk"]  = compute_risk(loc)
            loc["days_of_stock"] = round(loc["stock_units"] / max(loc["daily_demand"], 0.1), 2)

        summary = await db.get_summary()

        await manager.broadcast({
            "type":          "tick",
            "day":           day,
            "locations":     locations,
            "decisions":     decisions,
            "summary":       summary,
            "wastage_today": round(wastage_total, 1),
        })

        self.current_day += 1


# ── Module-level singletons used by main.py ──────────────────────────────────
simulation = SimulationEngine()
