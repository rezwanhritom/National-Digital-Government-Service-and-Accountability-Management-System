# Module 2 Member 1 Functional Requirement 1

## Incident classification & routing system (complete master note)

This document is the full implementation guide and viva-ready explanation for:

> Module 2, Member 1, Functional Requirement 1  
> "The system automatically classifies incidents using rules + AI model, assigns severity, and routes them to the appropriate operator or authority team based on route/zone."

---

## 1) Scope and expected behavior

The system should:

1. Accept incident details (description + location context).
2. Classify incident category automatically.
3. Assign severity (`LOW`, `MEDIUM`, `HIGH`).
4. Detect route and zone impact from location.
5. Route to appropriate authority/operator team.
6. Estimate delay/recovery impact and suggest reroutes.
7. Apply confidence-based trust logic (auto route vs manual review).

---

## 2) Current completion status (core feature)

This FR core is implemented end-to-end for project scope.

Implemented:
- geospatial incident context from coordinates (`latitude`, `longitude`),
- nearest stop and nearest route-segment matching,
- out-of-network validation,
- locality-style area resolution (e.g., `Badda`, `Banasree`, `Rampura`),
- AI + fallback incident classification,
- confidence-aware response and routing mode,
- threshold-based manual review fallback,
- authority assignment using category + severity + route/zone context,
- impact estimation API with affected routes and reroutes,
- training-time dataset rebalance and saved quality metrics.

Deferred intentionally (later tracks):
- full operator lifecycle workflow APIs (`open/assigned/acknowledged/resolved`),
- user/admin/auth control plane,
- advanced production hardening and observability stack.

---

## 3) Architecture overview (request flow)

1. Client submits incident payload.
2. Backend derives geo context (nearest stop/segment, area, zone, network status).
3. Backend calls AI service for category/severity.
4. Backend evaluates confidence + thresholds:
   - confident => auto route,
   - low confidence / fallback => manual review queue.
5. Backend returns classification + routing decision + geo context.
6. Optional impact endpoint computes delay/recovery and reroutes.

---

## 4) Core backend files and responsibilities

### `backend/controllers/incidentController.js`
- `POST /api/incidents/classify` logic:
  - input validation,
  - ambiguous input checks,
  - geo context resolution,
  - confidence/threshold evaluation,
  - authority assignment or manual-review routing.
- `POST /api/incidents/impact` logic:
  - affected routes + reroute suggestions,
  - delay/recovery estimation through AI service.

### `backend/services/incidentImpactService.js`
- loads and caches:
  - `ai-services/data/routes.json`,
  - `ai-services/data/stops.json`,
  - `ai-services/data/route_geometries.json`.
- provides:
  - nearest stop detection,
  - nearest route-segment lookup,
  - network proximity status (`on_network`, `near_network`, `out_of_network`),
  - area derivation from Dhaka locality keywords,
  - affected route extraction and reroute candidate selection.

### `backend/services/aiService.js`
- HTTP client wrapper for AI service endpoints:
  - `/incidents/classify`,
  - `/incidents/impact`.

### `backend/routes/incidentRoutes.js`
- mounts FR classify and impact routes.

---

## 5) Incident reporting support files

### `backend/controllers/incidentsController.js`
- incident submission handling (`/api/incidents/submit`),
- available areas API (`/api/incidents/areas`),
- aligns area selection with allowed locality list.

### `backend/models/Incident.js`
- incident persistence model (when MongoDB is connected),
- includes category, area, geo point, status, media, classification payload storage.

### `backend/routes/index.js`
- exposes:
  - `GET /api/incidents/areas`,
  - `POST /api/incidents/submit`,
  - list/status update endpoints for incidents.

---

## 6) Frontend files and behavior

### `frontend/src/pages/Incident.jsx`
- incident submission form,
- category dropdown,
- area dropdown from backend available areas,
- map-based coordinate picking (Leaflet),
- nearest area auto-selection from coordinates,
- geolocation shortcut and media upload handling.

