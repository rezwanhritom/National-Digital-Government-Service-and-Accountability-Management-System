# Real-time congestion monitoring & prediction — code index

City map of **current** congestion, **forecast** time windows, and model-driven segment levels for authority operations.

## Frontend

| File | Role |
|------|------|
| `frontend/src/pages/CongestionMap.jsx` | Loads map features via `GET /congestion/map`; subscribes to **`GET /congestion/map/stream`** (SSE) for updates when segments change. |
| `frontend/src/App.jsx` | Route `/congestion`. |

## Backend — congestion proxy

| File | Role |
|------|------|
| `backend/app.js` | Mounts `congestionRoutes` at `/api/congestion`. |
| `backend/routes/congestionRoutes.js` | `GET /current`, `/forecast`, `/map`, `/map/stream`, `POST /predict`. |
| `backend/controllers/congestionController.js` | **`getCurrent`**, **`getForecast`**, **`postPredict`** forward to `aiService`; **`getMap`** / **`streamMap`** merge AI segments with **`ai-services/data/stops.json`** coordinates into GeoJSON-like features for the UI. |
| `backend/services/aiService.js` | **`getCongestionCurrent`**, **`getCongestionForecast`**, **`predictCongestion`** → FastAPI `/congestion/*`. |

## AI services — models and data

| File | Role |
|------|------|
| `ai-services/app/api/congestion.py` | **`GET /congestion/current`:** blends **observed** overrides (`ai-services/data/congestion_observed.json`) with **model** predictions per segment; **`GET /congestion/forecast`:** rolling hourly summaries; **`POST /congestion/predict`:** segment-level classifier; **`POST /congestion/planner-traffic`:** aggregate traffic index for planner. |
| `ai-services/app/main.py` | Lifespan calls **`congestion_api.configure_runtime_artifacts`** using **`active_model_manifest.json`** so deployed congestion model paths can differ from defaults. |
| `ai-services/ml_paths.py` | Default `CONGESTION_MODEL`, `CONGESTION_SEGMENT_ENCODER`. |
| `ai-services/data/routes.json` | Derives segment keys when encoder classes are empty. |

## Training

| File | Role |
|------|------|
| `ai-services/training/train_congestion.py` | Trains congestion classifier + segment encoder. |

## Related (not only congestion UI)

| File | Role |
|------|------|
| `backend/services/plannerService.js` | Uses **`predictCongestion`** and planner traffic for commute planning. |
| `backend/services/routeOptimizationService.js` | Uses **`getCongestionCurrent`** for admin optimization suggestions. |
