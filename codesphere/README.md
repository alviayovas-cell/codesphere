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
**Phase 5: Coding Problem Bank** — complete.
**Phase 6: Monaco Editor and Judge0** — complete.
**Phase 7: Redis and RQ Queue** — complete.

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
- Coding problem bank: `GET /api/problems` (summary list) and `GET /api/problems/{id}` (full statement + **public test cases only**) for students. Admin gets full CRUD — `POST`/`GET`/`PUT`/`DELETE /api/admin/problems/{id}` and `POST /api/admin/problems/{id}/test-cases`, `PUT`/`DELETE /api/admin/test-cases/{id}` — with the admin view showing every test case (public and hidden) and its visibility. Hidden test cases are never included in any student-facing response, even structurally (`ProblemPublic` has no field that could carry one).
- `backend/scripts/seed_problems.py` — idempotently creates the 10 named Data Structures problems (DS01-DS10) from spec section 8, each with 2 public and 5 hidden test cases, real problem statements, and verified-correct expected outputs (see Known Limitations below for how these were verified).
- Frontend: `/student/problems` (sortable table of problems). Admin gets `/admin/problems` (list/create/delete) and `/admin/problems/:id` (add/remove test cases, tagged public/hidden).
- Judge0 integration (`app/services/judge_service.py`): the backend never executes student code itself — every run goes to a configured Judge0 instance over HTTP (base64-encoded payloads, `wait=true`), with retries on transient network failures. Defaults to the free public **Judge0 CE demo instance** (`ce.judge0.com`) so the app works out of the box, but that instance is rate-limited and explicitly **not** meant for a real coding event — point `JUDGE0_API_URL` (and `JUDGE0_API_KEY`/`JUDGE0_API_HOST` if using RapidAPI) at your own instance before one.
- Rate limiting per spec section 11: 5 Run Code and 3 Submit Code requests per minute per student, enforced by an in-memory sliding-window limiter (`app/core/rate_limit.py`) returning `429` with a `Retry-After` header, checked at enqueue time.
- Frontend: `/student/problems/:id` is the full coding interface — problem statement on the left, a Monaco editor (C syntax, default template) with an editable Input box and Run/Submit buttons on the right, and an output panel showing verdict, stdout/stderr/compile errors, time/memory, or (for Submit) score and a per-test-case pass/fail list. Code drafts persist per-problem in `localStorage` across navigations.
- **Redis + RQ job queue** (spec section 12): `POST /api/code/run` and `POST /api/code/submit` no longer execute inline — they enqueue a job and return `{jobId, status: "queued"}` immediately; the frontend polls `GET /api/code/jobs/{jobId}` (via `pollJob` in `services/api.ts`) until it's `completed` or `failed`. The actual Judge0 call and MongoDB write happen in a separate worker process (`app/workers/jobs.py`), never on the FastAPI request-handling process, so a burst of Run/Submit requests can't block the web server or each other.
- **Priority queues**: three RQ queues — `final_submit` > `auto_submit` > `run_code` — with a worker started via `python -m app.workers.run_worker` listening to them in that order (spec: "Final assessment submissions must have higher priority than normal Run Code requests"). Today's practice-mode Submit Code already uses the `final_submit` queue, since it's the same priority tier a round's real final submission will use once coding rounds exist (Phase 8) — no rework needed there. `auto_submit` is reserved for Phase 10.
- **Windows compatibility fix**: RQ's default `Worker` class forks a child process per job (`os.fork()`), which doesn't exist on Windows and would crash immediately. `run_worker.py` detects the platform and uses RQ's `SimpleWorker` (no forking) on Windows.
- Job tracking: RQ's own job states are mapped to the simplified state model from spec section 12 (`queued`/`processing`/`completed`/`failed`), each job is scoped to the student who created it (`meta.student_id`, checked on every status read — a `403` if you try to read someone else's job), and job/network failures get one automatic RQ-level retry on top of `JudgeService`'s own Judge0-level retry.
- `GET /api/health/queue` — reports Redis connectivity, per-queue job counts, and active worker count (spec: "Queue health monitoring").
- The synchronous Judge0 client from Phase 6 gained a twin, `SyncJudgeService` (same payload/response handling, just `httpx.Client` instead of `AsyncClient`) for use inside the synchronous RQ worker process; `SubmissionService` from Phase 6 was removed as dead code now that `app/workers/jobs.py` is the single source of truth for Run/Submit logic.

