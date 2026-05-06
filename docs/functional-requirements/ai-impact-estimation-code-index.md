# AI-based impact estimation — code index

High-severity incident **impact estimation**: affected routes, delay/recovery, reroute suggestions, commuter alerting hooks, and planner ETA adjustments when incident payloads are supplied.

## Backend — impact API orchestration

| File | Role |
|------|------|
| `backend/routes/incidentRoutes.js` | `POST /impact` → `estimateImpact`. |
| `backend/controllers/incidentController.js` | **`estimateImpact`:** geo context, `rankAffectedRoutesAdvanced`, AI `getImpact` or deterministic fallback, reroute scoring, **`emitImpactAlertEvent`** for HIGH severity. |
| `backend/services/incidentImpactService.js` | **`deriveIncidentGeoContext`**, **`loadRoutesDataset`**, **`rankAffectedRoutesAdvanced`**, **`suggestReroutesScored`**, **`suggestReroutesDeterministic`** — deterministic geography + scoring around incidents. |
| `backend/services/aiService.js` | **`getImpact`** → `POST /incidents/impact`. |
| `backend/services/impactAlertService.js` | **`emitImpactAlertEvent`:** dedupe/cooldown, appends JSON lines to `ai-services/data/history/incident_alert_history.jsonl` (commuter alert event log). |

## Backend — planner integration (ETAs when incidents known)

| File | Role |
|------|------|
| `backend/services/plannerService.js` | **`buildImpactProfile`**, **`impactedDelayForRoute`**, used in **`findPathsWithTransfers`** to inflate segment ETAs for HIGH-severity active incidents; optional `active_incidents` on `POST /commute`. |
| `backend/controllers/plannerController.js` | Passes `active_incidents` from body into `planCommute`. |

## AI services — delay / recovery models

| File | Role |
|------|------|
| `ai-services/app/api/incidents.py` | **`POST /incidents/impact`:** encoders + regressors for `delay` and `recovery_time` when artifacts present; else **`_fallback_impact`**. |
| `ai-services/ml_paths.py` | `IMPACT_DELAY_MODEL`, `IMPACT_RECOVERY_MODEL`, `IMPACT_*_ENCODER`, training CSV paths. |
| `ai-services/training/train_incidents.py` | Produces impact models (alongside classifiers). |

## Training data

| File | Role |
|------|------|
| `ai-services/data/impact_train.csv` | Impact model training set (per `ml_paths.py`). |

## Environment

| Variable | Role |
|----------|------|
| `IMPACT_ALLOW_MEDIUM` | When set truthy, allows medium-severity path through impact policy in `estimateImpact`. |
| `IMPACT_ALERT_COOLDOWN_SECONDS` | Cooldown for duplicate alert emission in `impactAlertService.js`. |

## Diagnostic

| File | Role |
|------|------|
| `backend/routes/index.js` | `POST /api/ai/test` includes **`getImpact`** for smoke testing—not the production `/impact` orchestration. |
