# AI-powered commute planner — workflow

End-to-end flow from the browser to models and back.

## 1. Page load and stops list

1. User opens `Planner.jsx`.
2. The page calls `GET /api/planner/stops`.
3. Express routes to `getStops` in `plannerController.js`, which calls `getAllStops()` in `plannerService.js`.
4. `getAllStops()` loads the route dataset (MongoDB `TransitRoute` if available, else `ai-services/data/routes.json`), unions all stop names, sorts them, and returns JSON.

## 2. Plan a trip (`POST /api/planner/commute`)

1. User submits origin, destination, time context (`time` HH:MM or `hour`), `time_type` (`leave_after` or `arrive_by`), and optional `preference`.
2. `postCommute` in `plannerController.js` validates input and calls `planCommute()` in `plannerService.js` with optional `active_incidents` (for high-severity delay shaping when supplied).

### Inside `planCommute`

3. **Traffic context:** `resolveTrafficLevelForPlanning(hour)` reads feature flag `traffic_prediction_mode` from `FeatureFlag`, then calls `getPlannerTrafficLevel` in `aiService.js` → FastAPI `POST /congestion/planner-traffic`. On failure, a heuristic by hour is used (`trafficLevelForHour`).
4. **Per-segment congestion:** `resolveSegmentTrafficLevels` calls `predictCongestion` → `POST /congestion/predict` with all segment keys derived from the route list. Results fill a map `route|A->B → LOW|MEDIUM|HIGH`; on failure, every segment uses the fallback traffic level.
5. **Incident delay profile (optional):** If the client sends `active_incidents` with HIGH severity and delay/affected routes, `buildImpactProfile` builds route-level penalties used later to inflate segment ETAs.

### Path search (`findPathsWithTransfers`)

6. A multi-modal graph search (board, ride forward, transfer penalty, optional walking between nearby stops) explores paths from origin to destination.
7. For each **ride** edge, the service calls in parallel:
   - `getETA` → `POST /eta` with `route`, `from_stop`, `to_stop`, `hour`, `traffic_level` (segment-specific level when available).
   - `getCrowding` → `POST /crowding` with `route`, `stop` (alighting stop), `hour`.
8. Raw ETA is adjusted when an incident penalty applies (`impactedDelayForRoute`), producing `eta_base`, adjusted `eta`, and `impact_delta` on legs.

### Ranking and time semantics

9. Paths are assembled with scores (`computeScore`) mixing ETA, transfers, crowding, walking, and average headway from route metadata.
10. For `arrive_by`, `evaluateTimeType` computes feasible departure time; `planCommute` filters to feasible options only.

### Response shaping

11. Each option includes legs, lines used, crowding summary, suggested departure time for arrive-by, map polylines from `stops.json` / `route_geometries.json`, and metadata (`trafficLevel` is implicit via segment calls).

## 3. Optional simulation UX on the same page

If the user starts a simulation session, `Planner.jsx` calls `/api/planner/sim/*` endpoints handled by `plannerController.js` and `fleetSimulationService.js`—these run alongside the planner but do not replace the AI planning pipeline above.

## Failure modes

- **`AI_SERVICE_URL` unset:** `aiService.js` throws 503; commute planning fails at first ETA call.
- **Unknown route/stop for encoders:** FastAPI returns 400 for `/eta` or `/crowding`; the planner may error during graph expansion.
- **MongoDB unavailable:** Routes fall back to `routes.json`; planning still works if AI is up.
