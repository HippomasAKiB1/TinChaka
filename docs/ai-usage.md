# TinChaka — AI Usage Log

> This document is maintained continuously throughout project development per `docs/PRD.md §8` and `docs/PROJECT_PLAN.md §11`. It transparently records AI tool interactions, engineering decisions, accepted suggestions, rejected proposals, and human course-corrections.

---

## Log Entry 1: Project Alignment, Compliance Audit & System Design (Steps 1 & 2)

- **Date / Timestamp:** 2026-09-26T01:22:00+06:00
- **AI Tools Used:** Antigravity (powered by Gemini 3.8 Flash)
- **Phase Covered:** Step 1 (Project Constitution & Compliance Audit) and Step 2 (Architecture, Data Model, Distance Matrix, State Cascades)

### 1. Context & Purpose
Executed the foundational alignment and system design before writing any code:
1. Conducted an authoritative reading of `docs/PRD.md` and `docs/PROJECT_PLAN.md`.
2. Verified all 12 locked technical decisions in `PROJECT_PLAN.md §1`.
3. Created `docs/architecture.md` detailing the complete PostgreSQL schema, Mermaid ERD, architecture flow, Dhaka transit distance matrix, fare formulas with worked examples, and the lifecycle state-cascade table.

### 2. Accepted Suggestions
- **No-Membership-Table Schema Validation:** Affirmed and formalized the schema simplification where `ride_requests.pool_id` directly joins requests to pools, with vehicle capacity verified via `SUM(seats_requested)` under a PostgreSQL `SELECT ... FOR UPDATE` lock, eliminating unnecessary join-table complexity.
- **Symmetric Integer Distance Matrix:** Defined a 9-zone Dhaka road distance matrix using pure integer kilometers, guaranteeing hand-calculable fares and strictly honoring the zero-floating-point geometry constraint.

### 3. Considered and Rejected / Modified Suggestions
- **Floating-point or Haversine Geodesic Distance:** Considered computing lat/long coordinate distances, but immediately rejected it per `PROJECT_PLAN.md §1 & §4` because it introduces floating-point errors, requires geospatial libraries, and violates the requirement that evaluators can verify calculations by hand.
- **Premature Git Branch Renaming in Step 2:** Considered switching/renaming `main` to `master` immediately in Step 2, but modified the plan per human guidance to handle git branch alignment strictly in Step 3 alongside repository scaffolding, ensuring Step 2 remains 100% focused on documentation and system design.

### 4. Human Corrections & Guidance Acknowledged
1. **Correction 1 — `ratePerKm` is Open, Not Locked:** `PROJECT_PLAN.md §3` specifies `ratePerKm (e.g. 15 poysha/km)`. The human clarified that `e.g.` means 15 was an example and not a locked decision. Proposed `15 poysha/km` in `docs/architecture.md §4` alongside the distance matrix and explicitly flagged it for approval, while keeping `baseFare = 30 poysha` as locked.
2. **Correction 2 — Git Branch Alignment Timing:** Confirmed that aligning the default branch to `master` will occur in Step 3 (Scaffold) rather than Step 2.
3. **Correction 3 — Step 2 Scope Deliverables:** Formally resolved Gap #3 (full 9-zone distance lookup table and rate proposal) and Gap #4 (pool-to-member status cascade table and cancellation rules) directly within `docs/architecture.md` prior to any code generation.
4. **Resolution on Fare Scale (Update 1 per PRD.md §17):** Approved by human to scale the baseline constants by $100\times$: `baseFare = 3000 poysha` (30 Taka), `ratePerKm = 1500 poysha/km` (15 Taka/km), and 20% discount on distance charge. This matches real Dhaka transit economics while preserving pure integer-poysha arithmetic throughout the application.

---

## Log Entry 2: Repository Scaffolding & Docker Gate Verification (Step 3)

- **Date / Timestamp:** 2026-09-26T01:36:00+06:00
- **AI Tools Used:** Antigravity (powered by Gemini 3.8 Flash)
- **Phase Covered:** Step 3 (Scaffold repo + Docker Compose + .env.example, verify empty-but-running per `PROJECT_PLAN.md §19 step 3, §8 gate`)

