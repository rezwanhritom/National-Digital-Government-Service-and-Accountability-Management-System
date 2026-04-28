# Module 2 Member 1 Functional Requirement 2

## AI-based impact estimation system (complete master note)

This document is the full, viva-ready explanation of **Module 2 → Member 1 → Functional Requirement 2**:

> For high-severity incidents, AI estimates affected routes and likely delay duration, suggests reroutes, updates ETAs, and generates commuter alerts automatically.

Use this as your primary memorization and defense sheet.

---

## 1) What this feature does (in plain language)

When an incident is reported with location/category/severity:

1. The system determines which routes are likely affected.
2. AI estimates likely delay and recovery time.
3. The backend suggests reroute options.
4. Planner ETAs can be adjusted using active incident impacts.
5. For high-severity incidents, commuter alert events are generated with dedup/cooldown.

So this is the “what will happen to service quality now?” layer.

---

## 2) Tech stack and architecture

- **Backend API:** Node.js + Express (`backend/`)
- **AI service:** Python FastAPI (`ai-services/`)
- **ML artifacts:** impact models and encoders (`.pkl`)
- **Data inputs:** routes, stops, route geometries, impact training CSV
- **Alert persistence:** JSONL history in `ai-services/data/history/`

Architecture style:
- Backend prepares context and policy decisions.
- AI service predicts delay/recovery.
- Backend enriches output with route ranking, reroutes, ETA impact, and alert events.

---

## 3) End-to-end workflow (request lifecycle)

1. Client calls `POST /api/incidents/impact`.
2. Backend validates category/severity/location context.
3. Backend derives geo context and candidate affected routes.
4. Backend applies policy:
   - high severity => auto impact mode,
   - medium severity => optional opt-in via env.
5. AI `/incidents/impact` returns delay/recovery (or deterministic fallback if unavailable).
6. Backend returns:
   - ranked affected routes,
   - delay/recovery,
   - scored reroutes,
   - policy/trigger metadata,
   - optional high-severity alert event metadata.
7. Planner can consume active incidents to adjust ETA outputs (`eta_base`, `eta_adjusted`, `impact_delta`).

---

## 4) Backend files and responsibilities

### `backend/controllers/incidentController.js`

- `estimateImpact` is the core orchestrator for this FR.
- Handles:
  - policy hardening (`HIGH` auto, `MEDIUM` opt-in),
  - insufficient-context rejection,
  - ranked affected-route response,
  - AI impact call + deterministic fallback,
  - reroute scoring and source tagging,
  - alert generation trigger.

### `backend/services/incidentImpactService.js`

Provides core logic for:
- geo context derivation,
- nearest stop/segment route inference,
- ranked affected routes,
- time-aware spread factor,
- incident-type multipliers,
- scored reroutes,
- deterministic fallback reroutes.

### `backend/services/impactAlertService.js`

Alert engine for high-severity impact outputs:
- builds alert payload,
- dedup by fingerprint,
- cooldown control (`IMPACT_ALERT_COOLDOWN_SECONDS`),
- writes alert history JSONL.

### `backend/services/aiService.js`

AI client wrapper:
- `getImpact` -> FastAPI `/incidents/impact`.

### Planner integration files

- `backend/controllers/plannerController.js`
  - accepts `active_incidents` input.
- `backend/services/plannerService.js`
  - applies route-level impact penalties to ETA,
  - returns base vs adjusted ETA values.

---

## 5) AI service files and responsibilities

### `ai-services/app/api/incidents.py`

- `/impact` endpoint:
  - uses trained impact models when available,
  - fallback formula when artifacts are missing,
  - predicts:
    - `delay`,
    - `recovery_time`.

### `ai-services/training/train_incidents.py`

- trains and saves:
  - impact delay model,
  - impact recovery model,
  - category/severity encoders for impact model.

---

## 6) Data and artifacts used

- `ai-services/data/impact_train.csv`
  - training rows for delay/recovery prediction.
- `ai-services/data/routes.json`
  - route names and stop lists.
- `ai-services/data/stops.json`
  - geo anchors for stop proximity.
- `ai-services/data/route_geometries.json`
  - route landmarks for segment-level context.
- `ai-services/models/impact_delay_model.pkl`
- `ai-services/models/impact_recovery_model.pkl`
- `ai-services/encoders/impact_category_encoder.pkl`
- `ai-services/encoders/impact_severity_encoder.pkl`
- `ai-services/data/history/incident_alert_history.jsonl`
  - persisted alert event log.

---

## 7) API contract and output behavior

## A) `POST /api/incidents/impact`

Input:
- `category`,
- `severity`,
- `location` or coordinates (`latitude`, `longitude`),
- optional `hour`.

Output includes:
- `policy_applied`, `trigger_reason`,
- `affected_routes`,
- `affected_route_scores`,
- `delay`, `recovery_time`,
- `impact_source`,
- `reroutes`,
- `reroute_source`,
- `network_status`, `zone`, `area`,
- nearest stop/route-segment context,
- `alert_event` metadata (for high severity path).

## B) `POST /api/planner/commute` (impact-aware mode)

Optional input:
- `active_incidents` array.

Relevant output fields per option:
- `eta_base`,
- `eta_adjusted`,
- `impact_delta`,
- `impact_profile_version`.

---

## 8) Policy and fallback logic

Impact policy:
- `HIGH` => always processed in impact mode.
- `MEDIUM` => only if `IMPACT_ALLOW_MEDIUM=true`.

Fallback behavior:
- if AI impact call fails, backend computes deterministic fallback delay/recovery and deterministic reroutes.
- response clearly marks sources:
  - `impact_source`,
  - `reroute_source`.

---

## 9) Alert event logic (core backend)

For high-severity impact results:
- build alert payload with affected routes, delay, recovery, area/zone, nearest context,
- apply dedup + cooldown to avoid spam,
- persist alert line to JSONL history,
- return alert emission metadata in API response.

This is backend alert generation logic (dispatch channels can be added later).

---

## 10) Current implementation status

For core scope, this FR is implemented:
- impact policy hardening,
- ranked affected-route inference with time/category weighting,
- AI impact estimation with deterministic fallback,
- scored reroute suggestions + deterministic fallback reroutes,
- planner ETA adjustment using active incidents,
- backend commuter alert event engine with persistence and dedup.

---

## 11) Known constraints (honest viva points)

- Impact training dataset is still relatively small and can be expanded.
- Delay/recovery outputs are point estimates (no confidence intervals yet).
- Alert generation is implemented; external notification channel dispatch is a later extension.

---

## 12) Viva quick-answer set

1. **Is this only ML?**  
   No, it is hybrid: ML + deterministic policy + fallback logic.

2. **How do you decide when to run impact estimation?**  
   High severity always; medium only if explicitly enabled.

3. **What if AI service fails?**  
   Backend uses deterministic fallback for impact and reroutes and marks response source.

4. **How are affected routes chosen?**  
   Geo context + nearest segment/stop + weighted route-impact scoring.

5. **How do ETAs get updated automatically?**  
   Planner consumes `active_incidents` and returns `eta_base` vs `eta_adjusted`.

---

## 13) Final FR-2 completion statement

For project core scope, **Module 2 Member 1 Functional Requirement 2 is implemented end-to-end**:
- AI-based impact estimation,
- affected-route and reroute intelligence,
- ETA impact integration,
- high-severity commuter alert event generation with dedup and persistence.

This is sufficient to defend FR-2 implementation while keeping user/admin extensions for later phases.

