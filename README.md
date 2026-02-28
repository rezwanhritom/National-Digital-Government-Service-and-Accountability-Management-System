# National Digital Government Service and Accountability Management System (NDGSAMS)

MERN stack project with MVC architecture on the backend.

## Stack

- **M**ongoDB – database
- **E**xpress – backend API (Node.js)
- **R**eact – frontend (Vite)
- **N**ode.js – runtime

## Project structure

```
├── client/                 # React (Vite) frontend
│   ├── public/
│   └── src/
│       ├── components/
│       ├── views/
│       └── services/       # API client
├── server/                 # Express backend (MVC)
│   ├── config/             # DB and app config
│   ├── controllers/
│   ├── middleware/
│   ├── models/             # Mongoose models
│   ├── routes/
│   ├── views/              # Optional server-side views
│   ├── app.js
│   └── server.js
├── package.json            # Root scripts
└── README.md
```

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

## Setup

1. **Clone and install dependencies**

   ```bash
   npm run install:all
   ```

   Or manually:

   ```bash
   npm install
   cd server && npm install
   cd ../client && npm install
   ```

2. **Environment**

   Ensure `server/.env` exists with:

   - `NODE_ENV` – development | production
   - `PORT` – server port (default 5000)
   - `MONGODB_URI` – e.g. `mongodb://localhost:27017/ndgsams`

## Run

- **Backend only:** `npm run server` (API at http://localhost:5000)
- **Frontend only:** `npm run client` (app at http://localhost:3000)
- **Both:** `npm run dev`

## Scripts

| Command           | Description                    |
|-------------------|--------------------------------|
| `npm run dev`     | Start server + client together |
| `npm run server`  | Start Express API              |
| `npm run client`  | Start Vite dev server          |
| `npm run build`   | Build React for production     |
| `npm run start`   | Start server only (production) |

## API

- Health: `GET http://localhost:5000/health`
- API base: `http://localhost:5000/api`

The React app proxies `/api` and `/health` to the backend when using `npm run client` / `npm run dev`.
