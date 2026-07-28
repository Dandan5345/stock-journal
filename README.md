# Stock Journal

A learning project for building a production-style backend with Python, FastAPI,
SQLAlchemy, PostgreSQL, and Docker. This phase focuses purely on architecture — a
clean, scalable skeleton with no business logic yet.

## Overview

Stock Journal will eventually let a user log and review their stock trades through
a Telegram bot and a Flutter app, backed by a FastAPI REST API. Right now, the
project only contains the foundation: routing, configuration, and a database
connection layer, structured so that real features can be added later without
major refactoring.

## Architecture

The target end-state architecture:

```
GitHub Pages
     │
Telegram Bot
     │
Flutter App
     │
     ▼
Cloudflare Tunnel
     │
     ▼
FastAPI
     │
     ▼
Business Logic (Python)
     │
     ▼
PostgreSQL
```

Today, only the FastAPI → PostgreSQL portion exists, exposed as a REST API and
consumed by a placeholder HTML/CSS/JS frontend. Cloudflare Tunnel, the Telegram
bot, and the Flutter app are future work.

## Folder structure

```
stock-journal/
│
├── app/
│   ├── main.py              # FastAPI application entrypoint
│   ├── core/
│   │   └── config.py        # Environment-based settings
│   ├── api/
│   │   ├── __init__.py      # Aggregates route routers
│   │   └── routes/
│   │       ├── health.py    # GET /health
│   │       └── trades.py    # GET /trades (routing demo only)
│   ├── database/
│   │   ├── database.py      # SQLAlchemy engine/session setup
│   │   └── models.py        # Declarative base for future ORM models
│   ├── schemas/
│   │   └── trade.py         # Reserved for future Pydantic schemas
│   ├── services/             # Reserved for future business logic
│   ├── repositories/         # Reserved for future data-access layer
│   ├── dependencies/         # Reserved for future FastAPI dependencies
│   └── utils/                 # Reserved for future shared helpers
│
├── frontend/
│   ├── index.html            # Placeholder page
│   ├── style.css
│   └── app.js
│
├── docker-compose.yml         # FastAPI + PostgreSQL services
├── Dockerfile                 # FastAPI container image
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```

## Technologies

- **Backend:** Python 3.13+, FastAPI, SQLAlchemy 2.x, Pydantic v2, Uvicorn
- **Database:** PostgreSQL (containerized)
- **Infrastructure:** Docker, Docker Compose
- **Frontend (placeholder):** HTML, CSS, JavaScript — to be replaced by Flutter
- **Version control:** Git + GitHub

## Installation

1. Clone the repository.
2. Copy the example environment file and adjust values as needed:

   ```bash
   cp .env.example .env
   ```

3. (Optional, for running FastAPI outside Docker) Create a virtual environment
   and install dependencies:

   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

## Running with Docker

Starts both the API and PostgreSQL containers:

```bash
docker compose up --build
```

The API will be available at `http://localhost:8000`.

> When running via Docker Compose, set `DATABASE_HOST=postgres` in `.env` so the
> API container resolves the database by its service name rather than
> `localhost`.

## Running FastAPI locally (without Docker)

Requires a PostgreSQL instance reachable using the values in `.env`
(`DATABASE_HOST=localhost` in this case):

```bash
uvicorn app.main:app --reload
```

## Available endpoints

| Method | Path      | Purpose                                   |
|--------|-----------|--------------------------------------------|
| GET    | `/health` | Health check — returns `{"status": "ok"}` |
| GET    | `/trades` | Routing placeholder — no data yet          |

## Future roadmap

- Trade CRUD (create, read, update, delete) with a proper repository layer
- Yahoo Finance integration for live price data
- Authentication and user accounts
- Portfolio calculations and reporting
- Telegram bot integration
- AI-assisted trade insights
- Cloudflare Tunnel for exposing the API
- Flutter app replacing the placeholder frontend
