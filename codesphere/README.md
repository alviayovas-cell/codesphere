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
**Phase 3: JWT Authentication** — complete.
**Phase 4: Learning Dashboard** — complete.

Implemented so far:
- Frontend scaffold (React + TypeScript + Vite + Tailwind CSS + React Router) with placeholder pages.
- Backend scaffold (FastAPI) with a health check endpoint and CORS configured for the frontend.
- Async MongoDB connection (Motor) wired into the FastAPI app lifespan, with graceful startup if the database is temporarily unreachable.
- Pydantic models for all 10 collections from the design doc (`users`, `learning_modules`, `learning_topics`, `problems`, `test_cases`, `coding_rounds`, `round_sessions`, `submissions`, `autosaves`, `activity_events`).
- A generic `BaseRepository` plus one repository per collection for CRUD access, wired up via FastAPI dependency functions in `app/core/dependencies.py`.
- Indexes created automatically on startup (unique email/registerNumber/slug, lookup indexes on foreign keys, etc.).
- `/api/health/db` endpoint to check live database connectivity.
- JWT authentication: `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/change-password`. Passwords are hashed with bcrypt; tokens carry the user id and role and expire after `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`. Protected routes always resolve the current user from the validated token, never from client-supplied IDs.
- Role-based route protection (`get_current_user` / `get_current_admin_user` FastAPI dependencies).
- Admin-controlled student provisioning: no public registration. `POST /api/admin/students/import` (CSV upload), `GET /api/admin/students`, `POST /api/admin/students/{id}/reset-password` — all admin-only.
- `backend/scripts/create_admin.py` — one-off script to create the very first admin account (there is no UI/API for this by design).
- Frontend: real login form, an `AuthContext` that stores the JWT and current user, `ProtectedRoute`/`RequireAuth` route guards, a change-password page, and a forced redirect to change-password when `mustChangePassword` is true.
- Learning content: `GET /api/learning/modules` (with per-topic and per-module completion for the logged-in student), `GET /api/learning/topics/{id}`, `POST`/`DELETE /api/learning/topics/{id}/complete` to mark/unmark progress, `GET /api/learning/progress` for an overall + per-module summary. All require login (any role).
- Admin learning management: `POST`/`PUT`/`DELETE` on `/api/admin/learning/modules` and `/api/admin/learning/topics` (admin-only). Deleting a module cascades to its topics and any progress records; deleting a topic cascades its progress records.
- A `topic_progress` collection (student × topic completion) — not one of the collections explicitly listed in the design doc's DB design table, but required to persist "mark topic as completed" / progress tracking, which the spec calls for explicitly (section 6).
- `backend/scripts/seed_learning_content.py` — idempotently creates the 10 named C Programming modules from spec section 6, each with one topic and a verified real YouTube reference (freeCodeCamp's full "C Programming Tutorial for Beginners" course, used as a general starting resource — see the script's docstring for why per-topic links weren't fabricated, and refine them via the admin UI).
- Frontend: student dashboard now shows a real progress bar, a "Continue Learning" card pointing at the next incomplete topic, and a link into the full module/topic browser (`/student/learning`, `/student/learning/topics/:id`, with a mark-complete checkbox/button and embedded video where the URL is a recognizable YouTube link). Admin gets a `/admin/learning` page to create/delete modules and topics.

Everything else described in the project specification (problem bank, Judge0 execution, coding rounds, etc.) is **not yet implemented** and will be added in later phases.

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

### Creating the first admin account

There is no public registration and no API for creating the first admin (by design — see spec section 4). Create it directly with the bootstrap script, with the backend's venv activated and a reachable MongoDB configured in `backend/.env`:

```
cd backend
python scripts/create_admin.py --name "Admin" --email admin@example.com --password "ChangeMe123!" --register-number ADMIN001
```

Log in with those credentials, then use the admin dashboard's student CSV import / password reset APIs to provision students from there.

### Seeding the C Programming learning content

With a reachable MongoDB configured, run:

```
cd backend
python scripts/seed_learning_content.py
```

This creates the 10 named modules from the spec (Introduction to C, Variables and Data Types, ... Basic Data Structures), each with one topic. It's safe to re-run — it skips any module that already exists by title.

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

- No CRUD API routes yet for content collections (learning, problems, coding rounds, etc.) — only the repository layer exists; routes are added phase-by-phase as each feature is built (learning in Phase 4, problems in Phase 5, etc.).
- No seed data yet — collections are empty until Phase 5 (problem bank) and later phases populate them.

## Testing Phase 3

1. Create the first admin account with `scripts/create_admin.py` (see above), then start both backend and frontend.
2. Visit `http://localhost:5173/login` and log in as the admin. You should land on `/admin/dashboard` showing "Welcome, &lt;name&gt;".
3. Click "Change Password", submit a new one, and confirm you're redirected back to the dashboard and can log in again with the new password.
4. Log out, then try visiting `http://localhost:5173/admin/dashboard` directly while logged out — you should be redirected to `/login`.
5. From a REST client (or `/docs`), import students via `POST /api/admin/students/import` with a CSV like:
   ```
   Name,RegisterNumber,Email,Class
   Student One,S001,student1@example.com,CSE-A
   ```
   using the admin's bearer token. The response includes each created student's `temporaryPassword` — log in as that student and confirm you're forced to `/change-password` (`mustChangePassword` is `true` until they change it).
6. Try logging in with a wrong password, or calling `GET /api/auth/me` with no/invalid token — both should return `401`.
7. Try calling `GET /api/admin/students` with a **student** token — should return `403`.

## Known Limitations (Phase 3)

- Backend auth/CSV-import/password-reset logic was verified with an in-memory MongoDB mock (`mongomock-motor`, dev-only, not a project dependency) driving the real service and repository code — 20 checks covering login, wrong/unknown credentials, token validation, password change, CSV import (including duplicate/missing-field handling), and admin password reset all passed. It was **not** exercised against a real MongoDB Atlas cluster, since none was available in this environment — please verify against yours.
- The actual browser UI (login form, redirects, change-password flow) was verified via the real HTTP API (login, CORS preflight including the `Authorization` header, protected-route rejections) and a TypeScript build, but not through an actual browser session, since no browser automation is available in this environment. Please click through the flow yourself using the steps above.
- No rate limiting on `/api/auth/login` yet (rate limiting is explicitly scoped to Judge0 Run/Submit in Phase 6 of the spec) — fine for a club-scale deployment but worth knowing before wider exposure.
- Only one role escalation path exists: the bootstrap script. There's no admin UI yet to promote a student to admin or create additional admins through the app itself.
- JWTs are stored in `localStorage`, matching the spec's "Authorization Bearer token" design; if you tighten this later (e.g. httpOnly cookies) note that access-token expiry is 12 hours by default (`JWT_ACCESS_TOKEN_EXPIRE_MINUTES`) — long enough to survive a coding round without matching Phase 8's server-side session timing yet.

## Testing Phase 4

1. Seed the learning content (see above), then start both backend and frontend.
2. Log in as a student and visit `/student/dashboard` — you should see a progress bar (0%), a "Continue Learning" card pointing at the first module's topic, and a "Browse all C Programming modules" link.
3. Visit `/student/learning`, check a topic's checkbox to mark it complete, refresh the page, and confirm it's still checked and the module's `X/Y complete` count updated.
4. Click into a topic (`/student/learning/topics/:id`) — you should see its description, an embedded video player (the seeded video is a real, playable freeCodeCamp course), and a "Mark as Complete"/"Mark as Incomplete" toggle button.
5. Go back to the dashboard — "Continue Learning" should now point at the next incomplete topic.
6. Log in as admin, visit `/admin/learning`, create a new module and a topic under it, then delete the topic and the module — confirm both disappear.
7. As a student, try `POST /api/admin/learning/modules` directly (e.g. via `/docs`) with a student token — should return `403`.

## Known Limitations (Phase 4)

- **No MongoDB server was available in this environment** (same as prior phases). The learning service/repository code (module & topic CRUD, cascade deletes, per-student progress isolation, idempotent complete/uncomplete) was verified with 26 checks against an in-memory Mongo mock (`mongomock-motor`, dev-only), and separately end-to-end through the real HTTP API (login → list modules → mark complete → progress summary → admin create/delete with cascade → role-based 403) using the same mock. It was **not** exercised against a real MongoDB Atlas cluster or through an actual browser session — please verify against yours using the steps above.
- The seeded YouTube link is one verified, real, general C-programming course video reused across all 10 topics (see the seed script's docstring) — it is not a hand-verified link *specific* to each individual topic. Replace per-topic links with ones you trust via `/admin/learning` or the admin API.
- "Upcoming Coding Rounds" and "Recent Activity" on the student dashboard are placeholders — coding rounds don't exist until Phase 8, and there's no activity-log endpoint yet (only aggregate progress).
- The admin Learning Management page supports create/delete for modules and topics, but not inline editing yet (the backend `PUT` endpoints exist and are tested — only the UI form for editing is missing). Editing is possible today via `/docs` or a REST client.
- No drag-and-drop or bulk reordering UI — module/topic `order` is set manually via the numeric field when creating.
