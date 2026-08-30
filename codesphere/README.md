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
**Phase 8: Coding Round System** — complete.
**Phase 9: Smart Question Randomization** — complete.
**Phase 10: Autosave and Assessment Monitoring** — complete.
**Phase 11: Results and Leaderboard** — complete.
**Phase 12: Admin Analytics** — complete.
**Phase 13: Security Review** — complete.
**Phase 14: Load Testing and Production Deployment** — complete.

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
- **Coding round system** (spec section 13): admin creates a round with a title, description, time window, duration, and a pool of problems (`POST`/`GET`/`PUT`/`DELETE /api/admin/rounds`, draft by default — `PUT` with `status: "scheduled"` publishes it). Students see only published rounds (`GET /api/rounds`, question pool hidden until they start), `POST /api/rounds/{id}/start` creates a session (idempotent — re-starting returns the same session, never resets the timer) and assigns every problem in the pool, in order, to every student the same way — Phase 9's "Smart Question Randomization" will replace only the *assignment* logic with a balanced/diversified per-student subset, reusing this same session storage.
- **Server-authoritative timing**: a session's `expiresAt` is computed once at start as `min(now + durationMinutes, round.endTime)`, so a student can never work past the round's global end time even if they start late. There's no background job yet — the server lazily flips an active-but-overdue session to `expired` the next time it's read or acted on (every session read, plus before accepting a submission), which is enough to make the cutoff actually stick everywhere that matters.
- **Session locking**: `POST /api/rounds/{id}/submit` is the "Final Submission" — it locks the session (`submitted`, idempotent), after which further round-scoped submissions return `409`. An expired session is locked the same way, automatically.
- `POST /api/code/submit` gained an optional `roundId` — when present, it's validated against the caller's session (must be `active`, the problem must actually be assigned to them) before being queued, and the resulting `Submission` is tagged with the round. If the round's `resultConfiguration.showResultsDuringRound` is `false` (the default), the live verdict/score/test-case breakdown is redacted from the response (spec section 19's Assessment Mode) — the real graded result is still stored for later, only what's shown to the student during the round is withheld.
- Frontend: `/student/rounds` (list with Start/Continue/View depending on status), `/student/rounds/:id` (question list + live countdown + Finish Round), and `/student/rounds/:id/problems/:id` reuses the same Monaco coding interface from Phase 6/7 with a round-aware header (countdown badge, locked-state messaging, redacted-results messaging). Admin gets `/admin/rounds` (create with a problem picker, publish/unpublish, delete). The dashboard's "Upcoming Coding Rounds" placeholder now shows real data.
- **Found and fixed a real timezone bug during this phase**: PyMongo/Motor return naive datetimes (no tzinfo) unless the client is created with `tz_aware=True` — comparing that against `datetime.now(timezone.utc)` (needed for all the expiry logic above) raises `TypeError`. This hadn't surfaced in earlier phases because none of them did datetime *comparisons* against DB-loaded values. Fixed in both `database/mongodb.py` (the async client) and `workers/jobs.py` (the sync one).

- **Smart Question Randomization** (spec section 14, `app/services/question_assignment_service.py`): a round's admin-set `questionPoolConfiguration` (`easyQuestions`/`mediumQuestions`/`hardQuestions`/`randomizeOrder`, already present in the data model since Phase 2) now actually drives assignment. Every student gets the exact same difficulty mix (fairness), but *which* problem within each difficulty bucket varies — the algorithm always picks the currently least-used problem in that bucket first (ties broken randomly), so usage spreads evenly across the pool over many students instead of everyone getting the same combination (diversity). Question order is shuffled per student when `randomizeOrder` is on.
- **Backward compatible by design**: a round with no pool configuration (all counts 0, the schema default) falls back to Phase 8's original behavior — assign the whole selected pool, in listed order — so existing simple rounds are unaffected; smart assignment is opt-in per round.
- **Pool-size validation at round creation/update**: if the admin asks for more questions of a difficulty than the selected pool actually contains (e.g. 2 hard questions but only 1 hard problem picked), the request is rejected with a clear message rather than silently under-assigning students later.
- Assignment still only ever happens once per (round, student) — `start_round`'s existing idempotency (Phase 8) means refreshing or restarting never re-randomizes what a student already got.
- Frontend: the admin round form gained Easy/Medium/Hard count fields and a randomize-order checkbox (leave all at 0 for the old simple "assign everything" mode), and each round card shows its configured balance when smart assignment is on.

- **Autosave** (spec section 15): `POST /api/rounds/{id}/autosave` upserts one autosave document per (session, problem) — the frontend calls it automatically every 12 seconds while a round question is open (and once more on unmount / question switch / final submit), so there's always a recent snapshot even if the student never clicks Submit. `GET /api/rounds/{id}/autosave/{problemId}` restores it — the editor loads the student's last-autosaved code (not just their last real submission) whenever they return to a question in a round, including after a refresh or a crash.
- **Assessment monitoring** (spec section 16): the frontend listens for the Page Visibility API and window blur/focus, reporting each transition to `POST /api/rounds/{id}/activity`. The server is the sole authority on what counts as a violation — a "left" event (tab hidden / window blurred) is only logged; a violation is decided at the moment the student *returns*, by checking whether the time since their most recent "left" event exceeded the round's configured `gracePeriodSeconds` (a brief alt-tab within the grace period is not penalized). The student sees a warning modal ("violation 1 of 2") the moment one is recorded, using the round's live violation count via the session's new `maxViolations` field.
- **Auto-submit** (completing the gap left open in Phase 8): exceeding `maxViolations` (when `autoSubmitEnabled` is on) immediately locks the session and grades whatever was last autosaved for every assigned question, exactly like a normal Submit but tagged `AUTO_SUBMIT` and run on a new highest-priority `auto_submit` queue tier (above `final_submit`/practice `run_code`). Time-expiry now goes through the exact same code path — previously an expired session just stopped accepting submissions with nothing graded; now it also auto-submits the student's last autosaved code for every question, same as the spec's "when time expires: retrieve latest autosaved code → trigger auto submission."
- **Admin override** (spec section 18): `/admin/monitoring` — pick a round, see every student's session (name, register number, status, violation count, start/expiry time), open a chronological activity log per session (every visibility/focus event, warnings, and the auto-submit event itself), and **Unlock** a `locked`/`expired` session — resets violations to 0, gives a fresh expiry window (`min(now + durationMinutes, round.endTime)`), and logs the override as its own activity event so there's an audit trail of who got a manual restart and when.
- Frontend: a "Before you start" warning modal now appears on `/student/rounds` before a round actually begins (spec: "show a clear assessment warning before they start") — explains the timer can't be paused, that focus loss is monitored and penalized, and that code autosaves. `ProblemDetail` (round mode) shows a clear, non-alarming explanation for each locked reason (`submitted` / `expired` / `locked`) instead of a generic status string, and "Back to round" now flushes a final autosave before navigating away.

