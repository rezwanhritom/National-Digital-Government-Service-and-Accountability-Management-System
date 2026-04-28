# Module 1 Member 2 Functional Requirement 1

## Nearby bus stops & live bus discovery (complete master note)

This document is the full implementation guide and viva-ready explanation for:

> Module 1, Member 2, Functional Requirement 1: Nearby stops & live bus discovery system  
> “Commuters can search or use location to view nearby stops, see upcoming buses, live locations, and AI-predicted arrival times for each route at each stop.”

---

## 1) Scope and expected user behavior

User should be able to:

1. Use geolocation to find nearby stops.
2. Search stops by name.
3. Select a stop and view upcoming buses.
4. See live bus positions.
5. Get ETA-to-stop for buses.
6. Observe continuous movement updates (websocket live; polling fallback).

---

## 2) Current completion status

FR is implemented for **project simulation scope** (no physical bus GPS hardware).

Implemented:
- real stop/route datasets (not hardcoded mock arrays),
- simulated fleet-based live positions,
- stop-specific upcoming buses with ETA,
- live map and live feed,
- websocket live stream (`live:buses`) + fallback polling.

Not implemented (production extension):
- device telemetry ingestion from real buses (`POST /ingest/gps` with API key),
- persistent historical bus_positions DB table.

---

## 3) Architecture (how this module works)

### Data flow

1. Frontend `NearbyLive.jsx` calls stop and bus APIs.
2. Stops APIs use shared transit dataset service (`stops.json`, `routes.json`).
3. Bus APIs use fleet simulation service (same simulation used by planner tracking).
4. Live updates come from:
   - websocket pushes (`live:buses`), or
   - polling fallback (`GET /api/buses/live`).

---

## 4) Key files and responsibilities

## Frontend

- `frontend/src/pages/NearbyLive.jsx`
  - Nearby/live UI page.
  - Search and geolocation controls.
  - Stop list and upcoming buses panel.
  - Live map markers for stops and buses.
  - Websocket subscription + polling fallback.

- `frontend/src/services/api.js`
  - API wrappers:
    - `getNearbyStops`
    - `searchStops`
    - `getUpcomingBuses`
    - `getLiveBusLocations`
    - `getBusLocation`

- `frontend/src/App.jsx`
  - Route registration for `/nearby-live`.

- `frontend/src/components/Navbar.jsx`
  - Nav link entry “Nearby Live”.

## Backend

- `backend/routes/index.js`
  - Public endpoints used by this module:
    - `GET /api/stops/nearby`
    - `GET /api/stops/search`
    - `GET /api/stops/:stop_id/buses`
    - `GET /api/buses/live`
    - `GET /api/buses/:bus_id/location`

- `backend/controllers/stopsController.js`
  - Nearby stop search using Haversine distance.
  - Query validation and stop filtering.
  - Includes routes served per stop.

- `backend/controllers/busesController.js`
  - Upcoming buses for stop from simulation engine.
  - Live buses endpoint (with optional route filter).
  - Single bus live location endpoint.

- `backend/services/transitDataService.js`
  - Loads and caches:
    - `ai-services/data/stops.json`
    - `ai-services/data/routes.json`
  - Provides stop lookup and routes-per-stop mapping.

- `backend/services/fleetSimulationService.js`
  - Core simulation source:
    - many buses per route,
    - positions, loops, shifts,
    - ETA-to-stop logic for upcoming buses.

- `backend/server.js`
  - Socket.IO server initialization.

- `backend/services/liveSocketHub.js`
  - Websocket event broadcasting:
    - initial connect ack,
    - live bus snapshots every ~3s.

---

## 5) Datasets used

- `ai-services/data/stops.json`
  - Stop coordinates and metadata.
- `ai-services/data/routes.json`
  - Route definitions with stop order (including return directions).

These are the authoritative sources for this module’s stop discovery and route-stop membership.

---

## 6) API contract (member 2 module)

## 6.1 Nearby/search stops

### `GET /api/stops/nearby?lat=&lng=&radius=`

Returns:
- stop id/name/coords,
- computed distance,
- list of routes serving that stop.

Validation:
- lat/lng required and numeric,
- radius bounded (defensive limits).

### `GET /api/stops/search?query=`

Returns:
- stop matches by name,
- routes serving each stop.

## 6.2 Upcoming buses per stop

### `GET /api/stops/:stop_id/buses?limit=N`

Returns:
- upcoming simulated buses for that stop,
- ETA to stop,
- route name,
- loop and current segment details.

## 6.3 Live buses

### `GET /api/buses/live`

Returns:
- current snapshot of live simulated buses.
- optional filtering by `route_name`.

### `GET /api/buses/:bus_id/location`

Returns:
- one bus live state:
  - lat/lon,
  - route,
  - loop counters,
  - current segment.

---

## 7) Websocket events

Socket server runs on backend host/port.

Client -> server:
- `live:subscribe` (request immediate snapshot)

Server -> client:
- `live:connected`
- `live:buses`
- `live:error`

Fallback:
- if websocket unavailable, frontend polls REST live endpoint.

---

## 8) Algorithms and logic used

### 8.1 Nearby stops

- Haversine distance between user coordinate and every stop coordinate.
- Sort by distance and threshold by radius.

### 8.2 Upcoming bus ETA to stop

- Uses simulated bus route progression from fleet engine.
- For each active bus that serves stop:
  - computes remaining segment travel to target stop,
  - outputs ETA in minutes.

### 8.3 Live bus position

- Position interpolated between current `from_stop` and `to_stop` based on loop progress.
- Ensures buses remain on assigned route path only.

---

## 9) Environment variables relevant to this module

## Backend

- `FLEET_SIM_TIME_SCALE`  
  Simulation speed multiplier for easier demos.

- `SOCKET_CORS_ORIGIN`  
  CORS origin for websocket clients.

## Frontend

- `VITE_API_URL`  
  REST API base (`http://localhost:5000/api`).

- `VITE_SOCKET_URL` (recommended)  
  Explicit websocket host (`http://localhost:5000`).

---

## 10) Why this does not break Member 1 (AI commute planner)

This module is implemented mainly in:
- `routes/index.js`-based controllers (`stopsController`, `busesController`)
- dedicated nearby/live frontend page (`NearbyLive.jsx`)

Commute planner endpoints (`/api/planner/*`) and core planner search/ranking logic remain separate and unchanged.

---

## 11) Faculty viva quick-answer set

1. **Is this real GPS?**  
   No, simulation-based GPS in project scope; API contracts mimic real telemetry behavior.

2. **How do buses stay on route?**  
   Movement is constrained by route stop order from `routes.json`; interpolation only on route segments.

3. **How is nearby stop computed?**  
   Haversine distance over `stops.json`, radius filter, sorted ascending distance.

4. **How is upcoming ETA computed?**  
   Remaining route progression time to selected stop from current simulated bus state.

5. **Why websocket + fallback polling?**  
   Websocket gives low-latency updates; polling preserves functionality if socket fails.

---

## 12) Final status statement (module 1 member 2 FR-1)

For academic/demo scope, this functional requirement is complete:
- nearby stop discovery,
- stop search,
- upcoming buses with ETA,
- live bus locations,
- continuous updates (websocket + fallback).

Production-only additions (optional later):
- real bus device ingestion and auth pipeline,
- persistent bus_positions DB/event stream pipeline.
