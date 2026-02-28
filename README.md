# National Digital Government Service and Accountability Management System (NDGSAMS)

MERN stack project with MVC architecture on the backend.

## Stack

- **M**ongoDB – database
- **E**xpress – backend API (Node.js)
- **R**eact – frontend (Vite)
- **N**ode.js – runtime

## Project structure

```
├── frontend/               # React (Vite) frontend
│   ├── public/
│   └── src/
│       ├── components/
│       ├── views/
│       └── services/       # API client
├── backend/                # Express backend (MVC)
│   ├── config/             # DB and app config
│   ├── controllers/
│   ├── middleware/
│   ├── models/             # Mongoose models
│   ├── routes/
│   ├── views/              # Optional server-side views
│   ├── app.js
│   └── server.js
├── docs/                   # Guidelines and documentation
│   ├── README.md           # Index of docs
│   ├── coding-standards.md
│   ├── api-guidelines.md
│   ├── frontend-guidelines.md
│   ├── git-workflow.md
│   └── architecture.md
├── package.json            # Root scripts
└── README.md
```

## Documentation

Guidelines and docs are in the **[docs/](docs/)** folder. Start with [docs/README.md](docs/README.md) for an index of coding standards, API and frontend guidelines, git workflow, and architecture.

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

## Setup

1. **Clone and install dependencies**

   ```bash
   npm run install:all
   ```

   Or manually (dependencies live only in `frontend` and `backend`—no root `node_modules`):

   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Environment**

   Ensure `backend/.env` exists with:

   - `NODE_ENV` – development | production
   - `PORT` – server port (default 5000)
   - `MONGODB_URI` – e.g. `mongodb://localhost:27017/ndgsams`

## Run

- **Backend only:** `npm run backend` (API at http://localhost:5000)
- **Frontend only:** `npm run frontend` (app at http://localhost:3000)
- **Both:** `npm run dev`

## Scripts

| Command            | Description                     |
|--------------------|---------------------------------|
| `npm run dev`      | Start backend + frontend together |
| `npm run backend`  | Start Express API               |
| `npm run frontend` | Start Vite dev server           |
| `npm run build`    | Build React for production      |
| `npm run start`    | Start backend only (production) |

## API

- Health: `GET http://localhost:5000/health`
- API base: `http://localhost:5000/api`

The React app proxies `/api` and `/health` to the backend when using `npm run frontend` / `npm run dev`.