- **Results** (spec section 19, `GET /api/results`, `GET /api/results/{roundId}`): once a student's session for a round is submitted/expired/locked, it shows up on their `/student/results` page with a status, total marks, and (once available) their score, rank, and a per-question breakdown - which problem, its difficulty, the verdict and score of their *best* graded attempt (Run Code submissions never count, and a later-but-worse Submit doesn't overwrite an earlier better one). Clicking a row opens the full breakdown in a modal.
- **Results availability policy**: a student can always see that they finished and how many marks a round was worth, but their actual score is withheld until either the round's time window has fully closed, or the admin explicitly turned on `resultConfiguration.showScoreImmediately` for that round - so an early finisher's score can't tip off students still taking the assessment.
- **Leaderboard** (`GET /api/rounds/{roundId}/leaderboard`, `/student/leaderboard`): a round-by-round ranked table (score, marks, completion time - ties broken by who finished first), with the current student's own row highlighted. Unlike a student's own result, the leaderboard *always* waits for the round to fully close, regardless of `showScoreImmediately` - it reveals other students' standing, which is a stronger thing to gate than your own pending score.
- **Ranking**: computed by summing each assigned question's best graded-submission score, sorted score-descending / completion-time-ascending; rank is a plain 1st/2nd/3rd position (no shared ranks on ties - the earlier finisher wins).
- **Admin results** (`GET /api/admin/rounds/{roundId}/results`, `GET /api/admin/rounds/{roundId}/leaderboard`): the same computation, but ungated (always visible, even mid-round) and includes every session regardless of status - a student who's still actively working shows up with their live best-so-far score and no rank yet, not just the ones who've finished. Surfaced in `/admin/rounds` as a "Results" button per published round.
- A `RoundSession` now records `completedAt` the moment it first leaves `ACTIVE` (finished, expired, or auto-submit-locked) - used for leaderboard/result ordering and tie-breaking, and cleared again if an admin unlocks a session for a fresh attempt.
- Frontend: `/student/rounds/:id`'s hub page gained a "View Results" button once the round is no longer active.

- **Admin Analytics** (`GET /api/admin/analytics`, `/admin/analytics`): a single aggregation endpoint over the existing collections - no new persisted state, everything is computed fresh per request (fine at club scale). Covers: an overview stat-tile row (students, problems attempted vs. total, submissions, overall pass rate, active vs. total rounds); a 14-day submission trend (accepted vs. everything else, stacked bar chart); pass rate by difficulty (easy/medium/hard, fixed order); a "weakest topics" ranking by problem topic - a platform-wide, aggregate stand-in for the spec's "advanced weak-topic detection" future enhancement (not a per-student diagnostic); a full problem-performance table (attempts, accepted, pass rate, average score, most-struggled-with first); and per-module learning engagement (average topic-completion across all students, least-engaged module first).
- Every `Submission` document is already a graded attempt by construction (Run Code never writes one - only `submit_code_job` does), so analytics needed no new filtering to exclude ungraded activity.
- Frontend charts are hand-built (no charting library added): a small reusable `RankedBarList` (horizontal bars, single sequential hue or a per-item color, native hover detail) and a `SubmissionTrendChart` (stacked SVG bars with a hover tooltip, a "View as table" fallback, and 2-series legend) - both reuse the app's existing design tokens (primary/secondary/zinc, and the same green/amber/red difficulty colors already used by `DifficultyBadge`) rather than introducing a new palette.

- **Security review** (TTD Phase 6 scope: "Security review... for production deployment"). A manual, whole-codebase audit (not just a diff review, since every prior phase already merged straight to `main`) found and fixed three concrete issues - see "Security Review Findings (Phase 13)" below for the full writeup:
  1. **JWT secret had an insecure, publicly-known fallback with no production guard.** `Settings` now refuses to start (`RuntimeError`, fails at import time - before the API, a worker, or any script can run) if `ENVIRONMENT != "development"` and `JWT_SECRET_KEY` is still the shipped placeholder.
  2. **Password changes/resets didn't invalidate already-issued tokens.** Access tokens now carry an `iat` claim; `get_current_user` rejects any token issued before the account's last password change (`User.updatedAt`, which only ever changes on a password change/reset). Tokens issued before this fix (no `iat`) are grandfathered through unaffected.
  3. **The general problem bank had no way to keep an assessment's questions confidential before/during a round.** Problems can now be flagged `isAssessmentOnly` (admin-settable, defaults `false` so nothing existing changes behavior) - such a problem is excluded from `GET /api/problems`, and `GET /api/problems/{id}` / practice-mode Run-Submit now 404 for a student who hasn't actually been assigned it by starting a round that includes it (checked against their own `RoundSession.assignedQuestions` - the same path the round-hub UI itself uses).
- These fixes don't change any existing round/practice/submission behavior for problems that stay at the `isAssessmentOnly` default (`false`) - they add a capability admins can opt into per problem, and close a token-lifetime gap that only matters at the moment of a security-motivated password reset.

