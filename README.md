# ChronosAI — Food Freshness & Inventory Optimization Agent

AI-powered perishable food inventory management system. A FastAPI backend runs a simulation engine and decision agent; a premium HTML/CSS/JS dashboard visualizes everything in real time via WebSockets.

---

## Quick Start

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Run the server

```bash
uvicorn backend.main:app --reload
```

### 3. Open the dashboard

Navigate to **http://localhost:8000** in your browser.

---

## Project Structure

```
chronos/
├── backend/
│   ├── __init__.py        # Package marker
│   ├── main.py            # FastAPI app, routes, WebSocket endpoint
│   ├── agent.py           # AI decision engine (5 action types)
│   ├── simulation.py      # Async tick loop + WebSocket manager
│   ├── database.py        # aiosqlite CRUD helpers
│   ├── models.py          # Pydantic schemas
│   └── seed.py            # Initial 5-location scenario
├── frontend/
│   ├── index.html         # Dashboard shell
│   ├── style.css          # Dark glassmorphism design system
│   └── app.js             # WS client, map, cards, charts, modal
├── inventory.db           # SQLite database (auto-created on first run)
├── requirements.txt
└── README.md
```

---

## Agent Decision Logic

The agent runs every simulation tick and evaluates each warehouse location using a **weighted risk score**:

```
wastage_risk = 0.40 × urgency
             + 0.40 × coverage_gap
             + 0.20 × overstock_ratio
```

It then picks the optimal action using a priority pipeline:

| Priority | Action | Trigger |
|----------|--------|---------|
| 1st | **Redistribute** | Source has surplus AND destination has <2 days coverage AND shelf life survives transport |
| 2nd | **Discount** | Shelf life ≤ 2 days, too short to ship anywhere |
| 3rd | **Priority Ship** | <1 day of stock remaining, emergency |
| 4th | **Reorder** | Stock will drop below safety threshold before regular order arrives |
| 5th | **Hold** | Everything is stable |

---

## Seed Scenario (Day 1)

| Location | Stock | Shelf Life | Demand | Expected Agent Action |
|----------|-------|------------|--------|----------------------|
| Mumbai Warehouse | 800u | 3d | 150/d | → Redistribute to Delhi |
| Delhi Hub | 100u | 8d | 300/d | ← Receives redistribution |
| Bangalore Cold Store | 450u | 6d | 200/d | Hold |
| Chennai Port | 60u | 2d | 80/d | Discount (20%) |
| Hyderabad Depot | 220u | 5d | 120/d | Reorder |

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/locations` | All locations with risk scores |
| `POST` | `/api/locations` | Add a warehouse |
| `PUT` | `/api/locations/{id}` | Edit a warehouse |
| `DELETE` | `/api/locations/{id}` | Remove a warehouse |
| `GET` | `/api/events?limit=50` | Agent decision history |
| `GET` | `/api/history` | Stock history for charts |
| `GET` | `/api/summary` | Global KPIs |
| `POST` | `/api/simulation/play` | Start simulation |
| `POST` | `/api/simulation/pause` | Pause simulation |
| `POST` | `/api/simulation/reset` | Reset to seed data |
| `PUT` | `/api/simulation/speed` | Set speed multiplier |
| `WS` | `/ws/agent` | Real-time agent event stream |

---

## WebSocket Message Types

**Server → Client:**
- `init` — full state on connection
- `tick` — updated locations + decisions each day
- `reset` — simulation was reset
- `status` — running/paused state changed
- `locations_updated` — location CRUD changed state

**Client → Server:**
- `{ "type": "play" }`
- `{ "type": "pause" }`
- `{ "type": "reset" }`
- `{ "type": "set_speed", "value": 2 }`

---

## Tech Stack

- **Backend**: Python 3.11+, FastAPI, Uvicorn, aiosqlite, Pydantic
- **Frontend**: HTML5, Vanilla CSS, Vanilla JavaScript (no frameworks)
- **Charts**: HTML5 Canvas API
- **Database**: SQLite (file: `inventory.db`)
- **Real-time**: WebSockets (FastAPI native)
