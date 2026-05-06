# AI-based impact estimation — workflow

## 1. Primary endpoint: `POST /api/incidents/impact`

Handled by **`estimateImpact`** in `backend/controllers/incidentController.js`.

### Step 1 — Validate and locate

1. Requires **`category`**, **`severity`**, and location context (coordinates and/or `location` text) like the classify flow.
2. **`deriveIncidentGeoContext`** (`incidentImpactService.js`) loads routes, stops, route geometries; determines **`nearest_stop`**, **`nearest_route_segment`**, **`network_status`**, **`zone`**, **`area`**, and **`affected_routes`** candidates.

### Step 2 — Rank affected routes

3. **`loadRoutesDataset`** reads `ai-services/data/routes.json`.
4. **`rankAffectedRoutesAdvanced`** scores overlap with nearest segment/stop and adjusts by hour spread and incident category.

If no routes match → **422** `impact_context_insufficient`.

### Step 3 — Policy gate

5. **`policy_applied`:** By default only **HIGH** severity runs full impact + alert path; **MEDIUM** only if `IMPACT_ALLOW_MEDIUM` is enabled. Otherwise **202** with `not_triggered` and still returns affected route list.

### Step 4 — AI delay / recovery

6. Build **`aiPayload`:** `location`, `category`, `severity`, `affected_routes`, optional `hour`.
7. Call **`getImpact`** → FastAPI **`POST /incidents/impact`** (`ai-services/app/api/incidents.py`):
   - With artifacts: encodes category/severity, uses route count and hour in feature vector; returns **`delay`**, **`recovery_time`**.
   - Without: **`_fallback_impact`** from severity and route count.

8. On **Axios failure only**, Node applies a **deterministic fallback** for delay/recovery and switches reroute source to deterministic lists.

### Step 5 — Reroutes

9. **`suggestReroutesScored`** picks non-affected routes with suitability scores; if AI impact failed, **`suggestReroutesDeterministic`** replaces the list.

### Step 6 — Commuter alerts (log)

10. For **HIGH** severity, **`emitImpactAlertEvent`** (`impactAlertService.js`) may write a deduplicated event to **`ai-services/data/history/incident_alert_history.jsonl`**. (Downstream push/SMS would consume this; not all are implemented in-repo.)

Response bundles **`affected_route_scores`**, **`delay`**, **`recovery_time`**, **`reroutes`**, **`alert_event`**, **`impact_source`**.

## 2. Commute planner coupling

When a client calls **`POST /api/planner/commute`** with **`active_incidents`**: an array of items with **HIGH** severity, **delay**, and **affected_routes**, then:

1. **`planCommute`** → **`buildImpactProfile`** in `plannerService.js` builds a per-route delay map.
2. During path search, each ride leg applies **`impactedDelayForRoute`** to scale ETAs (capped multiplier), surfacing **`impact_delta`** on legs and totals.

The current **`Planner.jsx`** does not automatically attach `active_incidents`; integration would query open high-severity incidents or the impact API first.

## 3. Order of operations (summary)

**Geo + route scoring (Node) → policy check → AI delay models (Python) or fallback → reroute suggestions → optional alert file append.**
