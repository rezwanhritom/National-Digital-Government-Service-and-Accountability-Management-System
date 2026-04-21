# Tiny features of plan AI commute mplanner

Use this as a feature-by-feature evaluation checklist (keep / remove / modify / add).

---

## 1) User input + request shaping

- Select **origin stop** from known stops.
- Select **destination stop** from known stops.
- Input **time** in `HH:MM` (or legacy `hour` fallback).
- Choose **time mode**: `leave_after` or `arrive_by`.
- Choose **ranking preference**: `fastest`, `less_crowded`, `fewer_transfers`.
- Validate request fields before planning.

---

## 2) Network modeling

- Uses `routes.json` as transit graph source.
- Supports **bidirectional service** via `... (Return)` route rows.
- Node state model: `(stop, current route or null)`.
- Edge types:
  - **Ride edge** (bus segment),
  - **Transfer edge** (same-stop route switch),
  - **Walk edge** (nearby stops within walking threshold).

---

## 3) Candidate route search

- Finds candidate paths between origin and destination.
- Includes transfer penalties while searching.
- Includes optional walk penalties while searching.
- De-duplicates near-identical path signatures.
- Returns multiple alternatives (not just one route).

---

## 4) Segment-level AI estimation

- For each ride segment, calls ETA model (`/eta`).
- For each ride segment, calls crowding model (`/crowding`).
- Pulls segment congestion context (`/congestion/predict`).
- Uses global congestion fallback if segment predict fails.

---

## 5) Time handling + feasibility

- Uses selected `time` as planning context.
- In `arrive_by`, computes feasible options only.
- Computes suggested departure time for feasible arrive-by trips.
- Returns time notes for user explanation.

---

## 6) Route-level aggregation

- Aggregates segment ETAs into route total ETA.
- Computes transfer count.
- Computes walking minutes/count.
- Computes route crowd label (worst crowd across ride legs).
- Builds explanation text for each option.

---

## 7) Ranking + “best option”

- Converts route metrics to a numeric score.
- Scores vary by selected preference mode.
- Sorts routes by score.
- Marks top-ranked route as “Best Option”.

---

## 8) Map visualization features

- Renders best-route path on Leaflet map.
- Uses stop coordinates from `stops.json`.
- Colors route segments by crowd level.
- Shows landmark markers/tooltips from `route_geometries.json`.
- Shows segment tooltips (`route`, `from`, `to`, crowd).

---

## 9) Simulation fleet (planner-owned)

- Generates many buses per route pattern (>20 each).
- Staggered first departures using fixed headway.
- Applies global service window (05:00–24:00).
- Applies per-bus random shift windows.
- Simulates live bus position stop-to-stop.
- Tracks loop index and loops completed.
- Supports simulation time scaling (`FLEET_SIM_TIME_SCALE`).

---

## 10) Loop history persistence

- Detects loop completion events.
- Appends loop records to JSONL history file.
- Stores per-loop fields (bus, route, loop index, start/end, duration, day).
- Exposes history via API for later ML/data use.

---

## 11) Session-based rider tracking

- Create tracking session for chosen route segment.
- Select nearest active simulated bus for boarding context.
- Return **ETA to user** before onboard confirmation.
- “I’m on the bus” transition endpoint.
- Return **ETA to destination** after onboard confirmation.
- Polling endpoint for live session updates.

---

## 12) Save/favorite stub

- Save best commute snapshot via planner API.
- Keep saved favorites in in-memory stub store.
- List saved favorites.
- UI button to save best route.

---

## 13) API surface (planner-specific)

- `POST /api/planner/commute`
- `GET /api/planner/stops`
- `GET /api/planner/favorites`
- `POST /api/planner/favorites`
- `GET /api/planner/sim/fleet`
- `GET /api/planner/sim/buses/:bus_id`
- `GET /api/planner/sim/history`
- `POST /api/planner/sim/session`
- `GET /api/planner/sim/session/:session_id`
- `POST /api/planner/sim/session/:session_id/onboard`

---

## 14) Training + model lifecycle hooks used by planner

- ETA training dataset + model artifacts.
- Crowding training dataset + model artifacts.
- Congestion training dataset/model for segment context.
- Return-route data augmentation script to keep training aligned with network.

---

## 15) Optional review tags (for your evaluation pass)

For each tiny feature above, mark:

- `KEEP`
- `MODIFY`
- `REMOVE`
- `ADD-ON` (new extension)

You can copy this file and add status notes beside each bullet during review.
