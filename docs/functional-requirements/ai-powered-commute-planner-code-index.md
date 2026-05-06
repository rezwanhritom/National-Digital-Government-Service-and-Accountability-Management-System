# AI-powered commute planner — code index

This document lists repository files that implement or support the commute planner: origin/destination, desired arrival or departure time, ranked routes with ETAs, congestion-aware segment timing, and crowding estimates.

## Frontend (React)

| File | Role |
|------|------|
| `frontend/src/pages/Planner.jsx` | UI for stops, time (`leave_after` / `arrive_by`), preferences (`fastest`, `less_crowded`, `fewer_transfers`), calls `/api/planner/stops` and `/api/planner/commute`, optional simulated boarding session APIs. |
| `frontend/src/App.jsx` | Registers the `/planner` route. |
| `frontend/src/services/api.js` | Axios client (`VITE_API_URL` → `/api`); bearer tokens for protected endpoints used elsewhere. |

## Backend (Express) — API gateway

| File | Role |
|------|------|
| `backend/app.js` | Mounts `plannerRoutes` at `/api/planner`. |
| `backend/routes/plannerRoutes.js` | HTTP mapping: `POST /commute`, `GET /stops`, favorites, fleet simulation helpers. |
| `backend/controllers/plannerController.js` | Validates body (`origin`, `destination`, `time` or `hour`, `time_type`, `preference`, optional `active_incidents`), calls `planCommute`. |
| `backend/services/plannerService.js` | Core planner: loads routes from MongoDB `TransitRoute` or `ai-services/data/routes.json`; builds multi-route graph; calls AI for per-segment ETA and crowding; uses congestion prediction per segment and optional high-severity incident delay profile; ranks paths. |
| `backend/services/aiService.js` | HTTP client to Python AI service: `POST /eta`, `POST /crowding`, `POST /congestion/predict`, `POST /congestion/planner-traffic` (via `getPlannerTrafficLevel`, `predictCongestion`). Requires `AI_SERVICE_URL`. |
| `backend/services/fleetSimulationService.js` | Simulated fleet/session endpoints used from the planner page for “nearest bus” and tracking demos (not required for core ETA math). |
| `backend/models/TransitRoute.js` | When MongoDB has routes, they override the static JSON for planning. |
| `backend/models/FeatureFlag.js` | Flag `traffic_prediction_mode` read by `resolveTrafficLevelForPlanning` to vary congestion behaviour. |

## AI services (FastAPI)

| File | Role |
|------|------|
| `ai-services/app/main.py` | Defines `POST /eta` and `POST /crowding` using trained `eta_model`, `crowd_model`, and label encoders; loads artifacts at startup. |
| `ai-services/app/api/congestion.py` | `POST /congestion/predict` (per-segment levels), `POST /congestion/planner-traffic` (aggregate HIGH/MEDIUM/LOW for the hour), plus current/forecast used indirectly. |
| `ai-services/ml_paths.py` | Paths to ETA/crowding/congestion model files and encoders. |
| `ai-services/data/routes.json` | Fallback route topology when DB is empty. |
| `ai-services/data/stops.json` | Stop coordinates, zones; used for walking edges and map polylines in planner responses. |
| `ai-services/data/route_geometries.json` | Optional landmarks per route for map segments in planner output. |

## Artifacts (runtime)

| Location | Role |
|----------|------|
| `ai-services/models/*.pkl` | Trained regressors/classifiers for ETA, crowding, congestion (as referenced in `ml_paths.py`). |
| `ai-services/encoders/*.pkl` | Feature encoders for routes, stops, traffic labels, segments. |

## Training / data generation (offline, supports planner quality)

| File | Role |
|------|------|
| `ai-services/training/train_eta.py` | Trains segment ETA model. |
| `ai-services/training/train_crowd.py` | Trains crowding classifier. |
| `ai-services/training/train_congestion.py` | Trains congestion classifier used by `/congestion/predict` and planner traffic. |
| `ai-services/scripts/generate_ml_datasets.py` | Builds datasets used by training pipelines. |

## Related diagnostic endpoint

| File | Role |
|------|------|
| `backend/routes/index.js` | `POST /api/ai/test` runs ETA, crowding, classification, and impact in parallel for debugging—not the production planner path. |

---

**Environment:** `AI_SERVICE_URL` must point at the FastAPI service for live ETAs, crowding, and congestion-assisted planning.
