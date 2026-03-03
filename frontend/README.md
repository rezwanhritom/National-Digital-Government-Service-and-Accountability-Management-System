# Frontend

React (Vite) app for the Dhaka Smart Transit & Congestion Intelligence Platform. Commuter and staff UIs: maps, live bus info, commute planning, incidents, and dashboards.

## Stack

- React 18, React Router
- Vite 5
- ES modules

## Structure

- **src/components/** – Reusable UI components
- **src/views/** – Page-level components per route
- **src/services/** – API client (calls backend)
- **src/App.jsx** – App shell and routes
- **src/main.jsx** – Entry point
- **index.html** – HTML shell
- **vite.config.js** – Vite config; proxies `/api` and `/health` to backend in dev

## Run

From repo root: `npm run frontend`  
From this folder: `npm run dev`
