# Incident classification & routing — code index

Files involved in **automatic classification** (rules + ML), **severity**, and **routing** to operator or authority queues by category, severity, zone, and route context.

## Frontend

| File | Role |
|------|------|
| `frontend/src/pages/Incident.jsx` | Incident submission UI (areas, description, media); interacts with incidents API. |
| `frontend/src/services/api.js` | `submitIncident`, `getIncidentAreas`, `getIncidents`, etc. |

## Backend — persisted incidents & submission

| File | Role |
|------|------|
| `backend/routes/index.js` | `GET /incidents/areas`, `POST /incidents/submit` (auth + multipart), `GET /incidents`, status updates. |
| `backend/controllers/incidentsController.js` | `submitIncident`: resolves area/geo from `stops.json`, saves `Incident`, optionally calls `classifyIncident` from `aiService.js` and stores result in `aiClassification`. |
| `backend/models/Incident.js` | Schema including `aiClassification`, operator fields (`assignedTo`, …). |
| `backend/services/incidentImpactService.js` | Shared geo helpers: `loadStopsDataset`, `buildIncidentAreasFromStops`, `deriveIncidentGeoContext`, nearest stop/segment, zones, affected routes (used when resolving location). |

## Backend — standalone classify API (routing desk)

| File | Role |
|------|------|
| `backend/app.js` | Mounts `incidentRoutes` at `/api/incidents` — **note:** overlaps path prefix with `index.js`; Express matches first registered handler for each verb/path (see workflow). |
| `backend/routes/incidentRoutes.js` | `POST /classify`, `POST /impact` → `incidentController.js`. |
| `backend/controllers/incidentController.js` | **`classifyIncident`:** validates description, builds geo context via `deriveIncidentGeoContext`, calls AI `classifyIncident`, evaluates ML confidence vs env thresholds (`INCIDENT_CATEGORY_CONF_MIN`, `INCIDENT_SEVERITY_CONF_MIN`), sets `routing_mode` (`manual_review` vs `auto`), computes **`assigned_to`** via **`assignAuthority()`** (category, severity, affected routes, zone, network status). |
| `backend/services/aiService.js` | `classifyIncident` → FastAPI `POST /incidents/classify`. |

## AI services — models and fallbacks

| File | Role |
|------|------|
| `ai-services/app/api/incidents.py` | **`POST /incidents/classify`:** TF-IDF + classifiers when artifacts exist; else **`_fallback_classify`** keyword rules. Returns `category`, `severity`, probability maps. |
| `ai-services/app/main.py` | Startup loads ETA/crowding artifacts; `lifespan` calls `incidents_api.load_incident_artifacts()`. |
| `ai-services/ml_paths.py` | Paths to `incident_vectorizer.pkl`, `incident_category_clf.pkl`, `incident_severity_clf.pkl`, impact artifacts. |

## Training / artifacts

| File | Role |
|------|------|
| `ai-services/training/train_incidents.py` | Trains incident category/severity models and vectorizer outputs under `encoders/` and `models/`. |
| `ai-services/data/incident_train.csv` | Training data path (see `ml_paths.py`). |

## Auth & roles (submission)

| File | Role |
|------|------|
| `backend/middleware/authMiddleware.js` | JWT and RBAC for `/incidents/submit`. |
| `backend/constants/roles.js` | Roles allowed to submit incidents. |

---

**Related but distinct:** `POST /api/ai/test` in `backend/routes/index.js` also calls `classifyIncident` for debugging alongside ETA/crowding/impact.
