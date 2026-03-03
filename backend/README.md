# Backend

Express API gateway for the Dhaka Smart Transit & Congestion Intelligence Platform. Handles auth, business logic, and (when needed) calls to the AI service for ETA, crowding, congestion, and incident predictions.

## Stack

- Node.js, Express
- MongoDB (Mongoose)
- ES modules

## Structure

- **config/** – DB connection and app config
- **controllers/** – Request handlers and orchestration
- **middleware/** – Error handling, auth, validation
- **models/** – Mongoose schemas
- **routes/** – Route definitions
- **app.js** – Express app setup
- **server.js** – Entry point

## Run

From repo root: `npm run backend`  
From this folder: `npm run dev`
