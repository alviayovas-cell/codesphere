# CodeSphere – CSE Coding Learning & Assessment Platform

A web-based learning and coding assessment platform for a college CSE coding club, built around C programming and Data Structures, with timed coding rounds evaluated via Judge0.

This project is being developed in phases. See `docs/` for phase notes as they are added.

## Project Structure

```
codesphere/
  frontend/   React + TypeScript + Vite + Tailwind CSS
  backend/    Python FastAPI
  docs/       Phase documentation
```

## Status

**Phase 1: Project Setup and Architecture** — complete.
**Phase 2: MongoDB Database and Core Models** — complete.

Implemented so far:
- Frontend scaffold (React + TypeScript + Vite + Tailwind CSS + React Router) with placeholder pages.
- Backend scaffold (FastAPI) with a health check endpoint and CORS configured for the frontend.
- Async MongoDB connection (Motor) wired into the FastAPI app lifespan, with graceful startup if the database is temporarily unreachable.
- Pydantic models for all 10 collections from the design doc (`users`, `learning_modules`, `learning_topics`, `problems`, `test_cases`, `coding_rounds`, `round_sessions`, `submissions`, `autosaves`, `activity_events`).
- A generic `BaseRepository` plus one repository per collection for CRUD access, wired up via FastAPI dependency functions in `app/core/dependencies.py`.
- Indexes created automatically on startup (unique email/registerNumber/slug, lookup indexes on foreign keys, etc.).
- `/api/health/db` endpoint to check live database connectivity.

Everything else described in the project specification (auth, learning content, problem bank, Judge0 execution, coding rounds, etc.) is **not yet implemented** and will be added in later phases.

## Prerequisites

- Node.js 20+ and npm
- Python 3.11+
- A MongoDB instance — either local (`mongod` running on `localhost:27017`) or a [MongoDB Atlas](https://www.mongodb.com/atlas) cluster connection string

## Running the project locally

### Backend

```
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

Backend will be available at `http://localhost:8000`, with a health check at `http://localhost:8000/api/health`.

By default `MONGODB_URI` in `.env` points at `mongodb://localhost:27017`. If you don't have MongoDB running locally, edit `backend/.env` and set `MONGODB_URI` to a MongoDB Atlas connection string instead. The API still starts even if the database is unreachable — `/api/health/db` will just report `"unavailable"` until it can connect.

### Frontend

```
cd frontend
npm install
copy .env.example .env
npm run dev
```

Frontend will be available at `http://localhost:5173`.

## Testing Phase 1

1. Start the backend, then visit `http://localhost:8000/api/health` — expect `{"status": "ok", "service": "codesphere-api"}`.
2. Start the frontend, then visit `http://localhost:5173/` — the home page should show a green "Backend: online" indicator (this confirms the frontend can reach the backend and CORS is configured correctly).
3. Navigate to `/login`, `/student/dashboard`, `/admin/dashboard`, and an unknown route (e.g. `/foo`) to confirm routing works.

## Testing Phase 2

1. Start the backend with a reachable MongoDB (local `mongod`, or `MONGODB_URI` pointed at an Atlas cluster).
2. Visit `http://localhost:8000/api/health/db` — expect `{"status": "ok", "database": "mongodb"}`. Without a reachable database this instead returns `{"status": "unavailable", "database": "mongodb"}` (HTTP 200 either way — this endpoint reports status, it doesn't fail the request).
3. Check the server logs on startup for `MongoDB indexes ensured` — confirms indexes were created on all 10 collections.
4. Open the interactive API docs at `http://localhost:8000/docs` to see the `/api/health` and `/api/health/db` routes registered.
5. (Optional, for developers) Import a repository and model in a Python shell to insert/fetch a document, e.g.:
   ```python
   from app.database.mongodb import connect_to_mongo
   from app.core.dependencies import get_learning_module_repository
   from app.models import LearningModule
   await connect_to_mongo()
   repo = get_learning_module_repository()
   created = await repo.insert_one(LearningModule(title="Introduction to C", description="Basics", order=1))
   print(created)
   ```

## Known Limitations (Phase 2)

- No authentication yet — all pages/APIs are public placeholders (Phase 3).
- No CRUD API routes yet for any collection — only the repository layer exists; routes are added phase-by-phase as each feature is built (learning in Phase 4, problems in Phase 5, etc.).
- No seed data yet — collections are empty until Phase 5 (problem bank) and later phases populate them.
- Repository CRUD (insert/find/update/delete) and index creation were validated with an offline model round-trip check, not against a live MongoDB instance, since no MongoDB server was available in the development environment. Verify against your own MongoDB instance using the steps above before relying on it.