### `frontend/src/services/api.js`
- API wrappers:
  - `submitIncident`,
  - `getIncidentAreas`.

---

## 7) AI service and training

### `ai-services/app/api/incidents.py`
- classify endpoint:
  - ML model inference if artifacts exist,
  - keyword fallback otherwise,
  - category/severity probabilities in response when available.
- impact endpoint:
  - predicts delay/recovery with model artifacts,
  - fallback estimation if artifacts unavailable.

### `ai-services/training/train_incidents.py`
- trains:
  - TF-IDF + Logistic Regression for category/severity,
  - RandomForest regressors for impact delay/recovery.
- includes:
  - dataset rebalance by `(category, severity)` pair,
  - stratified split,
  - precision/recall/F1 quality checkpoints.
- writes:
  - model artifacts (`.pkl`),
  - `ai-services/models/incident_classification_metrics.json`.

### `ai-services/data/incident_train.csv`
- supervised training data for incident category + severity.

---

## 8) API contract (FR core)

### `POST /api/incidents/classify`

Input:
- `description` (required),
- location context via:
  - `location` text, or
  - `latitude` + `longitude`.

Output includes:
- `category`, `severity`,
- `assigned_to`,
- `routing_mode` (`auto` or `manual_review`),
- `classification_source` (`ml` or `fallback`),
- `confidence`, `confidence_thresholds`, `review_reasons`,
- `affected_routes`,
- `network_status`, `zone`, `area`,
- nearest stop/route-segment details.

### `POST /api/incidents/impact`

Input:
- `category`, `severity`,
- location context (`location` or coordinates),
- optional `hour`.

Output:
- `affected_routes`,
- `delay`,
- `recovery_time`,
- `reroutes`,
- geo context (`network_status`, `zone`, `area`, nearest stop/segment).

---

## 9) Trust logic (Phase 2 behavior)

Decision mode:
- **Auto routing** when confidence is available and above thresholds.
- **Manual review** when:
  - fallback classifier is used, or
  - confidence is missing/below threshold.

Configurable thresholds (optional env):
- `INCIDENT_CATEGORY_CONF_MIN` (default `0.55`)
- `INCIDENT_SEVERITY_CONF_MIN` (default `0.55`)

Ambiguous input handling:
- short or vague descriptions are rejected with `error_code: "ambiguous_input"`.

---

## 10) Validation and measured quality

Latest training run (after targeted data improvements):
- raw rows: `60`,
- balanced rows: `112`,
- category accuracy: `~89.3%`,
- severity accuracy: `~89.3%`.

Saved quality report:
- `ai-services/models/incident_classification_metrics.json`

---

## 11) Current limits (known and accepted)

- incident-to-planner dynamic reranking is not yet integrated in this FR scope,
- full operator lifecycle workflow is deferred to later implementation phase,
- admin/auth/user-control features are intentionally out of current scope.

---

## 12) Viva quick answers

1. **Is this fully AI-based?**  
   No. It is hybrid: AI classification + rule-based routing policy and geo context logic.

2. **What if model files are missing?**  
   Fallback classification still works; system routes to manual review when trust is low.

3. **How is area determined?**  
   From nearest stop/locality logic using coordinates and Dhaka locality keywords.

4. **How does route impact work?**  
   By mapping incident location to affected routes and nearest segment context.

5. **How is trust controlled?**  
   Confidence thresholds decide auto-route vs manual review.

---

## 13) Final status statement

For core project scope, **Module 2 Member 1 Functional Requirement 1 is implemented**:
- incident classification,
- severity assignment,
- route/zone-aware authority routing,
- confidence-based trust control,
- impact estimation and reroute suggestions,
- locality-aware geospatial validation.

Deferred tracks (operator lifecycle + admin/auth/UI expansion) are intentionally planned for later.
