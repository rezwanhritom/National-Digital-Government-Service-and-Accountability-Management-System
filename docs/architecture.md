# Architecture

High-level structure and decisions for NDGSAMS.

## Stack

- **Frontend:** React (Vite), React Router. Runs on port 3000 in development.
- **Backend:** Node.js, Express. MVC structure. Runs on port 5000.
- **Database:** MongoDB (Mongoose ODM).

## Repository layout

```
├── frontend/          # React app (Vite)
├── backend/           # Express API (MVC)
├── docs/              # Guidelines and documentation
└── package.json       # Root scripts only; no root dependencies
```

Dependencies and `node_modules` live only inside `frontend` and `backend`.

## Backend (MVC)

- **Models** – Mongoose schemas and data access (e.g. `backend/models/`).
- **Views** – Optional; primary API is JSON. Use for server-rendered pages or emails if needed.
- **Controllers** – Handle HTTP request/response and orchestrate logic (e.g. `backend/controllers/`).
- **Routes** – Map URLs and methods to controllers (e.g. `backend/routes/`).
- **Middleware** – Auth, validation, error handling (e.g. `backend/middleware/`).
- **Config** – DB connection, env (e.g. `backend/config/`).

## Frontend

- **Views** – Page-level components for each route.
- **Components** – Reusable UI pieces.
- **Services** – API client and external calls (e.g. `frontend/src/services/api.js`).

In development, Vite proxies `/api` and `/health` to the backend so the app talks to one origin.

## Environment

- Backend reads from `backend/.env` (PORT, MONGODB_URI, NODE_ENV, etc.).
- Frontend can use Vite env (e.g. `import.meta.env`) for build-time config; runtime config can be added later if needed.

## Future considerations

- Auth (e.g. JWT, sessions) and role-based access.
- Validation layer (e.g. Joi, express-validator) and request sanitization.
- Logging, monitoring, and error tracking.
- Tests (unit and integration) for backend and frontend.
