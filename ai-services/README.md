# AI Services

Python FastAPI microservice for ETA, crowding, congestion prediction, incident classification, and impact estimation. The Node backend calls these endpoints; models are trained offline and loaded at runtime.

## Endpoints

| Path | Description |
|------|-------------|
| `POST /eta` | Segment travel times for commute planner / live ETAs |
| `POST /crowding` | Crowd level probabilities per route/stop/time |
| `POST /incidents/classify` | Incident category and severity from text + metadata |
| `POST /incidents/impact` | Affected segments, delay, recovery time for high-severity incidents |
| `POST /congestion/predict` | Congestion forecast per segment and time horizon |
| `GET /health` | Health check |

## Run

```bash
cd ai-services
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Service runs at http://localhost:8000. Backend should call this URL (or configured `AI_SERVICE_URL`).

## Layout

- **app/** – FastAPI app, API routers, inference (model loading & prediction).
- **training/** – Notebooks and scripts for data prep, feature engineering, training.
- **model_registry/** – Persisted model files (e.g. `.pkl`); often excluded from git or stored in object storage.
