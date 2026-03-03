# Dhaka Smart Transit & Congestion Intelligence Platform

## Project Description

The Dhaka Smart Transit & Congestion Intelligence Platform is a city-scale web-based system designed to provide commuters with real-time visibility into buses, routes, and congestion conditions while enabling transport authorities and operators to manage performance, incidents, and maintenance through a unified digital infrastructure.

The system integrates live bus tracking, AI-based arrival time prediction, incident reporting, congestion forecasting, and operational analytics into one secure platform to reduce uncertainty, improve punctuality, and increase transparency in Dhaka’s public transport network.

This platform digitizes the complete lifecycle of the following:

- Bus trip operation and monitoring
- Commuter journey planning and alerts
- Public incident and complaint reporting
- Congestion prediction and impact estimation
- Fleet performance, SLA, and maintenance analytics

Instead of operating as separate, disconnected tools for tracking, complaints, and planning, transit data and workflows are handled within one structured, workflow-driven platform.

The system ensures:

- Centralized commuter access to live bus information
- Data-driven ETA and congestion predictions using AI models
- Structured incident and complaint management with full lifecycle tracking
- Role-based operational control for operators and transport officers
- Transparent performance metrics and public accountability dashboards
- Secure handling of GPS data, user accounts, and operational decisions

This project simulates a real-world smart transit operations center for Dhaka using proper system analysis principles, multi-service architecture, defined user roles, normalized database design, and controlled access mechanisms with integrated AI modules.

## Tech Stack (MERN)

### Core Web Stack

- **Frontend:** Next.js (React.js), HTML, CSS, TypeScript
- **Backend API Gateway:** Node.js (NestJS or Express.js)
- **Databases:** PostgreSQL (with PostGIS for geospatial), Redis (caching)
- **Message Broker:** Kafka or RabbitMQ (event-driven GPS and incident pipelines)

### AI & Data Services

- **AI Microservices:** Python (FastAPI) for ETA, crowding, congestion prediction, and incident classification
- **ML Models:**
  - Gradient boosting / neural networks for bus arrival time prediction (ETA) using historical GPS and schedule data
  - CNN/LSTM-style models or gradient boosting for traffic congestion forecasting based on spatial-temporal traffic patterns
  - Text + metadata classifiers for incident categorization and severity scoring

### Authentication & Security

- **Authentication:** JWT-based authentication with refresh tokens, optional Google OAuth
- **Password Security:** bcrypt password hashing
- **Authorization:** Role-Based Access Control (RBAC) following least-privilege best practices
- **Rate Limiting & Security Middleware:** input validation, secure headers, CSRF/XSS/SQLi protections

### External APIs

- **Maps API:** Map provider (e.g., Mapbox / Google Maps) for map tiles and geocoding
- **Email/SMS APIs:** For notifications, alerts, and verification (e.g., SendGrid/Twilio)
- **Weather API (optional):** To enrich congestion and ETA models with weather features
- **Push Notification API (optional):** For mobile/web push alerts on delays and disruptions

The system follows proper REST API architecture behind an API gateway, secure middleware implementation, structured and normalized relational database schema design with geospatial support, asynchronous event processing, and controlled access using role-based access control (RBAC).

## User Roles

### Commuter

- Register and log in
- View nearby stops and live bus locations
- See AI-predicted ETAs and crowding levels
- Plan commutes and compare route options
- Subscribe to alerts for favorite routes and trips
- Submit incidents and complaints about buses and routes
- Track incident status and view history of submissions

### Bus Operator

- Register buses and onboard GPS devices
- View fleet performance and on-time metrics
- Monitor active trips and route adherence
- Receive and manage incidents related to their buses
- Update incident status and add operational notes
- Review maintenance hotspot suggestions for their routes

### Transport Officer / Authority User

- Monitor city-wide congestion map and forecasts
- View route performance, SLA compliance, and missed trips
- Review and manage high-severity incidents and complaints
- Approve and track maintenance actions for problem segments
- Access accountability dashboards and performance reports

### System Administrator

- Manage user accounts and role assignments
- Configure routes, stops, and base schedules
- Manage operator registrations and device/API key issuance
- Monitor system statistics, health, and error rates
- Access and review audit logs of critical actions
- Configure backup, retention, and security policies

### ML/DevOps Engineer (Internal Role)

- Manage AI model training, evaluation, and deployments
- Configure model versions and feature flags
- Monitor model performance and system metrics
- Coordinate rollbacks and experiments

## System Characteristics

- Secure authentication & authorization with JWT, 2FA option for staff
- Role-Based Access Control across commuter, operator, officer, admin, ML/DevOps roles
- Multi-service architecture (tracking, incidents, analytics/AI) behind an API gateway
- Event-driven processing for GPS updates and incident workflows
- AI-driven ETA, congestion, crowding, and incident impact predictions using historical and real-time data
- Structured incident and complaint lifecycle tracking with full history
- Fleet performance and SLA monitoring dashboards with exportable reports
- Secure file and media upload system for incident photos/videos
- Comprehensive audit logging for every critical action and configuration change
- Powerful search and filtering across buses, routes, incidents, and time ranges
- Data export & reporting APIs for planners and researchers
- Session timeout, rate limiting, and anomaly detection on sensitive operations
- Responsive, mobile-first user interface optimized for commuters on smartphones
- Monitoring and observability stack for application performance and reliability

## Target Users

- General commuters in Dhaka using public buses
- Bus operators and fleet managers
- Transport authority officials and city planners
- Traffic management and maintenance teams
- Journalists, researchers, and civic tech organizations analyzing transit data

This project represents a structured, workflow-driven, AI-enhanced full-stack transit management and accountability system aligned with software engineering principles and system analysis & design methodologies. It demonstrates layered/microservice architecture, secure RBAC, real-time data processing, and practical application of machine learning in a realistic smart city context.

## Project structure

```
├── frontend/               # React (Vite) frontend
│   ├── public/
│   └── src/
│       ├── components/
│       ├── views/
│       └── services/       # API client
├── backend/                # Express API gateway (MVC)
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── app.js
│   └── server.js
├── ai-services/            # Python FastAPI – ETA, crowding, congestion, incidents
│   ├── app/
│   │   ├── api/            # ETA, crowding, incidents (classify/impact), congestion
│   │   ├── inference/      # Model loading and prediction
│   │   └── main.py
│   ├── training/           # Notebooks and scripts for training models
│   ├── model_registry/     # Persisted models (e.g. .pkl)
│   ├── requirements.txt
│   └── README.md
├── docs/
│   ├── README.md
│   ├── coding-standards.md
│   ├── api-guidelines.md
│   ├── frontend-guidelines.md
│   ├── git-workflow.md
│   └── architecture.md
├── package.json
└── README.md
```

## Documentation

Guidelines and docs are in **[docs/](docs/)**. See [docs/README.md](docs/README.md) for coding standards, API and frontend guidelines, git workflow, and architecture.

## Run

- **Backend:** `npm run backend`
- **Frontend:** `npm run frontend`
- **Both:** `npm run dev`
- **AI services:** see [ai-services/README.md](ai-services/README.md) (Python, FastAPI; run separately on e.g. port 8000)
