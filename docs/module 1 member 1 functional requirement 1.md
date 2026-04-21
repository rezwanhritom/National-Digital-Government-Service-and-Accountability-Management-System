# Module 1 Member 1 Functional Requirement 1

## AI-powered commute planner (complete master note)

This document is the full, viva-ready explanation of **Module 1 → Member 1 → Functional Requirement 1**:

> Users enter origin/destination and desired arrival/departure time; system suggests best route(s), departure time, and bus options, factoring in congestion predictions and crowding estimates.

Use this as your primary memorization and defense sheet.

---

## 1) What this feature does (in plain language)

The user selects:
- origin stop,
- destination stop,
- time and time mode (`leave_after` or `arrive_by`),
- preference (`fastest`, `less_crowded`, `fewer_transfers`).

Then the system:
1. Searches valid route paths (including transfers and short walking links),
2. Predicts ETA and crowding for route segments,
3. Applies congestion context to ETA,
4. Scores and ranks alternatives,
5. Shows best options in UI,
6. Supports simulation-based live tracking:
   - nearest bus to user,
   - ETA to user,
   - after onboard confirmation, ETA to destination,
7. Tracks fleet loops and writes loop history for future model/data use.

---

## 2) Tech stack and architecture

- **Frontend:** React + Vite (`frontend/`)
- **Backend API:** Node.js + Express (`backend/`)
- **AI service:** Python FastAPI (`ai-services/`)
- **ML artifacts:** `.pkl` models + encoders in `ai-services/models` and `ai-services/encoders`
- **Main architecture style:** Backend orchestrates workflow; AI service provides predictions.

This is a **hybrid rule-based + ML** planner:
- Rule-based graph search and ranking orchestration in backend,
- ML segment-level ETA/crowding/congestion predictions from AI service.

---

## 3) End-to-end workflow (request lifecycle)

1. User submits planner form in frontend.
2. Frontend calls `POST /api/planner/commute`.
3. Backend validates input in `plannerController`.
4. Backend service (`plannerService`) loads route network and finds candidate paths.
5. Backend calls AI service for segment predictions:
   - `/eta`
   - `/crowding`
   - `/congestion/predict`
6. Backend computes total metrics per option:
   - ETA,
   - transfers,
   - walking minutes,
   - crowd severity,
   - ranking score.
7. Backend returns sorted route options to frontend.
8. Frontend displays cards (best option highlighted).
9. Optional live simulation:
   - nearest bus API,
   - tracking session,
   - onboard switch to destination ETA.

---

## 4) Frontend files and responsibilities

### `frontend/src/pages/Planner.jsx`
Main UI for FR-1:
- form inputs (origin, destination, time, mode, preference),
- route results list,
- best route highlighting,
- simulation controls:
  - track best bus,
  - confirm onboard,
  - nearest bus card,
- save best route button.

### `frontend/src/services/api.js`
Axios instance and base URL handling for backend communication.

### `frontend/src/App.jsx`
Route mapping (`/planner` page binding).

---

## 5) Backend files and responsibilities

### `backend/routes/plannerRoutes.js`
Defines FR-1 API endpoints:
- `POST /api/planner/commute`
- `GET /api/planner/stops`
- `GET/POST /api/planner/favorites`
- `GET /api/planner/sim/fleet`
- `GET /api/planner/sim/buses/:bus_id`
- `GET /api/planner/sim/history`
- `GET /api/planner/sim/nearest`
- `POST /api/planner/sim/session`
- `GET /api/planner/sim/session/:session_id`
- `POST /api/planner/sim/session/:session_id/onboard`

### `backend/controllers/plannerController.js`
Controller-level responsibilities:
- request validation and normalization (`time`, `hour`, `time_type`, `preference`),
- calling planner service,
- simulation endpoints,
- favorites stub endpoints.

### `backend/services/plannerService.js`
Core intelligence orchestration:
- loads network data,
- builds path graph,
- runs multi-route path search,
- handles transfer and walking edges,
- fetches segment-level congestion,
- calls ETA/crowding predictions per segment,
- computes aggregate route metrics and score,
- prepares map segments/landmarks for UI.

### `backend/services/fleetSimulationService.js`
Simulation subsystem:
- generates many buses per route pattern (>20),
- applies headway and shifts,
- updates simulated positions,
- tracks loop counts and current loop,
- stores loop history in JSONL,
- nearest-bus and session-based live ETA logic.

### `backend/services/aiService.js`
HTTP client wrapper to AI service endpoints.

---

## 6) AI service files and responsibilities

### `ai-services/app/main.py`
FastAPI app entrypoint:
- loads model/encoder artifacts,
- exposes prediction endpoints.

### `ai-services/app/api/congestion.py`
Congestion endpoints:
- segment prediction,
- planner-level congestion helpers.

---

## 7) Data files used by FR-1

### Network and map data
- `ai-services/data/routes.json`
  - Route stop sequences (includes `... (Return)` for reverse direction).
