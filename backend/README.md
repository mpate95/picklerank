# PickleRank Backend

Initial FastAPI backend scaffold for PickleRank. This Phase 0 setup includes:

- FastAPI application bootstrap
- `/health` endpoint
- SQLAlchemy 2.0 session/engine configuration
- Alembic migration setup
- PostgreSQL via Docker Compose

## Prerequisites

- Python 3.11+
- Docker Desktop or compatible Docker runtime

## Local setup

### Full stack with Docker Compose

From the repository root:

```bash
docker compose up --build
```

This starts:

- Postgres on `localhost:5432`
- FastAPI on `localhost:8000`
- Next.js on `localhost:3000`

The backend runs `alembic upgrade head` on startup, and both app containers mount your local source tree so code changes reload automatically.

Default local admin credentials:

- username: `admin`
- password: `changeme-admin-password`

Useful commands:

```bash
docker compose down
docker compose down -v
docker compose logs -f backend
docker compose logs -f frontend
```

Use `docker compose down -v` when you want a clean short-lived environment with a fresh database.

### Backend-only local setup

1. Create a virtual environment and install dependencies:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

2. Copy the environment file and adjust values if needed:

```bash
cp .env.example .env
```

3. Start PostgreSQL from the repository root:

```bash
docker compose up -d postgres
```

4. Run the initial migration:

```bash
cd backend
alembic upgrade head
```

5. Start the API:

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://127.0.0.1:8000` and the health check at `http://127.0.0.1:8000/health`.

### Frontend outside Docker

If you want to run the frontend on your host machine while keeping Postgres and the API in Docker:

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

The frontend proxy will forward `/api/*` requests to the backend URL in `API_BASE_URL`.

## Implemented endpoints

- `GET /health`
- `GET /players`
- `POST /players`
- `GET /players/{player_id}`
- `PATCH /players/{player_id}`
- `DELETE /players/{player_id}`
- `GET /sessions`
- `POST /sessions`
- `GET /sessions/{session_id}`
- `PATCH /sessions/{session_id}`
- `DELETE /sessions/{session_id}`
- `GET /matches`
- `POST /matches`
- `GET /matches/{match_id}`
- `PATCH /matches/{match_id}`
- `DELETE /matches/{match_id}`
- `GET /rankings/current`
- `GET /rankings/history/{player_id}`
- `GET /rankings/history`
- `GET /stats/players`
- `GET /stats/players/{player_id}`
- `GET /stats/teams`
- `GET /dashboard/summary`

## Running tests

```bash
cd backend
pytest
```

## Production deploy

Recommended setup:

- frontend on Vercel
- backend API on Render
- Postgres on Render

Deployment guide:

- [DEPLOY.md](/Users/michael/Documents/chatgpt/picklerank/DEPLOY.md)

## Database notes

- Connection settings come from `backend/.env`.
- SQLAlchemy uses the `psycopg` driver with a URL of the form `postgresql+psycopg://...`.
- In production, you can set `DATABASE_URL` directly and the app will normalize it for SQLAlchemy.
- The Alembic history currently includes the base setup plus players, player ratings, sessions, matches, and rating events.