### 1. Actions Executed
1. **Branch Management:** Renamed initial default branch `main` to `master` per `PRD.md §10` and `PROJECT_PLAN.md §12`. Committed project baseline on `master` (commit `8d42266`). *Note on commit `8d42266`: The commit message stated 'docs: add project baseline (PRD, project plan, architecture, AI usage log)' although `PRD.md` and `PROJECT_PLAN.md` were already committed in prior repository history (`786e291` and `51c2907`); the actual diff introduced `architecture.md` and `ai-usage.md` only.*
2. **Feature Branching:** Created and checked out `feature/project-scaffold`.
3. **API Scaffolding (`tinchaka-api`):** Configured Express + TypeScript, Zod environment validation (`DATABASE_URL`, `JWT_SECRET`, `PORT`), `/health` endpoint, clean directory layout (`routes`, `controllers`, `services`, `repositories`, `middleware`, `types`), empty Prisma schema, production multi-stage Dockerfile, and `entrypoint.sh`. Verified build locally with `npm run build` producing `dist/`.
4. **Web Scaffolding (`tinchaka-web`):** Configured Next.js 14 App Router, TypeScript, Tailwind CSS, placeholder "TinChaka — coming online" UI, standalone output in `next.config.js`, and multi-stage Dockerfile. Verified production build locally with `next build`.
5. **Docker Compose & Environment:** Created root `docker-compose.yml` (`tinchaka-db`, `tinchaka-api`, `tinchaka-web`) with healthchecks and dependencies, along with `.env.example` placeholder values.
6. **Conventional Git Commits:** Made incremental commits adhering to `PROJECT_PLAN.md §12` commit formatting rules.

### 2. Considered and Rejected / Modified Suggestions
- **Silent Environment Patching:** Avoided modifying system-level tools when `docker` was absent from PATH; strictly adhered to instructions to stop and report exact raw command outputs rather than masking the environment limitation.

### 3. Step 3 Scaffold & Docker Compose Gate Verification Complete
- **Date / Timestamp:** 2026-09-26T01:55:00+06:00
- **Status:** Gate passed (§8 gate verified).
- **Verification Summary:**
  - `docker compose build`: Succeeded for all services (`tinchaka-db`, `tinchaka-api`, `tinchaka-web`).
  - `docker compose up -d`: All three containers spawned and achieved `healthy` status.
  - API Healthcheck: `GET http://localhost:5000/health` returned HTTP 200 with `{ "status": "ok" }`.
  - Frontend Healthcheck: `GET http://localhost:3000` returned HTTP 200.
  - Clean Teardown: `docker compose down` stopped and removed containers and network cleanly.
- **Observations & Technical Debt Flag:**
  - Noted weak fallback credentials in API configuration for dev/docker defaults; flagged for hardening before public/production deployment in Step 12.

---

## Log Entry 3: Authentication — Signup, Login & Error Handling (Step 5A)

- **Date / Timestamp:** 2026-09-26T02:50:00+06:00
- **AI Tools Used:** Antigravity (powered by Claude Opus 4.6 Thinking)
- **Phase Covered:** Step 5A (Password hashing, JWT issuance, signup/login endpoints, Zod validation, error middleware, Jest integration tests)
- **Commits:** `d11f463`, `8a98827`, `274f0a5`, `a7cb098`, `f29d530`

### 1. Files Added / Modified

| File | Purpose |
|------|---------|
| `src/services/password.service.ts` | bcrypt `hashPassword` / `verifyPassword` wrappers |
| `src/services/jwt.service.ts` | `signAccessToken` using `jsonwebtoken` with `JWT_SECRET` from env |
| `src/services/auth.service.ts` | `registerUser` and `loginUser` business logic; strips `password_hash` from responses |
| `src/controllers/auth.controller.ts` | Thin controller layer: Zod-parse → service call → status code |
| `src/routes/auth.routes.ts` | `POST /auth/signup`, `POST /auth/login` |
| `src/schemas/auth.schema.ts` | Zod schemas for signup (name, email, password, role) and login (email, password) |
| `src/types/AppError.ts` | Custom `AppError` class with `statusCode`, `message`, and `code` |
| `src/middleware/errorHandler.ts` | Central error handler dispatching `AppError`, `ZodError`, and fallback 500 |
| `src/middleware/notFoundHandler.ts` | Catch-all 404 for unmatched routes |
| `tests/auth.test.ts` | 7 Jest integration tests covering signup, login, validation, and error paths |