Everything else described in the project specification (coding rounds, etc.) is **not yet implemented** and will be added in later phases.

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

By default `JUDGE0_API_URL` in `.env` points at the free public Judge0 CE demo instance (`https://ce.judge0.com`), so Run/Submit work immediately with no setup. That instance is shared, rate-limited, and not meant for a real coding event — before one, set `JUDGE0_API_URL` to your own self-hosted or RapidAPI-hosted Judge0 instance (and `JUDGE0_API_KEY`/`JUDGE0_API_HOST` if using RapidAPI).

**As of Phase 7, you also need Redis and at least one worker process for Run/Submit to actually complete** (the API will accept and queue the request either way, but it'll sit at `"queued"` forever without a worker). Install Redis (e.g. via [Memurai](https://www.memurai.com/) or WSL on Windows, `brew install redis` on macOS, or your package manager on Linux), make sure it's running on `localhost:6379` (or update `REDIS_URL` in `.env`), then in a second terminal:

```
cd backend
venv\Scripts\activate
python -m app.workers.run_worker
```

Run more than one worker process (in more terminals) to process jobs concurrently. Check `http://localhost:8000/api/health/queue` to see Redis connectivity, per-queue job counts, and how many workers are listening.

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

### Seeding the Data Structures problem bank

```
cd backend
python scripts/seed_problems.py
```

This creates the 10 named DS01-DS10 problems from the spec, each with 2 public and 5 hidden test cases. Also safe to re-run (skips by slug).

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

## Testing Phase 5

1. Seed the problem bank (see above), then start both backend and frontend.
2. Log in as a student, visit `/student/problems` — you should see a table of 10 problems (DS01-DS10) with topic, difficulty, and marks.
3. Click into "DS04 - Implement Stack Using Array" — you should see the full statement, an example, and exactly **2** public test cases. Confirm there is no hint of hidden test cases anywhere on the page or in the network response (`GET /api/problems/{id}` in devtools should show `publicTestCases` with 2 entries and nothing else test-case-related).
4. Log in as admin, visit `/admin/problems`, click into the same problem — you should see all **7** test cases (2 public + 5 hidden), each tagged. Add a new test case, then delete it.
5. Create a new problem via the "New Problem" form, confirm it appears in both `/admin/problems` and the student's `/student/problems`, then delete it.
6. As a student, try `GET /api/admin/problems/{id}` directly (e.g. via `/docs`) with a student token — should return `403`.
7. Try creating a problem with a slug that already exists (e.g. via `/docs`, `POST /api/admin/problems` with `"slug": "reverse-an-array"`) — should return `409`.

## Known Limitations (Phase 5)

- **No MongoDB server was available in this environment** (same as prior phases). The problem/test-case service logic (CRUD, cascade delete, duplicate-slug rejection, and — critically — that hidden test cases never appear in any student-facing response) was verified with 20 checks against an in-memory Mongo mock, plus the real `seed_problems.py` script was run twice against the same mock to confirm it creates exactly 10 problems with 2 public + 5 hidden test cases each and is idempotent. All of that was then re-verified end-to-end through the real HTTP API (student list/detail, admin create/view/delete, role-based 403). It was **not** exercised against a real MongoDB Atlas cluster or an actual browser — please verify against yours using the steps above.
- The correctness of every seeded expected output was independently checked by writing a separate simulation of each problem's logic in Python and comparing against the hardcoded expected outputs in `seed_problems.py` — this caught and fixed one real bug (DS04's public test case #2 expected the wrong popped value after an overflow). All 70 test case outputs (10 problems × 7 cases) now match their simulations.
- No code editor or Run/Submit yet — problem pages are read-only (statement + public test cases). That's Phase 6 (Monaco Editor and Judge0).
- The admin "New Problem" form doesn't yet support entering examples inline (the backend accepts them via `examples` in the request body) — add them via `/docs` or a REST client for now, or extend the form later.
- `ProblemUpdate`'s `examples` field, if provided, replaces the entire examples list rather than patching individual entries — fine for admin-driven content edits, just not a granular per-example API.

## Testing Phase 6

1. Start both backend and frontend with the default `.env` (uses the free Judge0 CE demo instance — no setup needed).
2. Log in as a student, open any problem (e.g. "DS01 - Reverse an Array") — you should see the statement on the left and a dark Monaco editor with a default `#include <stdio.h>` C template on the right, plus an Input box pre-filled with the problem's first public test case.
3. Write a correct solution, click **Run Code** — within a few seconds you should see a green "Accepted" status with the program's actual output. Edit the Input box to something else and Run again to confirm it re-executes with your custom input.
4. Click **Submit Code** — you should see an overall verdict, a score, "Passed X/Y test cases", and a numbered pass/fail list for every test case (including the 5 hidden ones) — but never their actual input/expected content.
5. Write deliberately broken code (e.g. delete a `;`) and Run — you should see a red "Compilation Error" with the compiler's actual error text.
6. Click Run 6 times within a minute — the 6th should show a rate-limit error. Click Submit 4 times within a minute — the 4th should show a rate-limit error.
7. Check `GET /api/results` doesn't exist yet — Submit's result is only shown inline right after submitting; a dedicated results/history page is Phase 11.

## Known Limitations (Phase 6)

- **No MongoDB server was available in this environment** (same as prior phases) — the DB layer was exercised via the in-memory Mongo mock, as in earlier phases. **Unlike** earlier phases, though, Judge0 itself was **not** mocked: every check below made a real network call to the live public Judge0 CE demo instance (`ce.judge0.com`).
  - `JudgeService` was verified against real Judge0 for all 5 verdict types it needs to distinguish — Accepted (both with and without `expected_output`), Wrong Answer, Compilation Error, Runtime Error (segfault), and Time Limit Exceeded (infinite loop) — 8/8 checks passed.
  - The full `SubmissionService` orchestration (Run with custom stdin, Submit running all test cases in parallel, the compile-error short-circuit, all-or-nothing scoring, and `Submission` persistence) was verified end-to-end against real Judge0 with a correct solution, a subtly wrong one, and a broken one — 18/18 checks passed, and along the way caught that a "wrong" test fixture I wrote actually passed one edge case legitimately (a 1-element array reversed equals itself) rather than being a bug.
  - The rate limiter was unit-tested in isolation (9/9 checks) and then re-verified through the real running HTTP server (12/12 checks, including an actual `429` after 5 Run / 3 Submit calls in a minute).
  - **Not** verified against a real MongoDB Atlas cluster or through an actual browser session (no browser automation available here) — please click through the steps above yourself.
- **Judge0 CE demo instance caveats**: `ce.judge0.com` is public, shared, and rate-limited by Judge0 itself (separately from CodeSphere's own per-student limits) — expect occasional slowness or failures under heavy use, and switch to your own instance before a real event, as the TTD requires.
- Rate limiting is in-memory and per-process (see `app/core/rate_limit.py` docstring) — correct for a single Uvicorn worker, but won't coordinate across multiple workers or machines. Phase 7's Redis introduction is the natural place to make this distributed.
- All-or-nothing scoring: a submission gets full marks only if every test case (public and hidden) passes, otherwise 0 — the spec doesn't define partial credit, so this was the simplest defensible interpretation. Straightforward to change later if partial credit is wanted.
- No results/history page yet (`GET /api/results` is Phase 11) — a Submit's outcome is only shown inline on the page where you submitted it, though every submission is persisted to MongoDB already.
- The Monaco editor always uses the `vs-dark` theme regardless of the site's light/dark mode — a minor cosmetic inconsistency, not a functional issue.

## Testing Phase 7

1. Start Redis, start the backend, start at least one worker (`python -m app.workers.run_worker`), and the frontend.
2. Visit `http://localhost:8000/api/health/queue` — expect `{"status": "ok", "redis": "connected", "queues": {"final_submit": 0, "auto_submit": 0, "run_code": 0}, "workers": 1}` (worker count matches however many `run_worker.py` processes you started).
3. Log in as a student, open a problem, click **Run Code** — the button should briefly show "Queued..." then "Executing..." before landing on the result, same as Phase 6's behavior from the outside, but now backed by the queue. Watch the worker's terminal — you should see it log the job being picked up and completed.
4. Stop the worker process, click Run Code again — the button should sit on "Queued..." indefinitely (nothing is processing it). Restart the worker — the request should complete shortly after, without you needing to click anything again (still polling from before).
5. In `/docs`, check `GET /api/code/jobs/{jobId}` with someone else's job id (or just an unauthenticated/different-student token) — should return `403`.
6. Rate limiting still applies exactly as in Phase 6 (checked at enqueue time, before the job ever reaches Redis).

## Known Limitations (Phase 7)

- **No real Redis or MongoDB server was available in this environment.** Verification used a genuinely separate-process setup wherever it mattered:
  - **Real RQ + a real (TCP-listening) fake Redis server** (`fakeredis.TcpFakeServer`, not an in-process mock — a real socket other processes can connect to) **+ real Judge0** (`ce.judge0.com`, live network) **+ a shared in-memory Mongo substitute**: basic Run and Submit jobs end-to-end (13/13 checks, including confirming a `Submission` document actually lands in the shared store), and — most importantly — the **priority ordering itself**: 3 Run Code jobs enqueued, then 1 Submit Code job, all before a `SimpleWorker` listening to all three queues (exactly as `run_worker.py` does) started; the Submit job, despite being enqueued last, was processed **first**, ahead of two of the three earlier Run jobs. That's the core spec-11 requirement working correctly, not assumed.
  - **The actual FastAPI route layer** (enqueue → `jobId` → poll → result, ownership checks, 404s, rate limiting) was separately verified via `TestClient` against a real Judge0-backed worker run — 10/10 checks.
  - **The literal shipped command**, `python -m app.workers.run_worker`, was run as a real subprocess (not imported/monkeypatched) against the fake Redis server and confirmed it connects and logs `*** Listening on final_submit, auto_submit, run_code...` — i.e., the exact instructions in this README actually work.
  - **Not** verified against real Redis or real MongoDB Atlas, or through an actual browser session — please run through the steps above with your own infrastructure.
- **Found and fixed a real Windows compatibility bug during verification**: RQ's default `Worker` class calls `os.fork()` per job, which doesn't exist on Windows and crashes immediately (`AttributeError: module 'os' has no attribute 'fork'`) — confirmed by hitting it directly. `run_worker.py` now uses RQ's `SimpleWorker` (no forking) on Windows via a `sys.platform` check.
- The fake Redis server's pub/sub emulation isn't fully wire-compatible with real Redis — burst-mode workers connected to it over TCP took several minutes to shut down cleanly (retrying a pub/sub operation with backoff) even though the jobs themselves completed in seconds. This is specific to the *test* server, not application code; a real Redis instance doesn't have this issue, and it doesn't affect the continuous (non-burst) mode `run_worker.py` actually runs in.
- Job results are kept in Redis for `JOB_RESULT_TTL_SECONDS` (default 1 hour) via RQ's `result_ttl` — after that, `GET /api/code/jobs/{id}` will 404 even for a job that really did complete. Submissions are still safely in MongoDB either way; only the ephemeral job-result cache expires.
- Rate limiting is still the in-memory, per-process limiter from Phase 6 (unchanged) — it governs the *enqueue* step, not queue processing itself, so it still doesn't coordinate across multiple FastAPI processes. Redis now exists in the stack and would be a natural backing store for a distributed version, but that wasn't required by this phase's spec and wasn't built.
- No job cancellation endpoint — once enqueued, a job runs to completion (or its timeout) even if the student navigates away; the frontend just stops polling.
