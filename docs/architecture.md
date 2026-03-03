# Architecture

High-level structure and decisions for the Dhaka Smart Transit & Congestion Intelligence Platform.

## Stack

- **Frontend:** React (Vite), React Router. Runs on port 3000 in development. (Can move to Next.js + TypeScript per product spec.)
- **Backend (API gateway):** Node.js, Express. MVC structure. Runs on port 5000. Orchestrates business logic, auth, and calls to AI services.
- **Database:** MongoDB (Mongoose) today; spec also references PostgreSQL + PostGIS for geospatial and Redis for caching.
- **Message broker (planned):** Kafka or RabbitMQ for event-driven GPS and incident pipelines.
- **AI services:** Separate Python FastAPI microservice(s) for ETA, crowding, congestion prediction, incident classification, and impact estimation. Runs on its own port (e.g. 8000).

## Repository layout

```
├── frontend/          # React app (Vite)
├── backend/           # Express API gateway (MVC)
├── ai-services/       # Python FastAPI – ML inference (ETA, crowding, congestion, incidents)
├── docs/              # Guidelines and documentation
└── package.json       # Root scripts; no root node_modules
```

Dependencies: `node_modules` only in `frontend` and `backend`; Python deps in `ai-services/` via `requirements.txt`.

## Backend (MVC)

- **Models** – Mongoose schemas and data access (`backend/models/`).
- **Controllers** – HTTP request/response, orchestration; call AI service (HTTP client) when predictions are needed.
- **Routes** – Map URLs and methods to controllers (`backend/routes/`).
- **Middleware** – Auth (JWT, RBAC), validation, error handling (`backend/middleware/`).
- **Config** – DB connection, env, and AI service base URL (`backend/config/`).

## AI services (Python FastAPI)

- **app/api/** – Routers: ETA, crowding, incidents (classify, impact), congestion predict.
- **app/inference/** – Load persisted models (e.g. `.pkl`) and run prediction; used by API routes.
- **training/** – Jupyter notebooks and scripts for data extraction, feature engineering, and training. Outputs go to `model_registry/` or object storage.
- **model_registry/** – Persisted model files; production may use object storage and config-driven paths.

Backend calls AI service over HTTP (e.g. `POST /eta`, `POST /crowding`, `POST /incidents/classify`, `POST /incidents/impact`, `POST /congestion/predict`). No direct DB access from AI service in the minimal setup; backend passes in what’s needed.

## Frontend

- **Views** – Page-level components for each route.
- **Components** – Reusable UI pieces.
- **Services** – API client talking to backend (`frontend/src/services/`). Backend proxies to AI service where needed.

In development, Vite proxies `/api` and `/health` to the backend; frontend talks to one origin.

## Data and events (from spec)

- **Core data:** Stops, routes, route_stops, buses, bus_positions (GPS), trips, stop_arrivals, incidents, subscriptions, notifications.
- **Events:** GPS updates and incident lifecycle events can be published to a message queue; workers consume and update aggregates or trigger notifications.
- **AI:** ETA and crowding models use historical trips and schedule data; congestion uses segment-level speed/congestion; incident classifier uses text + metadata; impact estimation uses incident + network context.

## Future considerations

- Auth: JWT, refresh tokens, optional OAuth; RBAC (Commuter, Operator, Officer, Admin, ML/DevOps).
- Validation (e.g. Joi, express-validator) and request sanitization.
- Logging, correlation IDs across backend and AI service, monitoring and error tracking.
- Tests: unit and integration for backend, frontend, and AI service.
- Observability: metrics (e.g. Prometheus), dashboards (e.g. Grafana), and alerting.
