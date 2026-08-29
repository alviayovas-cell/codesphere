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

Implemented so far:
- Frontend scaffold (React + TypeScript + Vite + Tailwind CSS + React Router) with placeholder pages.
- Backend scaffold (FastAPI) with a health check endpoint and CORS configured for the frontend.

Everything else described in the project specification (auth, learning content, problem bank, Judge0 execution, coding rounds, etc.) is **not yet implemented** and will be added in later phases.

## Prerequisites

- Node.js 20+ and npm
- Python 3.11+

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

## Known Limitations (Phase 1)

- No authentication yet — all pages are public placeholders.
- No database connection yet (MongoDB integration is Phase 2).
- No real content, problems, or coding functionality yet.
