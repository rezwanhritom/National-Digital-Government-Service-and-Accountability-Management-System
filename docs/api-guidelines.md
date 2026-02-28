# API Guidelines

Conventions for the backend REST API in the `backend` folder.

## Base URL and versioning

- Base path: `/api` (e.g. `GET /api/users`).
- Health check: `GET /health` (no `/api` prefix).
- Version in URL (e.g. `/api/v1/...`) can be introduced later if needed.

## HTTP methods and routes

- **GET** – Read (list or single). No request body.
- **POST** – Create. Body: JSON.
- **PUT / PATCH** – Update. Body: JSON.
- **DELETE** – Delete. No body for single-resource deletes.

Use plural nouns for resources: `/api/users`, `/api/services`, `/api/reports`.

## Request and response

- **Request:** `Content-Type: application/json` for POST/PUT/PATCH; send JSON in the body.
- **Response:** Always JSON. Use consistent structure, e.g.:
  - Success: `{ "data": ... }` or `{ "message": "...", "data": ... }`
  - Error: `{ "message": "Error description" }` (and appropriate HTTP status).

## Status codes

- `200` – Success (GET, PUT, PATCH).
- `201` – Created (POST).
- `204` – No content (e.g. successful DELETE).
- `400` – Bad request (validation, invalid input).
- `401` – Unauthorized (missing or invalid auth).
- `403` – Forbidden (no permission).
- `404` – Not found.
- `500` – Server error (avoid exposing internal details in production).

## Errors

- Use the shared error middleware for consistent error responses.
- In development, extra details (e.g. stack) may be included; in production, return a generic message and log details server-side.

## MVC and routes

- **Controllers** handle request/response and call models or services.
- **Routes** define URL and method and delegate to controller methods.
- **Models** define data shape and persistence (e.g. Mongoose); keep business logic in controllers or a separate service layer if it grows.