### 2. Accepted Suggestions
- **Identical 401 response for wrong-password and unknown-email:** AI suggested returning the same `AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS')` for both unknown email and wrong password in `loginUser`, preventing user-enumeration attacks. Accepted because it matches OWASP best practice and the smoke test explicitly requires byte-identical 401 bodies for both cases.

### 3. Considered and Rejected / Modified Suggestions
- **Prisma `$disconnect()` in Jest `afterAll`:** AI suggested adding `await prisma.$disconnect()` in the test teardown to cleanly close the connection pool. Modified to defer: the tests currently run against a live database and Jest prints a "Force exiting Jest" warning due to the open connection pool, but all 7 tests pass correctly. Deferring the fix avoids coupling test infrastructure changes with the auth feature; it is tracked as a known nuisance for future cleanup (see §4 below).

### 4. Known Issues & Technical Debt
- **Jest "Force exiting Jest" warning:** After all 7 tests pass, Jest prints `"Force exiting Jest: Have you considered using --forceExit?"` because the Prisma client connection pool is not disconnected in `afterAll`. This does not affect test correctness or CI exit codes. Flagged for cleanup in a future test-infrastructure pass.

---

## Log Entry 4: Auth & Ownership Middleware (Step 5B)

- **Date / Timestamp:** 2026-09-26T03:00:00+06:00
- **AI Tools Used:** Antigravity (powered by Claude Opus 4.6 Thinking)
- **Phase Covered:** Step 5B (requireAuth, requireRole, requireOwnership middleware factories, Express Request type augmentation, 10 middleware tests)
- **Branch:** `feature/ownership-middleware`

### 1. Files Added

| File | Purpose |
|------|---------|
| `src/types/express.d.ts` | Augments Express `Request` with `req.user?: { id: string; role }` per §6 step 5 |
| `src/middleware/requireAuth.ts` | Extracts Bearer token, verifies via `jwt.service`, sets `req.user` |
| `src/middleware/requireRole.ts` | Factory restricting access to specified roles; 403 on mismatch |
| `src/middleware/requireOwnership.ts` | Factory resolving resource owner; 403 on null or mismatch |
| `src/middleware/index.ts` | Barrel export for the three middleware modules |
| `tests/ownership-middleware.test.ts` | 10 test cases against a test-only Express app with in-memory ride store |

### 2. Accepted Suggestions
- **`req.user.id` mapped from `payload.userId`:** The JWT payload uses `userId` internally (from `jwt.service.ts`), but `requireAuth` maps it to `req.user.id` per `PROJECT_PLAN.md §6 step 5` which specifies the field as `req.user.id`. Accepted to maintain strict compliance with the plan while preserving the existing JWT payload shape.

### 3. Considered and Rejected / Modified Suggestions
- **404 for cross-user ownership mismatch (anti-enumeration):** Considered returning 404 instead of 403 on ownership mismatch to hide resource existence from unauthorized users. Rejected in favor of 403 for consistency with `PROJECT_PLAN.md §6 step 5` ("Cross-user access must return 403 Forbidden") and `§9 test 5`. The anti-enumeration benefit is marginal for this MVP where resource IDs are UUIDs (not guessable), and deviating from the plan would create confusion in test evaluation.

### 4. Middleware Not Yet Wired
- All three middleware modules are tested but not mounted on any production route. They will be wired in Step 6+ when ride/pool endpoints are created.

---

## Log Entry 5: Passenger Ride Request Creation & Estimated Fare (Step 6)

