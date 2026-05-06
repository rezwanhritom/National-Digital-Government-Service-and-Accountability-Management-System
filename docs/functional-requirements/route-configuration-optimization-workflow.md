# Route configuration & optimization — workflow

## 1. Configure routes (admin)

1. Authorized user opens **`AdminConsole.jsx`** (React route **`/admin`**, protected by **`ProtectedRoute`**).
2. Client calls **`GET /api/admin/routes`** → **`routeAdminController.listRoutes`** → MongoDB **`TransitRoute`** sorted by name.
3. Create/update/delete operations hit **`POST`**, **`PUT`**, **`DELETE`** on **`/api/admin/routes`** as implemented in **`routeAdminController.js`**:
   - Each mutation writes an **`AuditLog`** entry (`transit_route.create`, `.update`, `.delete`).

### Effect on the commute planner

4. **`plannerService.loadRoutesDataset`** checks **`TransitRoute`** first.
   - If **≥1** route exists in MongoDB, **only DB routes** are used for graph building and segment enumeration.
   - If **empty or DB error**, **`ai-services/data/routes.json`** is used.

Thus publishing routes through admin **replaces** the static file for planning once data exists.

## 2. Optimization suggestions

1. Client or ops tooling calls **`GET /api/admin/routes/optimization-suggestions`** with optional **`hour`** and **`dow`** query params.
2. **`routeAdminController.getSuggestions`** invokes **`buildOptimizationSuggestions`** (`routeOptimizationService.js`).
3. That service:
   - Calls **`getCongestionCurrent`** (`aiService.js`) → FastAPI **`GET /congestion/current`** for the requested or default hour.
   - Parses **`segment_key`** values (`RouteName|A->B`), buckets **HIGH** / **MEDIUM** counts **per route name**.
   - Emits prioritized **`add_frequency`** suggestions when a route has multiple HIGH segments; **`monitor`** when MEDIUM segments are widespread; **`data_hygiene`** when **no** Mongo routes exist but **`routes.json`** still backs the planner.

Output is advisory JSON for dispatch/planning meetings—not an automatic solver that mutates routes.

## 3. Operational sequence (summary)

**Admin edits TransitRoute → planner reads DB on next request → optimization endpoint periodically queries congestion snapshot → returns human-readable recommendations.**
