# Route configuration & optimization — code index

Administrative **CRUD** for routes/stops/scheduling metadata and **heuristic optimization suggestions** driven by congestion snapshots and demand-related signals.

## Frontend

| File | Role |
|------|------|
| `frontend/src/pages/AdminConsole.jsx` | Loads **`GET /admin/routes`** for listing/editing transit routes (transport_officer / system_admin / ml_devops per route guard). |

## Backend — route administration API

| File | Role |
|------|------|
| `backend/app.js` | Mounts **`routeAdminRoutes`** at **`/api/admin/routes`**. |
| `backend/routes/routeAdminRoutes.js` | Auth + RBAC; **`GET /`**, **`GET /:id`**, **`POST /`**, **`PUT /:id`**, **`DELETE /:id`**, **`GET /optimization-suggestions`**. |
| `backend/controllers/routeAdminController.js` | CRUD on **`TransitRoute`**; **`getSuggestions`** delegates to **`buildOptimizationSuggestions`**. |
| `backend/models/TransitRoute.js` | Stores **`name`**, **`stops[]`**, **`scheduleNote`**, **`headwayMinutes`**, **`serviceWindowStart`**, **`serviceWindowEnd`**. |
| `backend/services/routeOptimizationService.js` | **`buildOptimizationSuggestions`:** reads live congestion via **`getCongestionCurrent`**, aggregates HIGH/MEDIUM segments per route, emits **`add_frequency`**, **`monitor`**, **`data_hygiene`** suggestions; uses **`TransitRoute.countDocuments`** and **`loadRoutesDataset`** from **`plannerService.js`** to detect DB-vs-file drift. |
| `backend/services/plannerService.js` | **`loadRoutesDataset`** — **when MongoDB has routes, admin data drives the commute planner**; otherwise falls back to **`ai-services/data/routes.json`**. |
| `backend/services/aiService.js` | **`getCongestionCurrent`** for optimization heuristics. |
| `backend/models/AuditLog.js` | Audit entries for route create/update/delete (referenced from controller). |

## Shared static data (fallback / enrichment)

| File | Role |
|------|------|
| `ai-services/data/routes.json` | Default topology when **`TransitRoute`** collection is empty; optimization service warns when DB is empty but file exists. |
| `ai-services/data/stops.json` | Stop inventory used across planner and incident/geo modules (not edited via this admin surface today). |

## Auth

| File | Role |
|------|------|
| `backend/middleware/authMiddleware.js` | JWT + active account checks on admin routes. |
| `backend/constants/roles.js` | **`SYSTEM_ADMIN`**, **`TRANSPORT_OFFICER`** allowed for route admin API. |
