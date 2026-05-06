# AI model training & configuration management — code index

**Offline training** scripts, **runtime inference** artifacts, **registry / activate / rollback**, **feature flags**, and **audit** for ML/DevOps workflows.

## Backend — ML ops REST API

| File | Role |
|------|------|
| `backend/app.js` | Mounts **`mlOpsRoutes`** at **`/api/ml`**. |
| `backend/routes/mlOpsRoutes.js` | Protected by **`requireAuth`**, **`requireActiveAccount`**, **`requireRoles(SYSTEM_ADMIN, ML_DEVOPS_ENGINEER)`**. Exposes models, flags, audit, runtime manifest. |
| `backend/controllers/mlOpsController.js` | **`listModels`**, **`registerModel`**, **`activateModel`**, **`archiveModel`**, **`rollbackModel`**, **`setRolloutPercentage`**, **`listFlags`**, **`upsertFlag`**, **`listAuditLogs`**, **`getRuntimeManifest`**; **`activateModel`** / **`rollbackModel`** call **`writeActiveModelManifest`**. |
| `backend/models/ModelRegistry.js` | Stores **`modelKey`**, **`version`**, **`status`** (draft/active/archived), **`artifactPath`**, **`checksum`**, **`rolloutPercentage`**, **`metrics`**, **`featureFlags`**. |
| `backend/models/FeatureFlag.js` | Key/value flags (e.g. **`traffic_prediction_mode`** consumed by **`plannerService.resolveTrafficLevelForPlanning`**). |
| `backend/models/AuditLog.js` | Records ML and flag changes. |

## Runtime manifest (Python picks up models)

| File | Role |
|------|------|
| `ai-services/data/active_model_manifest.json` | Written by **`mlOpsController`** when a model is activated or rolled back; maps **`modelKey`** → **`version`**, **`artifactPath`**, checksum, **`activatedAt`**. |
| `ai-services/app/main.py` | On startup, reads manifest and calls **`congestion_api.configure_runtime_artifacts`** so **congestion** model path can override **`ml_paths`**. |
| `ai-services/app/api/congestion.py` | **`configure_runtime_artifacts`**, **`load_congestion_artifacts`**. |

## AI service inference entrypoints (models trained offline)

| File | Role |
|------|------|
| `ai-services/app/main.py` | ETA + crowding endpoints; loads encoders/models from **`ml_paths`**. |
| `ai-services/app/api/incidents.py` | Classification + impact; **`load_incident_artifacts`**. |
| `ai-services/ml_paths.py` | Canonical paths to all `.pkl` artifacts and training CSVs. |

## Training scripts

| File | Role |
|------|------|
| `ai-services/training/train_eta.py` | ETA regressor + route/stop/traffic encoders. |
| `ai-services/training/train_crowd.py` | Crowding classifier. |
| `ai-services/training/train_congestion.py` | Congestion classifier + segment encoder. |
| `ai-services/training/train_incidents.py` | Incident classifiers, vectorizer, impact regressors, encoders. |
| `ai-services/scripts/generate_ml_datasets.py` | Dataset generation for training pipelines. |
| `ai-services/training/augment_return_training_data.py` | Data augmentation helper for training. |
| `ai-services/training/paths.py` | Training-side path helpers if used by scripts. |

## Frontend (operator UI)

| File | Role |
|------|------|
| `frontend/src/pages/AdminConsole.jsx` | Calls **`/ml/models`** and **`/ml/runtime-manifest`** for registry/manifest display alongside route admin. |
| `frontend/src/App.jsx` | **`/admin`** route with **`ProtectedRoute`** for eligible roles. |

## Observability (related ops surface)

| File | Role |
|------|------|
| `frontend/src/pages/Observability.jsx` | Separate observability dashboard (role-gated); not the ML registry itself but relevant for operations staff. |
| `backend/routes/observabilityRoutes.js` | Backend support for observability features. |

## Environment

| Variable | Role |
|----------|------|
| `AI_SERVICE_URL` | Backend must reach FastAPI to verify inference after deploy or for integration tests. |