- **Load testing (TTD Phase 6 scope: "~60 concurrent users")**: a load-test harness (see "Load Test Results (Phase 14)" below) drives 60 concurrent simulated students through the entire real flow - login, browse learning content, list/view problems, practice Run/Submit, start a coding round, autosave, submit every assigned question, finish, check results and the leaderboard - against the real FastAPI app (in-process ASGI, not a mock of the app itself) with a real RQ worker pool and a stubbed Judge0 (so the numbers reflect *this app's* concurrency handling, not a shared free third-party demo instance's rate limits). Found and fixed two real bottlenecks:
  1. **bcrypt blocked the whole async event loop.** Login/password-change/CSV-import called synchronous, CPU-bound `bcrypt` directly inside `async def` handlers - under 60 concurrent logins (a very real "everyone logs in when the coding club session starts" scenario), every request on the server, regardless of endpoint, stalled behind whichever bcrypt call currently held the single-threaded event loop hostage (measured: `GET /api/auth/me` averaging **7.4 seconds** with a **13.6s** worst case, despite doing no bcrypt work itself). Fixed by offloading every `hash_password`/`verify_password` call to a worker thread (`asyncio.to_thread`) at its async call sites (`auth_service.py`, `student_service.py`) - `get_me` dropped to an 18.9ms average (**390x**), and overall wall-clock for the full 60-student flow dropped from 23.1s to 10.0s.
  2. **N+1 (and N×M) queries in the admin/results/leaderboard endpoints.** Resolving each session's score looped a DB query per (student, question) pair, and resolving each session's student name looped a `find_by_id` per session - for a round with 60 finished students × 3 questions, `GET /api/admin/rounds/{id}/results` made **612** repository calls. Added `BaseRepository.find_by_ids` (one `$in` query instead of N), and refactored `ResultsService`/`CodingRoundService.list_sessions_for_round` to load every round's submissions and problems **once** and score/rank entirely in memory. Same endpoint, same data: **6** repository calls (a **~100x** reduction), latency down from 42.5ms to under 10ms.
  - Zero request errors across both load-test runs (before and after the fixes) - the app was never *incorrect* under load, just slow in these two specific spots.
- **Production deployment**: `backend/Dockerfile` (API + RQ worker share one image, different `command:`), `frontend/Dockerfile` (multi-stage Vite build served by nginx, with SPA fallback routing and long-cache headers for hashed assets), and a root `docker-compose.yml` wiring mongo + redis + backend + N worker replicas + frontend for a self-contained single-VM deployment - or point `MONGODB_URI`/`REDIS_URL` at managed services (MongoDB Atlas, a managed Redis) instead and drop those two services, with no application code changes needed either way. See "Production Deployment" below for the full pre-launch checklist.

Everything else described in the project specification (multi-language support, AI hints, badges/streaks, email reminders, etc.) is explicitly listed as a *post-v1* future enhancement and is **not** in scope for this build.

## Load Test Results (Phase 14)

60 concurrent simulated students, full end-to-end flow (login → browse → practice run/submit → start a coding round → autosave + submit 3 assigned questions → finish → check results/leaderboard), against the real app via an in-process ASGI transport (real FastAPI dependency injection, real rate limiter, a real 3-thread RQ worker pool draining a real fakeredis-backed queue, Judge0 stubbed with ~30-150ms jitter so results reflect this app, not a third-party demo instance's rate limiting). Before and after the two fixes above:

| Metric | Before | After |
|---|---|---|
| Full 60-student flow, wall-clock | 23.1s | **10.0s** |
| `GET /api/auth/me`, avg / max | 7,396ms / 13,588ms | **18.9ms / 64.0ms** |
| `POST /api/auth/login`, avg / max | 6,497ms / 13,791ms | **954ms / 1,553ms** |
| `GET /admin/rounds/{id}/results` (60 students), latency / DB calls | 42.5ms / 612 calls | **9.6ms / 6 calls** |
| `GET /admin/rounds/{id}/leaderboard` (60 students), latency / DB calls | 19.6ms / 252 calls | **10.0ms / 6 calls** |
| `GET /admin/rounds/{id}/sessions` (60 students), latency / DB calls | 26.3ms / 62 calls | **9.3ms / 3 calls** |
| Request errors | 0 | 0 |

Login's remaining ~954ms average is genuine bcrypt CPU cost under a *simultaneous* 60-way burst (Python's default thread pool has a bounded size, so 60 truly-concurrent bcrypt hashes still queue somewhat for a CPU/thread slot) - the fix's actual claim is narrower and already proven above: the event loop itself stays responsive for every *other* concurrent request while that happens, instead of everything on the server stalling together. In realistic usage, 60 students don't click "log in" in the same millisecond, so real-world latency will sit well below this intentionally-worst-case synchronized-burst number.

## Production Deployment