- `ai-services/data/stops.json`
  - Stop coordinates (lat/lon), used for map and simulation interpolation.
- `ai-services/data/route_geometries.json`
  - Landmark/corridor metadata for UI map markers.

### Training datasets
- `ai-services/data/eta_dataset.csv`
  - Columns: `route, from_stop, to_stop, hour, traffic_level, travel_time`.
- `ai-services/data/crowd_dataset.csv`
  - Columns: `route, stop, hour, crowd_level`.
- `ai-services/data/congestion_train.csv`
  - Segment-based congestion training rows.

### Simulation history data
- `ai-services/data/history/fleet_loop_history.jsonl`
  - Append-only loop completion records.

---

## 8) Model artifacts (`.pkl`) and encoders

### Models (in `ai-services/models/`)
- `eta_model.pkl` (regression)
- `crowd_model.pkl` (classification)
- `congestion_model.pkl` (classification)

### Encoders (in `ai-services/encoders/`)
- `route_encoder.pkl`
- `stop_encoder.pkl`
- `traffic_encoder.pkl`
- `crowd_encoder.pkl`
- (and congestion segment encoder used by congestion flow)

Why encoders are needed:
- ML models need numeric input, but routes/stops/traffic are strings.
- Encoders guarantee training/inference mapping consistency.

---

## 9) Training scripts and how they work

### `ai-services/training/train_eta.py`
- Reads ETA CSV.
- Encodes categorical fields.
- Trains `RandomForestRegressor`.
- Saves ETA model + route/stop/traffic encoders.

### `ai-services/training/train_crowd.py`
- Reads crowd CSV.
- Uses route/stop encoders.
- Trains `RandomForestClassifier`.
- Saves crowd model + crowd label encoder.

### `ai-services/training/train_congestion.py`
- Builds segment keys from routes.
- Generates/uses congestion rows.
- Trains classifier for segment congestion level.

### `ai-services/training/augment_return_training_data.py`
- Expands datasets for `(Return)` routes,
- keeps training aligned after bidirectional network changes.

---

## 10) Algorithms used in FR-1

## A) Route/path algorithm
- Dijkstra-style search on graph states `(stop, currentRoute|null)`.
- Edge types:
  - ride edge (AI ETA),
  - transfer edge (fixed penalty),
  - walking edge (distance-based ETA).

## B) Congestion integration
- Build segment keys `Route|A->B`.
- Query congestion prediction per segment.
- Feed segment traffic level into ETA inference call.

## C) Scoring/ranking
- Per option compute:
  - total ETA,
  - transfer count,
  - walking minutes,
  - crowd severity.
- Convert to score (weights vary by preference mode).
- Sort ascending score, top result = best option.

## D) Simulation logic
- Fleet generated per route pattern.
- Each bus has shift, first departure, loop duration.
- Position interpolated on current stop-to-stop segment.
- Loop completion increments counters and writes history.

---

## 11) How “best route” is actually decided

It is **not one single model**.

It is:
1. Rule-based candidate path generation,
2. ML-based segment metrics (ETA/crowding/congestion),
3. Weighted ranking policy.

So best route is the result of orchestration + scoring, not just a single prediction.

---

## 12) Live tracking behavior in this project

This project uses **simulated GPS**, not real bus hardware.

What is live:
- buses update continuously based on simulation clock,
- nearest active bus is computed against selected route segment,
- ETA to user updates periodically,
- after onboard confirmation, ETA to destination is shown.

This is suitable for academic demo scope.

---

## 13) Current limitations (important to say in viva)

- GPS is simulated (no physical bus devices).
- Nearest/live update currently uses polling (websocket can be added later).
- Favorites are in-memory stub (not DB persistent yet).
- Route geometry/landmark set is seeded and can be further refined.

These are extension points, not blockers for FR-1 demo completion.

---

## 14) Questions faculty may ask (with short answer direction)

1. **Is this fully AI-based?**  
   Not fully. Pathfinding is algorithmic; segment metrics are AI-predicted.

2. **Why encoders?**  
   To convert categorical route/stop/traffic values into numeric model inputs.

3. **How do you support reverse direction?**  
   `(Return)` route variants in `routes.json` and aligned training augmentation.

4. **How is congestion used?**  
   Segment-level congestion is predicted and injected into ETA requests.

5. **How is closest bus found?**  
   Filter active buses on route and pick minimal ETA to boarding stop.

6. **How do you keep historical movement data?**  
   Loop completion events are appended to `fleet_loop_history.jsonl`.

---

## 15) FR-1 completion statement

For project/demo scope, FR-1 is implemented end-to-end:
- route suggestion,
- AI ETA/crowding/congestion integration,
- ranked alternatives,
- departure guidance,
- simulation-based nearest/live bus tracking,
- loop lifecycle/history generation.

This is sufficient to defend Module 1 Member 1 requirement implementation.