- **Date / Timestamp:** 2026-09-26T03:12:00+06:00
- **AI Tools Used:** Antigravity (powered by Gemini 3.8 Flash)
- **Phase Covered:** Step 6 (Dhaka zones, symmetric distance matrix, locked fare estimation, ride request creation with audit history, /ride-requests/me history endpoint, §9 Test #4 and integration suite)
- **Branch:** `feature/ride-request-flow`

### 1. Files Added / Modified

| File | Purpose |
|------|---------|
| `src/domain/zones.ts` | 9 canonical Dhaka transit zones and type helpers per architecture.md §4(a) |
| `src/domain/distance.ts` | 9x9 symmetric integer km lookup matrix per architecture.md §4(b) |
| `src/domain/fare.ts` | Integer-poysha fare computation formulas and locked constants (3000, 1500, 0.20) |
| `src/schemas/rideRequest.schema.ts` | Zod schema for ride request creation validating pickup, destination, and seats (1-3) |
| `src/services/rideRequest.service.ts` | Transactional request creation with initial audit history row (`from_status=null`), and personal list query |
| `src/controllers/rideRequest.controller.ts` | Controllers for `POST /ride-requests` and `GET /ride-requests/me` |
| `src/routes/rideRequest.routes.ts` | Routes bound to `requireAuth` and `requireRole('PASSENGER')` |
| `src/app.ts` | Mounted `/ride-requests` router |
| `tests/fare.test.ts` | Mandatory §9 Test #4 verifying fare formulas, worked examples (Nusrat 7500/6600, Rafiq 9000/7800), symmetry, and integer invariants |
| `tests/ride-request.test.ts` | 10 integration tests covering creation, role gate (403 for DRIVER), validation, audit row generation, and personal history |

### 2. Accepted Suggestions
- **Exact Worked-Example Alignment:** Implemented pure integer poysha arithmetic (`Math.floor` on distance charge discount) matching architecture.md §5 worked examples to the poysha: Nusrat solo = 7500 poysha, Nusrat pooled = 6600 poysha; Rafiq solo = 9000 poysha, Rafiq pooled = 7800 poysha.
- **Initial Audit Row in Transaction:** Created the initial `ride_status_history` record within the same Prisma transaction as the ride request creation, establishing the state audit trail where `from_status=null` and `to_status='REQUESTED'`.

### 3. Considered and Rejected / Modified Suggestions
- **Attaching `requireOwnership` to `/ride-requests`:** Considered whether `requireOwnership` was needed on `/ride-requests` or `/ride-requests/me`. Rejected because these endpoints act strictly on the authenticated caller (`req.user.id`) rather than route parameters. `requireOwnership` is deferred to `/:id` routes in Step 9 per `PROJECT_PLAN.md §6 step 5`.

### 4. Verification Summary
- **Unit & Integration Tests:** 33/33 tests passing across 4 test suites.
- **Docker Compose Smoke Test:** Verified end-to-end against live PostgreSQL container:
  - `POST /auth/login` (Nusrat) -> 200 with JWT
  - `POST /ride-requests` (Nusrat, 1 seat, Banani -> Mohakhali) -> 201 with `estimated_fare_poysha: 7500`
  - `GET /ride-requests/me` (Nusrat) -> 200 with ride in array
  - `POST /ride-requests` (Jashim, DRIVER) -> 403 Forbidden
  - Smoke data cleaned from database via psql.

---

## Log Entry 6: Driver Availability, Zone Pending List & Tesla Pooling with §5 Concurrency Control (Step 7)

- **Date / Timestamp:** 2026-09-26T03:28:00+06:00
- **AI Tools Used:** Antigravity (powered by Gemini 3.8 Flash)
- **Phase Covered:** Step 7 (Vehicle online status toggle, driver same-zone pending request list, transactional pool acceptance with row-level locks, dynamic fare recalculation with 20% pool discount, §9 Test #1 capacity & fare suite, and §9 Test #2 last-seat race concurrency suite)
- **Branch:** `feature/tesla-pooling`

### 1. Files Added / Modified

| File | Purpose |
|------|---------|
| `src/services/vehicle.service.ts` | `setOnlineStatus` service updating driver's vehicle `is_online` status |
| `src/schemas/vehicle.schema.ts` | Zod schema for vehicle online status toggle |
| `src/controllers/vehicle.controller.ts` | Controller for `PATCH /vehicles/me/online` |
| `src/routes/vehicle.routes.ts` | Router for vehicle endpoints with `requireAuth` and `requireRole('DRIVER')` |
| `src/services/pool.service.ts` | Transactional `acceptRequest` with PostgreSQL `SELECT ... FOR UPDATE` row locks, capacity check, and member fare recalculation |
| `src/schemas/pool.schema.ts` | Zod schema validating `ride_request_id` as UUID |
| `src/controllers/pool.controller.ts` | Controller for `POST /pools/accept` returning 200 `{ pool, created }` |
| `src/routes/pool.routes.ts` | Router for pool operations with `requireAuth` and `requireRole('DRIVER')` |
| `src/services/rideRequest.service.ts` | Added `listPendingInZone` requiring driver online status |
| `src/controllers/rideRequest.controller.ts` | Added `listPending` validating `?zone` query parameter |
| `src/routes/rideRequest.routes.ts` | Added `GET /` with `requireAuth` and `requireRole('DRIVER')` |
| `src/app.ts` | Mounted `/vehicles` and `/pools` routers |
| `tests/pool-capacity.test.ts` | §9 Test #1 covering capacity limit (3), zone mismatch (409), offline driver (409), and two-stage fare recalculation |
| `tests/concurrency.test.ts` | §9 Test #2 covering last-seat race between concurrent accept requests under row-level locking |

### 2. Accepted Suggestions
- **Single-Endpoint Accept Simplification:** Collapsed §6 step 8's separate creation (`POST /pools`) and join (`POST /pools/:id/join`) into a single atomic `POST /pools/accept` endpoint. The server inspects whether the driver has an active uncompleted pool (`MATCHED` or `DRIVER_ARRIVED`) via row-locked query and either attaches to it or creates a new pool. This eliminates client-side state branching while maintaining identical invariants.
- **Explicit Zone Query Parameter for Driver Location:** Adopted `GET /ride-requests?zone=...` to query compatible pending requests. Since the MVP data model does not track real-time GPS coordinates or driver location entities, the driver explicitly specifies their current station zone.
- **PostgreSQL Row-Level Concurrency Control (§5):** Implemented strict pessimistic row locking inside `prisma.$transaction`:
  1. `SELECT ... FROM pools WHERE vehicle_id = $1 AND status IN ('MATCHED', 'DRIVER_ARRIVED') FOR UPDATE`
  2. `SELECT ... FROM ride_requests WHERE id = $1 FOR UPDATE`
  3. Re-computed total occupied seats via `SELECT COALESCE(SUM(seats_requested), 0)::int ...` strictly inside the transaction lock before linking.

### 3. Considered and Rejected / Modified Suggestions
- **Optimistic Concurrency Control (Version Column):** Considered optimistic locking with a version number on the pool row. Rejected for the MVP in favor of PostgreSQL's native `SELECT ... FOR UPDATE` pessimistic row lock per `PROJECT_PLAN.md §5`. While pessimistic locking serializes concurrent accepts per vehicle, it provides ironclad guarantees against overbooking on single-vehicle pools and requires zero distributed state. Documented in comments and architecture documentation as a conscious design choice.

### 4. Verification Summary
- **Unit & Integration Tests:** 38/38 tests passing across all 6 test suites:
  - `tests/pool-capacity.test.ts`: Passed all 4 cases (capacity 3 bound, zone mismatch, offline driver, 7500 solo -> 6600/7800 pooled discount).
  - `tests/concurrency.test.ts`: Passed last-seat race between concurrent requests: exactly one request received 200, exactly one received 409 `CAPACITY_EXCEEDED`, and total occupied seats remained strictly 3.
- **Docker Compose Smoke Test:** Verified end-to-end against live PostgreSQL container:
  - Driver `PATCH /vehicles/me/online` -> `is_online: true`
  - Driver `GET /ride-requests?zone=Banani` -> listed pending requests
  - Driver `POST /pools/accept` (Nusrat) -> 200 with pool created, fare = 7500
  - Driver `POST /pools/accept` (Rafiq) -> 200 joined pool, Nusrat fare = 6600, Rafiq fare = 7800
  - Direct SQL query confirmed both rows updated in PostgreSQL.

---

## Log Entry 7: Ride Lifecycle Transitions & Cancellation Handling (Step 8)

- **Date / Timestamp:** 2026-09-26T21:26:00+06:00
- **AI Tools Used:** Antigravity (powered by Gemini 3.8 Flash)
- **Phase Covered:** Step 8 (State machine validator per PROJECT_PLAN.md §2.1, pool lifecycle transitions arrived/start/complete with history fan-out, cancellation with remaining-member fare rebalancing, §9 Test #3 state machine invalid transitions and §9 Test #6 cancellation cutoff)
- **Branch:** `feature/ride-lifecycle-transitions`

### 1. Files Added / Modified

| File | Purpose |
|------|---------|
| `src/domain/stateMachine.ts` | Single source of truth state machine transition assertions per PROJECT_PLAN.md §2.1 |
| `src/services/pool.service.ts` | Added `markArrived`, `markStarted`, `markCompleted`, and `cancelPool` with atomic transactions, fan-out, and payment records |
| `src/services/rideRequest.service.ts` | Added `cancelRideRequest` with authorization, cancellation validation, remaining-member fare rebalancing, and re-exported `cancelPool` |
| `src/controllers/pool.controller.ts` | Added `arrived`, `start`, `complete`, and `cancel` controller handlers |
| `src/routes/pool.routes.ts` | Added `PATCH /pools/:id/arrived`, `/start`, `/complete`, and `/cancel` routes |
| `src/controllers/rideRequest.controller.ts` | Added `cancel` controller handler for `PATCH /ride-requests/:id/cancel` |
| `src/routes/rideRequest.routes.ts` | Added `PATCH /ride-requests/:id/cancel` route |
| `tests/state-machine.test.ts` | §9 Test #3 unit tests verifying state machine legality and rejection of invalid transitions |
| `tests/lifecycle.test.ts` | §9 Test #3 & #6 integration tests covering happy path, cancellation cutoff, fare reversion, and cross-user barriers |

### 2. Accepted Suggestions
- **Role-Aware Ownership Check Inside Service for `/cancel`:** Ownership validation for `PATCH /ride-requests/:id/cancel` is placed within `cancelRideRequest` service instead of generic `requireOwnership` middleware. This design accommodates two distinct authorization pathways: passengers owning the request (`rideRequest.passenger_id === userId`) vs. drivers cancelling on behalf of their pool (`rideRequest.pool.vehicle.driver_id === userId`). Generic route middleware cannot cleanly evaluate nested pool-vehicle-driver ownership hierarchies without duplicating DB lookups.
- **Omission of Audit Rows for Fare-Only Recomputes:** When a member cancels from a multi-rider pool, remaining members undergo dynamic fare rebalancing (e.g. reverting to solo estimate if down to 1 active member). Confirmed that fare changes are financial adjustments, not lifecycle state transitions; thus, no rows are appended to `ride_status_history` for fare-only updates.

### 3. Considered and Rejected / Modified Suggestions
- **Generic `PATCH /status` Endpoint:** Strongly rejected any generic status mutation endpoint in favor of explicit, intention-revealing operations (`markArrived`, `markStarted`, `markCompleted`, `cancelRideRequest`, `cancelPool`). This eliminates client-driven state corruption and enforces strict server-side state machine assertions.
- **Premature Wiring of `requireOwnership` Middleware:** Adhered strictly to plan to reserve `requireOwnership` for Step 9 detail endpoints (`/ride-requests/:id`), avoiding premature coupling on mutation routes where service-level role discrimination is required.

### 4. Verification Summary
- **Unit & Integration Tests:** 56/56 tests passing across all 8 test suites:
  - `tests/state-machine.test.ts`: Passed all tests verifying progressive transitions and rejecting disallowed state transitions (e.g. `COMPLETED -> STARTED`, `STARTED -> CANCELLED`, `CANCELLED -> any`).
  - `tests/lifecycle.test.ts`: Passed all 6 integration tests:
    1. Happy path: `arrived -> started -> complete` generated cash payments and full audit history.
    2. §9 test 6: cancellation blocked once pool reaches `STARTED`.
    3. Cancellation allowed before `STARTED` with automatic fare reversion to solo estimate for remaining member.
    4. Cross-user access denied (403 FORBIDDEN).
    5. Driver cancels pool before `STARTED` with fan-out to all active members.
    6. Invalid transitions (skipping states) rejected with 409 INVALID_TRANSITION.
- **Docker Compose Smoke Test:** Ran full containerized lifecycle via curl against `tinchaka-api` and live `tinchaka-db`, verifying pool status `COMPLETED`, member statuses `COMPLETED`, settled payment records, and complete `ride_status_history` audit chains.