**Before deploying anywhere non-development**, work through this checklist (mostly enforced automatically by Phase 13's fixes, listed here for visibility):

1. **`JWT_SECRET_KEY`** - set to a real generated secret (`python -c "import secrets; print(secrets.token_urlsafe(48))"`). The app **refuses to start** otherwise once `ENVIRONMENT` isn't `development` (Phase 13).
2. **`ENVIRONMENT=production`** (or anything other than `development`) - enables the check above and should match reality.
3. **`MONGODB_URI`** - a real MongoDB (MongoDB Atlas recommended - a free/shared tier can sleep/cold-start, which conflicts with the PRD's "avoid sleeping/cold-start issues during scheduled coding rounds" requirement, so use at least a dedicated/always-on tier for a real event).
4. **`REDIS_URL`** - a real Redis (managed, or the `redis` service in `docker-compose.yml` for a self-hosted single-VM deployment).
5. **`JUDGE0_API_URL`** (+ `JUDGE0_API_KEY`/`JUDGE0_API_HOST` if using RapidAPI) - point at your own or a paid Judge0 instance. The free public demo instance used by default in development is shared, rate-limited, and explicitly not meant for a real event.
6. **`CORS_ORIGINS`** - the real frontend origin(s), not `localhost:5173`.
7. **`VITE_API_URL`** (frontend build arg) - the real, publicly-reachable backend URL. This is baked into the frontend bundle at build time, not read at runtime - rebuild the frontend image if it changes.
8. **TLS/HTTPS** - neither uvicorn nor the bundled nginx config terminates TLS; put a reverse proxy or load balancer in front (a cloud provider's LB, Caddy, or nginx with a cert) that does, and forwards to the backend/frontend containers over plain HTTP internally.
9. Run `python scripts/create_admin.py` once against the real database to create the first admin account, then use the admin UI to import students and manage content from there - same one-off bootstrap process as local dev, just pointed at production.
10. **Scaling**: run more `worker` replicas (`docker compose up --scale worker=N`, or more container instances) to add grading throughput - RQ workers are stateless and safe to run in parallel, and this is exactly what Phase 7's priority queues were built for. Keep the `backend` API service to a single process/instance unless the in-memory Run/Submit rate limiter (`app/core/rate_limit.py`) is first moved to a shared store (e.g. Redis) - documented as a known limitation below, not yet needed at the target ~60-student scale per this phase's load test.

### Quick start with Docker

```
cd codesphere
cp backend/.env.example backend/.env   # fill in the real values from the checklist above
docker compose up --build
```

This builds and runs mongo, redis, the backend API, two RQ worker replicas, and the nginx-served frontend. Visit the frontend's exposed port (80 by default) once everything reports healthy (`docker compose ps`).

## Security Review Findings (Phase 13)

A manual review covering authentication/session management, authorization (IDOR checks across every route that takes a raw ID), input validation, injection surfaces (NoSQL, command, template), secrets/crypto handling, and data exposure. All three findings below were fixed in this phase; nothing else at HIGH/MEDIUM confidence was found (see the areas explicitly reviewed and cleared, further down).

### Finding 1 — Hardcoded JWT secret fallback, no production safeguard

* **Severity:** High
* **File:** `backend/app/core/config.py`
* **Description:** `jwt_secret_key` defaulted to the literal string `dev-only-insecure-secret-change-me-in-production`, documented in both `config.py` and the public `.env.example` - anyone who reads this (public) repository knows the exact fallback value. Nothing prevented the app from actually starting with that value in a non-development deployment.
* **Exploit scenario:** An operator deploys the API without setting the `JWT_SECRET_KEY` environment variable (an easy step to miss - the app starts and appears to work fine either way). Anyone who has read the source can then craft a JWT with `{"sub": "<any user id>", "role": "admin"}` signed with the known secret and gain full admin access, including student data, round/problem management, and grading.
* **Fix:** `Settings.validate_for_production()` runs immediately at import time (covering the API, the RQ worker, and any one-off script) and raises a `RuntimeError` if `ENVIRONMENT != "development"` while `JWT_SECRET_KEY` still equals the shipped placeholder. Verified both directions: starts normally in dev, and with a real secret in production; refuses to start with the default secret and `ENVIRONMENT=production`.

### Finding 2 — Password change/reset didn't invalidate previously issued tokens

* **Severity:** Medium
* **Files:** `backend/app/core/security.py`, `backend/app/core/dependencies.py`
* **Description:** Access tokens are stateless JWTs valid for up to 12 hours (`JWT_ACCESS_TOKEN_EXPIRE_MINUTES`), with no server-side revocation list. Neither `AuthService.change_password` nor `StudentService.reset_password` did anything beyond updating the stored password hash - a token issued before either action remained fully valid until its natural expiry.
* **Exploit scenario:** A student's credentials leak (shared temp password, shoulder-surfing, etc.) and an attacker logs in, obtaining a valid token. The admin discovers this and resets the student's password (or the student changes it themselves) specifically to cut off the attacker's access - but the attacker's already-issued token keeps working for up to 12 more hours regardless, defeating the purpose of the reset.
* **Fix:** `create_access_token` now embeds an `iat` (issued-at) claim. `get_current_user` compares it against `User.updatedAt` (which, in this codebase, only ever changes on a password change/reset - verified by checking every write path to the `users` collection) and rejects (401) any token issued before the account's last password change. Tokens without an `iat` claim (issued before this fix shipped) are left unaffected, so existing sessions aren't force-logged-out by the deploy itself.

### Finding 3 — Coding-round question pools were readable early via the general problem bank

* **Severity:** Medium (assessment-integrity / information disclosure, not account compromise)
* **Files:** `backend/app/models/problem.py`, `backend/app/services/problem_service.py`, `backend/app/routes/problems.py`, `backend/app/routes/code_execution.py`
* **Description:** `GET /api/problems` and `GET /api/problems/{id}` are unscoped - any authenticated student could list and read the full statement, examples, and public test cases of **every** problem in the bank at any time, including ones assigned to a round they hadn't started (or that hadn't opened) yet. Coding rounds (Phase 8) reuse the same `problems` collection for their question pool, and the round system's own design explicitly keeps the pool hidden until a student starts ("`GET /api/rounds` ... question pool hidden until they start" - Phase 8's own README notes) - a design intent the always-open problem bank endpoints completely bypassed.
* **Exploit scenario:** A student notices a round is scheduled (`GET /api/rounds` shows it, without its problem IDs) and browses `GET /api/problems` shortly before or during the round's window, reading full statements for problems that turn out to be exactly what's assigned - either because it's a small bank and process of elimination narrows it down, or because a problem ID leaks (e.g., shared by a student who already started). They arrive at the assessment having already read (and possibly solved) the question in advance.
* **Fix:** Added an admin-settable `isAssessmentOnly` flag on `Problem` (default `false` - no existing problem's visibility changes). `ProblemService.list_problems` excludes such problems entirely; `get_problem_public` 404s (never 403, so existence can't be inferred) unless the requesting student has an actual `RoundSession` whose `assignedQuestions` includes that problem - the same condition that lets them reach it through the round hub in the first place. The same check was added to practice-mode (`roundId` omitted) `POST /api/code/run` and `/submit`, so a known/guessed assessment-only problem ID can't be run or submitted outside its round either; round-scoped submissions were already correctly gated via the existing `assert_can_submit` check and needed no change.

### Areas reviewed and cleared (no finding)

* **Authorization/IDOR:** every route taking a raw ID (results, autosave, activity, job status, admin sessions) was checked - all correctly scope by `current_user.id` server-side, never a client-supplied student ID. All 26 admin routes are gated by `get_current_admin_user`.
* **Role trust:** `get_current_admin_user` checks the DB-fetched `User.role`, not the JWT's `role` claim - a stale/forged claim in an otherwise-valid token (signed with the real secret) can't grant privilege it doesn't already have.
* **Injection:** no `eval`/`exec`/`subprocess`/unsafe deserialization anywhere in the backend; student code and stdin are base64-encoded before being sent to Judge0 (never interpolated into a shell command, path, or header); all MongoDB filters are built from Pydantic-typed fields (never raw client dicts), so NoSQL operator injection (e.g. `{"$ne": null}` smuggled through a string field) isn't reachable; the CSV student-import path parses in-memory only, never writes to or reads from a client-controlled path.
* **Crypto:** bcrypt (timing-safe, random per-hash salt) for passwords; `secrets.choice` (CSPRNG) for temporary passwords; JWT decode pins `algorithms=[...]` to the configured algorithm, closing the classic "alg: none" bypass.
* **XSS:** no `dangerouslySetInnerHTML` (or equivalent) anywhere in the frontend; React's default escaping covers every place user-controlled content (names, problem text, submitted code shown back to its own author) is rendered.

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

## Testing Phase 8

1. Start Redis, `python -m app.workers.run_worker`, backend, and frontend.
2. Log in as admin, visit `/admin/rounds`, click "New Round", pick a start/end time window that includes right now, select 2-3 problems, and create it. It starts as `draft` — click "Publish".
3. Log in as a student, visit `/student/rounds` (or the dashboard's "Upcoming Coding Rounds" card) — the round should show "Open now" with a "Start Round" button.
4. Click Start Round — you land on the round hub with a live countdown and a list of questions. Click a question, confirm the same coding interface from Phase 6/7 loads with a countdown badge in the header.
5. Submit a solution — if the round's `showResultsDuringRound` is off (the default), you should see a generic "Submitted" message with no verdict/score, not the usual pass/fail breakdown.
6. Go back to the round hub, click "Finish Round" — status becomes "submitted", and returning to a question page should show it's locked (Run/Submit disabled, a message explaining why).
7. Refresh the round hub page mid-round (before finishing) — confirm the timer keeps counting from the right place and the assigned questions haven't changed (the session persists server-side).
8. Try starting a round whose time window hasn't opened yet, or has already closed (create one with `/docs` if needed) — should be rejected with a clear message.

## Known Limitations (Phase 8)

- **No real MongoDB was available in this environment** (same as prior phases). The full round lifecycle — admin config validation, publish/draft visibility, idempotent start, server-computed expiry (`min(now + duration, round.endTime)`), the lazy active→expired transition, session locking, cascade delete, and round-scoped submission validation/redaction — was verified with 32 checks against an in-memory Mongo mock, plus two further HTTP-level passes against a real Judge0-backed worker: 14 checks covering the full student flow (list → start → round-scoped submit with redaction → finish → rejection after finishing) and 10 checks covering admin CRUD end-to-end. **Not** verified against real MongoDB Atlas or through an actual browser session — please run through the steps above yourself.
- **Found and fixed a real bug during this phase**: naive-vs-aware datetime comparison (see above) — would have crashed every round-timing check with a `TypeError` the first time it ran against a real, non-mocked MongoDB (mongomock happens to preserve whatever tzinfo you hand it, which is why this didn't fail even in the mocked tests until `tz_aware=True` was set explicitly to match).
- **No automatic auto-submit-on-expiry yet.** The spec's full workflow ("when time expires: retrieve latest autosaved code → trigger auto submission") needs Autosave, which is Phase 10. Today, when a session's time runs out, it's marked `expired` and locked — same practical effect (no more submissions accepted) — but the student's last _saved_ (not autosaved, since that doesn't exist yet) submission per problem is whatever they explicitly clicked Submit on before time ran out. Phase 10 will complete the "auto-submit with the last autosaved code" half of this.
- Question assignment is intentionally naive: every student gets every problem in the round's pool, in the same order. Phase 9 ("Smart Question Randomization") replaces only this assignment step with a balanced, diversified-per-student subset — the session storage (`assignedQuestions`) doesn't need to change for that.
- No admin visibility into round sessions/violations yet (who's started, who's finished, timing) — that's Phase 11 (Results) and Phase 12 (admin monitoring dashboard) territory; Phase 8 only covers round CRUD.
- The admin round form doesn't yet expose `assessmentConfiguration` (grace period, max violations) or `resultConfiguration` beyond what's needed to test redaction — the backend accepts them fully; extend the form later once Phase 10 needs them.

## Testing Phase 9

1. Start backend, worker, and frontend. Log in as admin, visit `/admin/rounds`, create a round selecting several problems across difficulties (or use the seeded DS01-DS10 problems, which span easy/medium/hard), set Easy=1, Medium=1, Hard=1, leave "Randomize question order" checked, and publish it.
2. Log in as several different students (or the same one in different browser profiles) and start the round — each should get exactly 3 questions, one of each difficulty, but not necessarily the *same* specific problems as each other, and not always in the same order.
3. Refresh the round page repeatedly, and try starting the round again from `/student/rounds` — the assigned questions and their order must stay exactly the same every time (never re-randomized).
4. In `/admin/rounds`, try creating a round with e.g. Hard=5 but only 1-2 hard problems selected in the pool — should be rejected with a clear "pool has only N hard problem(s)" message.
5. Create a round with all three counts left at 0 — confirm it behaves exactly like a Phase 8 round (every selected problem assigned to every student, in the order selected).

## Known Limitations (Phase 9)

- **No real MongoDB was available in this environment** (same as prior phases). The assignment algorithm was verified with 21 checks against an in-memory Mongo mock: pool-size validation, exact difficulty balance across 20 simulated students, diversity (with a 2-problem hard pool and 3-problem easy pool, usage came out 10/10 and 7/7/6 respectively — close to perfectly even), refresh/restart protection (byte-for-byte identical assignment), genuine order randomization (all 6 possible difficulty-orderings of a 3-question round appeared across 20 students), and Phase 8 backward compatibility. A further 5 HTTP-level checks confirmed `questionPoolConfiguration` round-trips correctly through the real create/update API and actually drives assignment. **Not** verified against real MongoDB Atlas or through an actual browser session — please run through the steps above yourself.
- Diversity uses a greedy least-used-first heuristic, not a global optimizer — it's provably fair per-difficulty (always picks the currently least-represented problem) but doesn't try to prevent, say, two students who are also getting the same easy problem from also matching on medium. For a club-sized round (tens of students, pools of a handful of problems per difficulty) this is more than sufficient to defeat casual glance-at-your-neighbor's-screen copying, which is the spec's stated goal.
- The "estimated total marks" shown on `/student/rounds` before starting is computed from a representative combination (the first N pool problems per difficulty, in list order), not the specific combination that student will actually receive — the real total appears once they start. This only matters if problems of the same difficulty carry different mark values; the seeded DS problems don't, so the estimate is always exact in the dev preview.

## Testing Phase 10

1. Start Redis, `python -m app.workers.run_worker`, backend, and frontend. In `/admin/rounds`, create (or edit, via `/docs`'s `PUT /api/admin/rounds/{id}`) a round with `assessmentConfiguration.gracePeriodSeconds` small (e.g. 3) and `maxViolations` low (e.g. 1) so violations are easy to trigger manually, and publish it.
2. Log in as a student, go to `/student/rounds`, click "Start Round" — confirm the "Before you start" warning modal appears first, explaining the timer, monitoring, and autosave, before the round actually begins.
3. Open a question, type some code, wait ~12+ seconds without clicking Run/Submit, then refresh the page — the editor should restore your autosaved code, not the blank default template.
4. Switch to another browser tab (or minimize the window) and stay away longer than the round's grace period, then come back — a "violation 1 of N" warning modal should appear. A *quick* tab switch (under the grace period) should not trigger it.
5. Repeat the violation past `maxViolations` — the session should immediately lock (`locked` status), the problem page should show "Your assessment was submitted automatically according to the assessment policy," and Run/Submit should be disabled.
6. Log in as admin, go to `/admin/monitoring`, pick the round from the dropdown — confirm the locked student appears with the correct violation count, click "View Log" to see the chronological visibility/focus/auto-submit events, then click "Unlock" — confirm the student's session goes back to `active` with violations reset and can resume working.
7. Let a different session's round time window actually expire (or set a short `durationMinutes`) without the student clicking Finish — confirm it also auto-submits their last autosaved code per question rather than just silently locking with nothing graded.

## Known Limitations (Phase 10)

- **No real MongoDB or Redis was available in this environment** (same as prior phases). The full autosave/monitoring/auto-submit/admin-override lifecycle was verified with 26 checks against an in-memory Mongo mock and a fake in-process Redis, including two runs through a **real** RQ worker calling the **real** public Judge0 demo instance (not mocked) to confirm an auto-submitted job is actually graded correctly end-to-end. **Not** verified against real MongoDB Atlas, real Redis, or through an actual browser session — please run through the steps above yourself.
- Monitoring relies on the Page Visibility API and window blur/focus events, which is what any browser-based proctoring can observe — it cannot detect a second physical device, a second monitor, or communication that never causes the assessment tab/window to lose focus. This matches the spec's stated scope (tab-switch/window-focus violations), not a full lockdown browser.
- A failed autosave or activity report is deliberately swallowed on the frontend (logged nowhere, just silently retried on the next interval/event) rather than shown as an error to the student — the intent is that a flaky network blip during a timed assessment shouldn't panic or distract the student; the next successful autosave/heartbeat catches things up. The tradeoff is that a student on a badly broken connection gets no explicit warning that their autosaves aren't landing, beyond the periodic nature of the mechanism itself.
- The admin Monitoring page's round dropdown lists **all** rounds (draft and published, any time window), not just currently-active ones — reasonable for reviewing a round after the fact, but there's no dedicated "currently in progress" filter yet.
- Grace period and violation limits are configured only via the API/`/docs` right now (`assessmentConfiguration` on `PUT /api/admin/rounds/{id}`) — same gap noted in Phase 8's limitations, still not surfaced in the admin round creation form. Worth adding alongside the pool-configuration fields Phase 9 already added there.

## Testing Phase 11

1. Start backend, worker, and frontend. As admin, publish a round with 2+ problems (different mark values make this easier to verify), and set its `endTime` a few minutes out via `/docs` (`PUT /api/admin/rounds/{id}`) so you can watch it close during testing.
2. Log in as 2-3 different students, start the round, submit varying-quality solutions to each question (including a deliberately wrong one, to see a non-`accepted` verdict), then click "Finish Round" for each.
3. While the round is still open, visit `/student/results` as one of the finished students — the round should appear with a status badge and its total marks, but the score column should read "Pending" (not yet available).
4. Visit `/student/leaderboard`, select the round — it should show "Leaderboard not available yet."
5. Wait for (or shorten) the round's `endTime` to pass, then refresh `/student/results` — the score, rank, and "View Breakdown" should now be populated; open the breakdown modal and confirm each question shows the right verdict/score/marks.
6. Refresh `/student/leaderboard` — confirm students are ranked score-descending, your own row is highlighted, and the ranking matches what you'd expect from the submissions in step 2.
7. As admin, go to `/admin/rounds`, click "Results" on the published round — confirm the same ranked table appears (this view should have worked even in step 3-4, before the round closed, since admin results are ungated).
8. From `/student/rounds/:id` after finishing, confirm the new "View Results" button takes you to `/student/results`.

## Known Limitations (Phase 11)

- **No real MongoDB was available in this environment** (same as prior phases). The scoring, ranking, and availability-gating logic was verified with 30 checks against an in-memory Mongo mock: best-attempt-wins scoring (ignoring Run submissions and worse Submit attempts), correct per-round and per-question totals, rank/tie-break ordering, the before/after-round-close availability gate for a student's own results, the stricter always-after-close gate for the leaderboard, `showScoreImmediately` correctly unlocking only the personal view (never the leaderboard), and the ungated admin view including in-progress sessions. **Not** verified against real MongoDB Atlas, real Judge0-graded submissions in this exact flow (Judge0 grading itself was already proven end-to-end in Phases 6-10; this phase's checks insert `Submission` records directly to isolate the new scoring/ranking logic), or through an actual browser session — please run through the steps above yourself.
- Scoring sums each assigned question's *best* graded submission, not the last one — this rewards experimentation (matches most competitive-programming judges) but means a student who submits a worse "final" answer after a better earlier one still gets credit for the better one. If a stricter "your last submission is your answer" policy is wanted later, this is a one-line change in `ResultsService._best_submission_score`.
- Rank is a plain sequential position (1st/2nd/3rd, ties broken by whoever finished first) rather than shared/"1224"-style ranking — simplest to reason about at club scale, but two students with an identical score and identical completion timestamp (down to the microsecond) would get an arbitrary stable order rather than a genuine tie.
- The admin round-results modal and the student leaderboard/results pages don't auto-refresh — an admin watching scores roll in during a still-open round needs to close and reopen the modal to see new submissions (the underlying data is always live/ungated for admins, just not polled).
- No cross-round aggregate/overall leaderboard yet (e.g. "total points across every round this semester") — today's leaderboard is always scoped to one round at a time, matching the per-round nature of a coding assessment; an overall standings view would be a natural follow-up if the club wants a running competition.

## Testing Phase 12

1. Start backend and frontend. Generate some data first if you haven't already: a few students, a few practice-mode Run/Submit actions across problems of different difficulties and topics, and at least one finished coding round (see Phases 6-11's testing steps).
2. Log in as admin and visit `/admin/analytics`. Confirm the five stat tiles at the top show sensible numbers (students, problems attempted vs. total, submissions, overall pass rate, active vs. total rounds).
3. Check the "Submissions - last 14 days" chart - hover over a bar and confirm a tooltip shows the exact accepted/other counts for that day; click "View as table" and confirm the same 14 rows are listed.
4. Check "Pass rate by difficulty" - bars should be colored green/amber/red matching the difficulty badges used elsewhere in the app, and the counts in parentheses should add up correctly against what you submitted.
5. Check "Weakest topics" and "Learning module engagement" - hover a bar to see the native tooltip with exact counts; confirm modules/topics with zero activity still appear (at 0%), rather than being silently dropped.
6. Check the "Problem performance" table at the bottom - confirm every problem you've submitted to appears (untouched problems should not), sorted with the lowest pass rate first.
7. Toggle dark mode (from the profile dropdown, per the Phase 7-8 theme system) and confirm every chart, bar, and tooltip stays legible - no invisible text, no pure-black backgrounds.
8. Submit a few more Run/Submit attempts, refresh `/admin/analytics`, and confirm the numbers update (this page always re-fetches on load - there's no caching to invalidate).

## Known Limitations (Phase 12)

- **No real MongoDB was available in this environment** (same as prior phases). The aggregation logic - overview stats, the 14-day trend window and its day-bucketing, most-struggled-first problem/topic ranking, the fixed easy/medium/hard order, division-by-zero safety for untouched problems/topics/modules, and the active-vs-total round count - was verified with 26 checks against an in-memory Mongo mock. **Not** verified against real MongoDB Atlas, and the charts themselves were verified by code review against this project's own established design tokens (no charting library was added) and a clean TypeScript build, not by rendering in an actual browser - no browser automation was available in this environment either. Please run through the testing steps above yourself, in both light and dark mode.
- Analytics recomputes everything on every request by scanning the relevant collections in full (no caching, no materialized/precomputed rollups) - entirely fine at the club's target scale (tens of students, hundreds of submissions), but the first thing to revisit if the platform ever grows well past that.
- "Weakest topics" and the difficulty/problem pass rates are platform-wide aggregates, not a per-student diagnostic - the PRD explicitly scopes real "advanced analytics for weak-topic detection" (i.e., per-student skill-gap identification) as a *post-v1* future enhancement, not part of this build.
- The submission trend is a fixed 14-day window with no date-range picker yet - a reasonable default for "how's the club doing lately", but not adjustable without a code change.
- Learning engagement counts a module as "started" by a student the moment they complete its first topic - it doesn't distinguish "actively working through it" from "completed it long ago and moved on," since `topic_progress` only stores a completion timestamp, not an in-progress/viewed state.

## Testing Phase 13

1. **JWT secret guard.** From `backend/`, with the venv active: `ENVIRONMENT=production python -c "from app.core.config import settings"` should raise `RuntimeError` (still on the default secret). Then `ENVIRONMENT=production JWT_SECRET_KEY=some-real-value python -c "from app.core.config import settings"` should succeed silently. Plain `python -c "from app.core.config import settings"` (no env overrides, i.e. the default `ENVIRONMENT=development`) should also succeed, same as before this phase.
2. **Stale token rejection.** Log in as any user and note the token (or watch it in the browser's network tab / localStorage). As admin, reset that student's password (or have the student change their own). Try using the *old* token against any protected endpoint (e.g. `GET /api/auth/me` with the old `Authorization: Bearer <token>` in `/docs` or curl) - expect `401`. Log in again to get a fresh token and confirm it works normally.
3. **Assessment-only problems.** As admin, open `/admin/problems`, create a new problem with "Assessment only" checked (or open an existing one and check the box in `/admin/problems/:id`). Confirm it disappears from `/student/problems` for a student who isn't assigned it. Try `GET /api/problems/{id}` directly with a student token - expect `404`. Add the problem to a round's pool, have that student start the round, and confirm the problem is now reachable both through the round hub and via a direct `GET /api/problems/{id}` call. Confirm existing (non-flagged) problems are completely unaffected.
4. Run the full existing test suite for Phases 8-12 again (or re-run their integration scripts, if you kept them) to confirm nothing regressed - the fixes touch shared code (`get_current_user`, `ProblemService`, `POST /api/code/run|submit`) used by every round/practice flow.

## Known Limitations (Phase 13)

- **No real MongoDB was available in this environment** (same as prior phases). All three fixes were verified with 11 targeted checks against an in-memory Mongo mock, plus two direct subprocess checks proving the JWT startup guard both fires (insecure secret + non-dev environment) and passes (real secret configured). Re-running Phases 10-12's existing integration suites (56 checks total) against the same changed shared code (`get_current_user`, `ProblemService`) confirmed zero regressions. **Not** verified against real MongoDB Atlas or through an actual browser session.
- This was a manual code review, not a scanner/dependency-vulnerability audit - third-party package versions (FastAPI, PyJWT, bcrypt, Motor, React, Vite, etc.) were not individually checked against CVE databases. Run `pip list --outdated` / `npm audit` before a real production deployment.
- The stale-token check has coarse granularity: it invalidates a token the moment *any* password change happens, which is exactly the intended behavior for change-password/reset-password, but there's no separate "log out all other sessions" action independent of a password change (not requested by the spec, and stateless JWTs would need an actual revocation store to support it properly).
- `isAssessmentOnly` is opt-in and defaults to `false` on every existing problem - the 10 seeded DS01-DS10 problems (used by both practice and the example rounds from earlier phases' testing) remain fully practice-visible unless an admin explicitly flags them. Flagging a problem that's *already* being actively used in a live round pool is safe (it only affects the general bank endpoints, not the round-scoped path), but flagging one that students have already been practicing on doesn't retroactively hide anything they've already seen.
- No CSRF concern to mitigate: the API is a pure JSON REST backend with a `Bearer` token in the `Authorization` header (never a cookie), so there's no ambient-credential attack surface for CSRF in the first place - noted here only because it's a common checklist item, not because anything was found or changed.
- Rate limiting, dependency-version currency, and infrastructure-level hardening (TLS termination, firewall rules, MongoDB Atlas network access lists, Judge0 instance isolation) are explicitly out of this phase's scope per the review's exclusions, and are part of Phase 14 (load testing and production deployment) instead.

## Testing Phase 14

1. **Load test.** From `backend/`, with the venv active: `pip install mongomock-motor mongomock fakeredis` (dev-only, not in `requirements.txt`), then `python scripts/load_test.py`. Confirm zero request errors and that no endpoint's latency looks pathological. The exact numbers from this environment are in "Load Test Results" above - use them as a rough baseline, not a guarantee (a different machine, a real MongoDB with real network latency, and a real Judge0 instance will all shift the absolute numbers).
2. **bcrypt fix, concretely.** Start the real backend + frontend (with a reachable MongoDB). Open two browser tabs/incognito windows and submit the login form in both within a second of each other - both should complete in well under a second each, not visibly queue behind one another.
3. **N+1 fix, concretely.** Seed or run a round with a couple dozen finished student sessions, then load `/admin/monitoring`, `/admin/rounds` → Results, and a round's leaderboard - each should feel instant regardless of student count (previously this scaled roughly linearly with students × questions).
4. **Docker build** (requires Docker, not available in this development environment - see Known Limitations): `docker compose up --build` from `codesphere/`, after filling in `backend/.env` per the Production Deployment checklist above. Confirm `docker compose ps` shows every service healthy, then visit the frontend port and log in.
5. **Production config guard**, if you haven't already exercised it in Phase 13's testing: confirm the backend refuses to start with `ENVIRONMENT=production` and the default `JWT_SECRET_KEY`, and starts fine with a real one.

## Known Limitations (Phase 14)

- **No real MongoDB, Redis, or Docker was available in this development environment.** The load test used mongomock-motor + fakeredis + real RQ `SimpleWorker` threads + a stubbed Judge0, driving the real FastAPI app in-process via `httpx`'s ASGI transport - genuinely exercises the app's own request handling, dependency injection, async concurrency, and query patterns, but **not** real network latency to MongoDB/Redis/Judge0, real OS-level TCP handling, or multiple real processes. Absolute latency numbers under a real deployment (especially with a MongoDB Atlas shared tier's network round-trips) will differ - the *relative* improvements (390x on `get_me`, ~100x fewer DB calls on admin results) are the load-bearing claims, not the specific millisecond figures.
- **The Dockerfiles and docker-compose.yml were written carefully but never actually built or run** - no Docker was available in this sandbox. They follow standard, common patterns (multi-stage frontend build, shared backend image for API + worker, healthchecks, a `.dockerignore` per service) but should be validated end-to-end before a real launch, not trusted blindly.
- **The in-memory rate limiter doesn't scale past one backend process.** `app/core/rate_limit.py` is a plain in-process dict - correct and sufficient for the single-instance deployment this phase's load test validated (60 concurrent students against one backend process handled comfortably), but if the API is ever horizontally scaled to multiple instances behind a load balancer, each instance would enforce its own independent 5-run/3-submit-per-minute limit instead of one shared one. Documented rather than fixed, since it isn't needed at the target scale - moving it to a Redis-backed limiter (the same Redis already used for the job queue) would be the fix if that scale is ever needed.
- Load testing covered the student-facing flow and the admin monitoring/results/analytics endpoints, but not every admin CRUD endpoint (problem/round/learning-content management) - those are lower-frequency, single-admin-at-a-time operations by nature, not the ~60-concurrent-user path the PRD's NFRs are actually concerned with.
- No APM/observability stack (structured logging aggregation, metrics, tracing) was added - out of scope for this phase, but worth having before a real production event if you want visibility into what's happening live rather than relying on container logs.
