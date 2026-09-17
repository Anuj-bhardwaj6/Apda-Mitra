# APDA MITRA (आपदा मित्र) - Enterprise Backend Platform

[![Python 3.12](https://img.shields.io/badge/Python-3.12%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL-16%20%2B%20PostGIS-336791.svg)](https://postgis.net/)
[![Redis 7](https://img.shields.io/badge/Redis-7%20Cache-DC382D.svg)](https://redis.io/)
[![Docker Ready](https://img.shields.io/badge/Docker-Compose%20Ready-2496ED.svg)](https://www.docker.com/)

Production-grade, asynchronous backend foundation for **APDA MITRA**—India's AI-Powered Disaster Intelligence & Citizen Evacuation Platform. Built in technical compliance with National Disaster Management Authority (NDMA) guidelines, integrated with IMD Doppler radar feeds, ISRO Bhuvan satellite GIS, NASA LHASA landslide assessments, and live Open-Meteo spatial telemetry.

---

## Architecture Overview

The system strictly follows the **SOLID Layered Architecture**:
```
HTTP Request ──► Middlewares (Request-ID, Timing, Helmet Headers, Rate Limiting)
                      │
                      ▼
                   Routers (app/api/v1/)
                      │
                      ▼
                   Services (Business Logic, AI Engines, External APIs, GIS)
                      │
                      ▼
                 Repositories (app/db/repositories/ - Clean Data Access Layer)
                      │
                      ▼
              Database / Cache (SQLAlchemy 2.0 Async + PostGIS / Redis 7)
```

---

## Tech Stack & Tooling

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | FastAPI (latest) | High-concurrency asynchronous ASGI API server |
| **Language** | Python 3.12+ | Strictly typed enterprise codebase |
| **Primary Database** | PostgreSQL 16 + PostGIS 3.4 | Relational store with spatial indexing (`ST_DWithin`, geometry) |
| **In-Memory Store** | Redis 7 | Weather caching, prediction caching, JTI token blacklists, OTP |
| **ORM** | SQLAlchemy 2.0 (Async) | Async connection pooling with `asyncpg` and GeoAlchemy2 |
| **Migrations** | Alembic | Automatic version-controlled database schema migrations |
| **Validation** | Pydantic v2 | Strict schema validation and settings parsing |
| **Security** | PyJWT + Passlib (BCrypt) | Access/refresh token rotation, 5-tier RBAC, Helmet headers |
| **Containerization** | Docker & Docker Compose | Multi-stage production container with health checks |

---

## Directory Structure

```
backend/
├── Dockerfile                  # Multi-stage container build with non-root security
├── docker-compose.yml          # PostgreSQL + PostGIS, Redis, and FastAPI Backend
├── requirements.txt            # Production Python dependencies
├── pyproject.toml              # Ruff, Black, isort, and Pytest configuration
├── alembic.ini                 # Database migration configuration
├── .env.example                # Template of all required environment variables
├── app/
│   ├── main.py                 # Application factory, lifespan, CORS, middleware
│   ├── api/
│   │   ├── deps.py             # Reusable dependency injections (DB, Repos, Auth, RBAC)
│   │   └── v1/                 # Versioned API routes
│   │       ├── health/         # System diagnostic probes (DB, Redis, APIs)
│   │       ├── auth/           # Login, Register, JWT Rotation, OTP Verification
│   │       ├── users/          # Profiles, Jurisdictions, Telemetry
│   │       ├── weather/        # Real-time telemetry, hourly forecast, IMD radar
│   │       ├── geocoding/      # Nominatim reverse geocode & search
│   │       ├── gis/            # Inundation layers, risk heatmaps, OSRM routing
│   │       ├── ai/             # Multi-hazard risk index, trajectory, SHAP explainability
│   │       ├── alerts/         # Official NDMA bulletins and color warnings
│   │       ├── reports/        # Citizen incident reports and officer verification
│   │       ├── shelters/       # Spatial shelter proximity and capacity tracking
│   │       ├── notifications/  # Emergency cell broadcast dispatch (FCM)
│   │       └── officer/        # Administrative command metrics & rescue dispatch
│   ├── core/
│   │   ├── config.py           # Pydantic v2 BaseSettings loading from .env
│   │   ├── database.py         # Async connection pool & engine lifecycle
│   │   ├── redis.py            # Async Redis cache manager with domain helpers
│   │   ├── security.py         # Passlib bcrypt hashing & PyJWT token utilities
│   │   ├── roles.py            # RBAC role hierarchy and permission checking
│   │   ├── auth.py             # Auth dependencies & token decoders
│   │   └── logger.py           # Structured JSON and development logger with Request-ID
│   ├── db/
│   │   ├── base.py             # DeclarativeBase, UUIDPrimaryKeyMixin, TimestampMixin
│   │   ├── models/             # User, Incident, Report, Shelter, Weather, AuditLog
│   │   ├── repositories/       # Generic BaseRepository & specialized CRUD classes
│   │   └── migrations/         # Async Alembic migrations and initial schema
│   ├── schemas/                # Pydantic request/response schemas & global ApiResponse
│   ├── services/
│   │   ├── external/           # Open-Meteo, Nominatim, OSRM, Overpass, IMD, NASA, ISRO, FCM
│   │   ├── ai/                 # RiskEngine, PredictionEngine, RecommendationEngine, ShapEngine
│   │   └── gis/                # GeoUtils (Haversine/geodesic), MapService, Routing
│   ├── middleware/             # Request-ID, Timing, Helmet Headers, Rate Limiting
│   └── exceptions/             # Domain exceptions and centralized ApiResponse handlers
└── tests/                      # Pytest suite testing health, auth, weather, AI, and GIS
```

---

## Quickstart with Docker Compose

To launch the complete infrastructure (PostgreSQL 16 with PostGIS, Redis 7, and FastAPI Backend):

```bash
cd backend
docker compose up --build -d
```

Check container status:
```bash
docker compose ps
```

Access Interactive API Documentation:
- **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Diagnostic Endpoint:** [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

---

## Local Development Setup

### 1. Prerequisites
- Python 3.12+
- PostgreSQL 16 with PostGIS extension enabled
- Redis 7

### 2. Create Virtual Environment & Install Dependencies
```bash
cd backend
python -m venv .venv

# On Windows:
.venv\Scripts\activate
# On Linux / macOS:
source .venv/bin/activate

pip install -r requirements.txt
```

### 3. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 4. Apply Database Migrations
```bash
alembic upgrade head
```

### 5. Launch the Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## Role-Based Access Control (RBAC) Matrix

| Endpoint / Operation | Citizen | Volunteer | District Officer | State Officer | NDMA Admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| View Active Alerts & Weather | ✅ | ✅ | ✅ | ✅ | ✅ |
| Submit Field Emergency Report | ✅ | ✅ | ✅ | ✅ | ✅ |
| Calculate Safe Evacuation Route | ✅ | ✅ | ✅ | ✅ | ✅ |
| Update Shelter Occupancy | ❌ | ✅ | ✅ | ✅ | ✅ |
| Verify Citizen Incident Reports | ❌ | ❌ | ✅ | ✅ | ✅ |
| Dispatch Search & Rescue Teams | ❌ | ❌ | ✅ | ✅ | ✅ |
| Broadcast Cell Push Notifications | ❌ | ❌ | ✅ | ✅ | ✅ |
| Publish Official Disaster Bulletins | ❌ | ❌ | ✅ | ✅ | ✅ |
| Assign User Administrative Roles | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## Running Automated Tests

Run the full test suite with coverage:
```bash
pytest
```

To run the AI Landslide Subsystem test suite:
```bash
pytest tests/ai/ -v
```

---

## AI Landslide Early Warning Subsystem

The backend features an XGBoost + SHAP machine learning engine specifically trained for slope failure prediction across North East India:
- **Location:** `backend/ai/`
- **Endpoints:** `/api/v1/ai/landslide/*` (predict, predict-batch, model metadata, feature importances, retrain)
- **Datasets:** NASA GLC/COOLR, NASA SRTM 30m DEM, Open-Meteo precipitation, NASA SMAP soil moisture, ESA WorldCover, OpenStreetMap
- **Documentation:** Full technical reference in [`backend/ai/README.md`](file:///c:/Users/Acer/OneDrive/Desktop/Disaster%20MAngement/backend/ai/README.md) and [`backend/ai/docs/`](file:///c:/Users/Acer/OneDrive/Desktop/Disaster%20MAngement/backend/ai/docs/).
