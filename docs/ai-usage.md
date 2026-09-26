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

---

## Log Entry 8: Ride Detail, History & Cross-User Security (Step 9)

- **Date / Timestamp:** 2026-09-26T21:44:00+06:00
- **AI Tools Used:** Antigravity (powered by Gemini 3.8 Flash)
- **Phase Covered:** Step 9 (Ride detail endpoint with full audit history, driver active pool and pool history queries, cross-user isolation barriers, §9 Test #5 ride detail test suite)
- **Branch:** `feature/ride-history`

### 1. Files Added / Modified

| File | Purpose |
|------|---------|
| `src/services/rideRequest.service.ts` | Added `getRideRequestForUser` with role-aware authorization and transition history inclusion |
| `src/controllers/rideRequest.controller.ts` | Added `detail` controller handler for `GET /ride-requests/:id` |
| `src/routes/rideRequest.routes.ts` | Mounted `GET /ride-requests/:id` with `requireAuth` |
| `src/services/pool.service.ts` | Added `getActivePoolForDriver` and `listDriverHistory` querying driver pools |
| `src/controllers/pool.controller.ts` | Added `active` and `history` controller handlers |
| `src/routes/pool.routes.ts` | Mounted `GET /pools/me/active` and `GET /pools/me/history` routes before parameterized routes |
| `tests/ride-detail.test.ts` | §9 Test #5 integration suite covering 12 test cases for cross-user isolation, role gates, and history |

### 2. Accepted Suggestions
- **Route-Ordering Precedence Gotcha (`/pools/me/*` vs `/pools/:id/*`):** In Express routing, static path segments must precede parameterized path segments. Registered `GET /pools/me/active` and `GET /pools/me/history` strictly before `/pools/:id/*` routes to prevent Express from capturing the string literal `"me"` as a pool UUID parameter `:id`.

### 3. Considered and Rejected / Modified Suggestions
- **Option A Decision on `requireOwnership` Middleware:** Evaluated whether to wire the generic `requireOwnership` middleware directly onto `GET /ride-requests/:id`. Formally chose **Option A**: enforcing authorization inside `getRideRequestForUser` at the service layer. Because the resource ownership rule is fundamentally role-dependent (a PASSENGER must match `rideRequest.passenger_id`, while a DRIVER must operate the pool vehicle matching `rideRequest.pool.vehicle.driver_id`), a generic owner-id extractor middleware cannot express this without duplicate queries or premature complexity (Option B). The intent of `PROJECT_PLAN.md §6 step 5` ("structurally impossible to forget" cross-user barriers) is completely satisfied by routing all detail reads through the single validated service method.
- **Returning 404 vs 403 on Cross-User Requests:** Maintained strict return of 403 FORBIDDEN for cross-user attempts on existing rides (per §6 step 5 and §9 test 5), while returning 404 NOT_FOUND only when the ride UUID genuinely does not exist or fails UUID format validation.

### 4. Verification Summary
- **Unit & Integration Tests:** 68/68 tests passing across all 9 test suites:
  - `tests/ride-detail.test.ts`: Passed all 12 test cases:
    1. Nusrat reads her own ride with $\ge 2$ audit history rows.
    2. Rafiq blocked with 403 from Nusrat's ride.
    3. Nusrat blocked with 403 from Rafiq's ride.
    4. Shirin (unrelated passenger) blocked with 403.
    5. Jashim (driver operating the pool) reads member ride with 200.
    6. Jashim blocked with 403 from another driver's pool member ride.
    7. Unauthenticated request rejected with 401.
    8. Nonexistent ride returns 404.
    9. Jashim reads his active pool with 200.
    10. Passenger blocked with 403 from driver active pool route.
    11. Jashim reads his pool history with 200.
    12. Passenger blocked with 403 from driver history route.
- **Docker Compose Smoke Test:** Verified against live containerized API and PostgreSQL:
  - `GET /ride-requests/:id` with Nusrat token $\rightarrow$ 200 with history.
  - `GET /ride-requests/:id` with Rafiq token $\rightarrow$ 403.
  - `GET /ride-requests/:id` with Shirin token $\rightarrow$ 403.
  - `GET /ride-requests/:id` with no token $\rightarrow$ 401.
  - `GET /pools/me/active` as Jashim $\rightarrow$ 200 with active pool.
  - `GET /pools/me/history` as Jashim $\rightarrow$ 200 with pool history.

---

## Log Entry 9: Backend Polish, Security Hardening & Observability (Step 10)

- **Date / Timestamp:** 2026-09-26T21:54:00+06:00
- **AI Tools Used:** Antigravity (powered by Gemini 3.8 Flash)
- **Phase Covered:** Step 10 (PROJECT_PLAN.md §6 step 11: Request logging, /auth/* rate limiting, route parameter and query Zod validation, database-connected /health endpoint, cleanup of cancelPool re-export)
- **Branch:** `feature/backend-polish`

### 1. Files Added / Modified

| File | Purpose |
|------|---------|
| `src/services/rideRequest.service.ts` | Removed legacy `cancelPool` re-export to keep service boundaries clean |
| `src/middleware/requestLogger.ts` | Logged method, path, HTTP status, elapsed time in ms, and caller user ID (omits /health and never logs request bodies) |
| `src/middleware/rateLimit.ts` | Configured `authLimiter` via `express-rate-limit` (10 requests per 15 min per IP on `/auth/*` only) |
| `src/middleware/validateParam.ts` | Added `validateUuidParam` ensuring 400 VALIDATION_ERROR for malformed UUID parameters |
| `src/schemas/rideRequest.schema.ts` | Added `.strict()` rejecting unexpected body properties with 400; added `pendingInZoneQuerySchema` |
| `src/controllers/rideRequest.controller.ts` | Applied `pendingInZoneQuerySchema` to query params |
| `src/routes/rideRequest.routes.ts` | Wired `validateUuidParam('id')` on `:id` endpoints |
| `src/routes/pool.routes.ts` | Wired `validateUuidParam('id')` on `:id` transition endpoints |
| `src/app.ts` | Mounted `requestLogger` first, wired `authLimiter` to `/auth`, updated `/health` to query `SELECT 1` |
| `tests/backend-polish.test.ts` | Integration test suite verifying rate limiting, DB-backed health check, strict body validation, and UUID param validation |

### 2. Accepted Suggestions
- **`cancelPool` Re-export Cleanup:** Removed the temporary `export { cancelPool } from './pool.service'` statement from `rideRequest.service.ts`. Confirmed all callers import `cancelPool` directly from `pool.service.ts`, eliminating module boundary confusion.
- **Test-Mode Rate Limiter Design:** To prevent IP-reuse contention across the 68 existing integration test cases running in a single Jest process, `authLimiter` uses `skip: () => process.env.NODE_ENV === 'test' && process.env.TEST_RATE_LIMIT !== 'true'`. This leaves rate limiting fully active in development, staging, and production Docker environments, while enabling selective testing in `tests/backend-polish.test.ts`.
- **Strict Zod Body Validation (`.strict()`):** Configured `.strict()` on `createRideRequestSchema`. Rather than silently stripping unexpected payload fields, the API explicitly rejects unknown properties with 400 VALIDATION_ERROR to prevent unvetted input.

### 3. Verification Summary
- **Unit & Integration Tests:** 72/72 tests passing across all 10 test suites:
  - `tests/backend-polish.test.ts`: Passed all 4 cases (11th login returns 429, GET /health returns `{ status: 'ok', db: 'up' }`, unknown body field returns 400, non-UUID param returns 400).
- **Docker Compose Smoke Test:** Verified in containerized production environment:
  - `GET /health` returned `HTTP 200 {"status":"ok","db":"up"}`.
  - 11 rapid requests to `POST /auth/login` returned ten 401s followed by 429 Too Many Requests on the 11th request.
  - Container logs verified `[req] ...` logging format without leaking password bodies.

---

## Log Entry 10: Frontend Foundation & Authentication UI (Step 11)

- **Date / Timestamp:** 2026-09-26T22:20:00+06:00
- **AI Tools Used:** Antigravity (powered by Gemini 3.8 Flash)
- **Phase Covered:** Step 11 (PROJECT_PLAN.md §7 steps 1-2: Typed API client, AuthProvider & session management, TopNav with Bengali subtitle, Landing page with role CTAs, Login & Signup pages with client validation, Collapsible Demo Credentials panel)
- **Branch:** `feature/frontend-auth`

### 1. Files Added / Modified

| File | Purpose |
|------|---------|
| `tinchaka-web/lib/api.ts` | Typed `apiFetch<T>` wrapper and `ApiError` handling `Authorization: Bearer <token>`, JSON serialization/deserialization, and error code parsing |
| `tinchaka-web/lib/auth.tsx` | React `AuthProvider` and `useAuth` hook managing `tinchaka.session` in `localStorage`, login, signup, and logout with SSR hydration guard |
| `tinchaka-web/lib/validation.ts` | Client-side validation helper (`validateLogin`, `validateSignup`) mirroring backend Zod constraints without external UI dependencies |
| `tinchaka-web/components/DemoCredentials.tsx` | Collapsible demo credentials drawer displaying story-cast accounts (Nusrat, Rafiq, Shirin, Jashim) with auto-fill support |
| `tinchaka-web/components/TopNav.tsx` | Sticky top navigation bar showing TinChaka branding, Bengali subtitle, session status, and login/signup/logout actions |
| `tinchaka-web/app/layout.tsx` | App layout wrapped with `AuthProvider` and `TopNav`, retaining Dhaka ride pooling metadata and dark theme styling |
| `tinchaka-web/app/page.tsx` | Landing page featuring live status badge, value proposition, session welcome-back card, and role-based navigation CTAs |
| `tinchaka-web/app/login/page.tsx` | Login form with inline error alerts, submit button loading states, demo credentials drawer, and redirect to role dashboards |
| `tinchaka-web/app/signup/page.tsx` | Registration form with Passenger/Driver role radio options, client validation, inline error alerts, and demo accounts drawer |
| `tinchaka-web/app/globals.css` | Dark theme base styling with emerald accent focus outlines and scrollbars |
| `.gitignore` | Added `*.tsbuildinfo` to exclude TypeScript incremental build artifacts |

### 2. Accepted Suggestions
- **Typed `apiFetch` Wrapper:** Built a clean wrapper using native `fetch` reading `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3001`). Handles 204 No Content gracefully and extracts structured error objects (`{ error: { code, message } }`) into `ApiError`.
- **Session Management via LocalStorage:** Implemented `tinchaka.session` storage inside `AuthProvider`. Guarded against React 18 / Next.js SSR hydration mismatches by setting initial `isLoading: true` and hydrating session inside `useEffect`.
- **Zero Additional Frontend Dependencies:** Implemented client validation and UI components using plain React 18, Next.js 14 App Router, and Tailwind CSS without importing any external UI or form libraries.
- **Story-Cast Demo Accounts Panel:** Embedded collapsible credentials panel referencing Nusrat, Rafiq, Shirin, and Jashim from `docs/PROJECT_PLAN.md §0`, allowing single-click form pre-filling for faster evaluation.

### 3. Verification Summary
- **Next.js Production Build:** `npm run build` in `tinchaka-web` succeeded with 0 errors, prerendering `/`, `/_not-found`, `/login`, and `/signup`.
- **Docker Compose Smoke Test:**
  - `docker compose up -d --build` started `tinchaka-db`, `tinchaka-api`, and `tinchaka-web`.
  - `curl.exe http://localhost:3000` verified root HTML contains "TinChaka".
  - `curl.exe http://localhost:3000/login` verified login HTML rendered.
  - `curl.exe http://localhost:3000/signup` verified signup HTML rendered.
  - `curl.exe POST http://localhost:3001/auth/login` verified live round-trip authentication returning 200 with JWT token for `nusrat@tinchaka.dev`.

---

## Log Entry 11: CORS Middleware Registration & Preflight Rate Limit Bypass (Step 11.1)

- **Date / Timestamp:** 2026-09-26T22:38:00+06:00
- **AI Tools Used:** Antigravity (powered by Gemini 3.8 Flash)
- **Phase Covered:** Step 11.1 (CORS middleware registration for browser clients, preflight OPTIONS rate limit bypass, regression test suite)
- **Branch:** `feature/fix-cors`

### 1. Files Added / Modified

| File | Purpose |
|------|---------|
| `tinchaka-api/package.json` | Added `cors` dependency and `@types/cors` devDependency |
| `tinchaka-api/src/app.ts` | Imported `cors` and mounted `app.use(cors())` before `express.json()` and route mounts |
| `tinchaka-api/src/middleware/rateLimit.ts` | Added `req.method === 'OPTIONS'` bypass to `skip` predicate so browser preflights never consume auth rate limit quota |
| `tinchaka-api/tests/cors.test.ts` | Added Supertest regression tests asserting `access-control-allow-origin` on OPTIONS and GET, and absence of `RateLimit-Limit` on preflights |

### 2. Context & Root Cause
- **CORS Middleware:** `cors()` was dropped during the Step 10 `app.ts` polish rewrite; not caught by Supertest because Supertest bypasses browser preflight checks. Added regression test asserting CORS headers are always present.
- **Preflight Rate Limiting:** Browser preflight OPTIONS requests to `/auth/*` were previously hitting the auth rate limiter, consuming quota before the actual request. Explicitly skipping `OPTIONS` in the rate limiter prevents preflight consumption.

### 3. Verification Summary
- **Unit & Integration Tests:** 74/74 tests passing across 11 test suites (72 existing + 2 new CORS regression tests).
- **Docker Compose Smoke Test:**
  - `OPTIONS /auth/login` with Origin returned 204 with `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`, and no `RateLimit-Limit` header.
  - `POST /auth/login` with Origin returned 200 with `Access-Control-Allow-Origin: *` and authentication payload.

---

## Log Entry 12: Passenger Dashboard, Fare Display & Co-Passenger Privacy (Step 12)

- **Date / Timestamp:** 2026-09-26T22:56:00+06:00
- **AI Tools Used:** Antigravity (powered by Gemini 3.8 Flash)
- **Phase Covered:** Step 12 (PROJECT_PLAN.md §7 step 3: Passenger dashboard, request form, two-stage fare display with pooled discount, co-passenger presence without fare leakage, ride status stepper, and cancellation control)
- **Branch:** `feature/frontend-passenger`

### 1. Files Added / Modified

| File | Purpose |
|------|---------|
| `tinchaka-api/src/services/rideRequest.service.ts` | Added `listPassengerRideRequestsWithPool` exposing co-passenger names/seats without leaking individual fares |
| `tinchaka-api/src/controllers/rideRequest.controller.ts` | Updated `listMine` controller to return pool members with ride requests |
| `tinchaka-api/tests/passenger-pool-visibility.test.ts` | Added integration tests verifying co-passenger visibility, absence of fare fields in member objects, and cancellation filtering |
| `tinchaka-web/lib/zones.ts` | Client-side definition of Dhaka's 9 zones matching backend distance matrix |
| `tinchaka-web/lib/format.ts` | Currency formatting helper `formatPoysha` converting poysha to Taka without dropping fractions |
| `tinchaka-web/lib/rides.ts` | Typed frontend API client methods (`createRide`, `listMyRides`, `cancelRide`) |
| `tinchaka-web/app/passenger/RequestForm.tsx` | Ride request form with zone pickers, seat selector (1-3), validation, and active ride disablement |
| `tinchaka-web/app/passenger/ActiveRide.tsx` | Active ride card featuring 5-stage visual progress stepper, two-stage fare display, co-passenger presence, and trip cancellation |
| `tinchaka-web/app/passenger/HistoryList.tsx` | Historical ride list displaying completed and cancelled trips with fare breakdowns |
| `tinchaka-web/app/passenger/page.tsx` | Protected passenger dashboard orchestrating real-time 3-second polling, ride state management, and role guarding |

### 2. Accepted Suggestions
- **Strict Co-Passenger Privacy:** `listPassengerRideRequestsWithPool` explicitly queries `pool_members` with only `{ id, name, seats_requested }`, strictly omitting `estimated_fare_poysha` and `final_fare_poysha` from other riders to protect passenger privacy per §7 step 6.
- **Two-Stage Dynamic Fare UI:** Implemented §2.3 requirement in `ActiveRide`: shows `Estimated fare: ৳75` when `REQUESTED`, and transitions to show struck-through `Estimated: ৳75` alongside prominent emerald `Final fare: ৳66` with a "Pooled discount" badge when matched in a multi-rider pool.
- **Visual Progress Stepper & Cancellation Guard:** Built a 5-step progress stepper (Requested → Matched → Arrived → Started → Completed). Cancellation is enabled during pre-trip stages (`REQUESTED`, `MATCHED`, `DRIVER_ARRIVED`) and cleanly disabled with explanatory tooltip once `STARTED`.

### 3. Verification Summary
- **Backend Tests:** 77/77 tests passing across 12 test suites (including 3 new tests in `passenger-pool-visibility.test.ts`).
- **Frontend Build:** `npm run build` completed successfully with `/passenger` included in static route table.
- **Browser Smoke Test (Chrome Subagent):**
  - Logged into live Next.js application as `nusrat@tinchaka.dev`.
  - Created a ride from Banani to Mohakhali (1 seat).
  - Verified active ride card displayed `Estimated fare: ৳75` under `Banani → Mohakhali` with `Requested` stage active, co-passengers showing `Solo ride`, and active `Cancel ride` button.

---

## Log Entry 13: Driver Dashboard, Pooling Lifecycle & Dynamic 2-Member Discount (Step 13)

- **Date / Timestamp:** 2026-09-26T23:34:00+06:00
- **AI Tools Used:** Antigravity (powered by Gemini 3.8 Flash)
- **Phase Covered:** Step 13 (PROJECT_PLAN.md §7 step 4: Driver dashboard, vehicle online status toggle, zone declaration, pending ride requests list, pool acceptance, multi-rider 20% discount calculation, and trip lifecycle progression)
- **Branch:** `feature/frontend-driver`

### 1. Files Added / Modified

| File | Purpose |
|------|---------|
| `tinchaka-web/lib/driver.ts` | Typed driver API client methods (`setOnline`, `getActivePool`, `getPendingRequests`, `acceptRequest`, `markArrived`, `markStarted`, `markCompleted`, `cancelPool`, `getDriverHistory`) |
| `tinchaka-web/app/driver/OnlineToggle.tsx` | Vehicle availability pill switch with optimistic UI updates and live radar badge |
| `tinchaka-web/app/driver/ZonePicker.tsx` | Persistent zone selection dropdown stored in `localStorage.tinchaka.driver.zone` |
| `tinchaka-web/app/driver/PendingList.tsx` | Real-time pending requests feed in the driver's zone with seat fitting checks and `Accept & pool` action |
| `tinchaka-web/app/driver/ActivePoolPanel.tsx` | Active vehicle pool panel showing seat occupancy (e.g. `Seats: 2 / 3 (Bullet)`), riders list, 4-stage stepper, and lifecycle buttons |
| `tinchaka-web/app/driver/DriverHistory.tsx` | Past completed/cancelled pools list summarizing member counts and total cash collected |
| `tinchaka-web/app/driver/page.tsx` | Protected driver dashboard orchestrating 3-second data polling, role enforcement, and active pool views |

### 2. Accepted Suggestions
- **Optimistic Online Status:** The online pill immediately flips state and triggers a background PATCH to `/vehicles/me/online`, rolling back seamlessly if the server errors.
- **Persistent Zone Declaration:** Selected zone defaults to `Banani` and persists across sessions in `localStorage`, maintaining consistent local state for drivers.
- **Dynamic 20% Two-Member Discount:** Verified §2.3 and §5 pooling rules: 1-member pool maintains solo estimated fare (`৳75`); when a second rider joins the same pool, both fares dynamically recalculate with the 20% pooling discount (`৳66` and `৳78`), displaying struck-through original estimates with emerald discount badges.
- **Full Trip Lifecycle Controls:** Implemented progressive lifecycle actions from `MATCHED` $\rightarrow$ `DRIVER_ARRIVED` ("Mark arrived at pickup") $\rightarrow$ `STARTED` ("Start trip") $\rightarrow$ `COMPLETED` ("Complete trip & collect cash fares"), locking cancellations once the vehicle starts rolling.

### 3. Verification Summary
- **Backend Tests:** 77/77 tests passing across 12 test suites.
- **Frontend Build:** `npm run build` succeeded with `/driver` and `/passenger` in the static route table.
- **Browser Smoke Test (Chrome Subagent):**
  - Signed in as Captain Jashim (`jashim@tinchaka.dev`) and accepted Nusrat (`nusrat@tinchaka.dev`).
  - Signed in as Rafiq (`rafiq@tinchaka.dev`) and requested Banani $\rightarrow$ Mohakhali ride.
  - Accepted Rafiq into Jashim's pool, raising capacity to `2 / 3` seats and triggering dynamic 20% pooling discount (`৳66` fare).
  - Advanced Jashim through `Arrived` $\rightarrow$ `Started` $\rightarrow$ `Completed` lifecycle.
  - Verified total cash fares collected (৳132) on driver history and completed receipt on Nusrat's passenger dashboard.

---

## Log Entry 14: Pre-release Branch Cut & Clean-Clone Verification (Step 14A)

- **Date / Timestamp:** 2026-09-26T23:50:00+06:00
- **AI Tools Used:** Antigravity (powered by Gemini 3.8 Flash)
- **Phase Covered:** Step 14A (Merged driver flow to master, cut long-lived pre-release branch, conducted clean-clone Docker build and end-to-end container health & authentication verification)
- **Branch:** `pre-release`

### 1. Operations Performed

| Action | Description |
|--------|-------------|
| Merge to Master | Merged `feature/frontend-driver` cleanly into `master` via non-fast-forward merge (`chore: merge driver flow into master`). |
| Branch Cut | Created fresh long-lived branch `pre-release` from updated `master`. |
| Local Clean Clone | Cloned the repository from local filesystem to `$env:TEMP/tinchaka-clone-*` and checked out `pre-release`. |
| File Tree Verification | Confirmed all essential files present: `tinchaka-api/`, `tinchaka-web/`, `docs/`, `docker-compose.yml`, `.env.example`, `.gitattributes`, `.gitignore`, `README.md`, and `tinchaka-api/entrypoint.sh`. |
| Container Build & Boot | Executed `docker compose up -d --build` inside the clean clone directory. All three containers built and reached healthy/running states (`tinchaka-db`, `tinchaka-api`, `tinchaka-web`). |
| End-to-End Verification | Verified `GET /health` returned `200 {"status":"ok","db":"up"}` and `POST /auth/login` returned `200` with valid JWT token and `Access-Control-Allow-Origin: *`. |
| Teardown & Cleanup | Cleanly stopped and removed all containers with `docker compose down` and deleted the temporary clone directory. |

### 2. Issues Found and Resolved
- **PowerShell JSON Parameter Quoting:** When testing `curl.exe` with JSON payloads on Windows PowerShell, PowerShell stripped double quotes inside string arguments before invoking native executables. Resolved by utilizing the `--%` stop-parsing symbol (`curl.exe ... --% -d "{\"email\":\"...\"}"`), ensuring literal JSON delivery to the API container.
- **Clean-Clone Integrity:** Confirmed no files were missing from git tracking; Docker build contexts, Prisma migrations, entrypoint scripts, and Next.js standalone configurations compiled and booted identically to the primary workspace.

### 3. Verification Summary
- **Health Check:** `curl.exe http://localhost:3001/health` returned `HTTP 200 {"status":"ok","db":"up"}`.
- **Auth Endpoint:** `POST /auth/login` returned `HTTP 200` with user object and signed JWT token.
- **Teardown:** Clean clone removed with zero dangling containers or networks.

---

## Log Entry 15: Master Build Plan README Documentation (Step 14B)

- **Date / Timestamp:** 2026-09-26T23:54:00+06:00
- **AI Tools Used:** Antigravity (powered by Gemini 3.8 Flash)
- **Phase Covered:** Step 14B (Wrote comprehensive project README per PROJECT_PLAN.md §14 checklist across 19 dedicated sections)
- **Branch:** `pre-release`

### 1. Operations Performed

| Section | Content & Details |
|---|---|
| Project Title & Name | Explained "TinChaka" ("তিন চাকা" — three wheels) referencing the PRD's closing line. |
| Problem Statement | Described Banani rush hour transit gridlock and the engineering challenge of capacity enforcement, dynamic pooling, and audit logging. |
| Features Implemented | Documented all completed features in present tense across auth, request, pooling, lifecycle, history, and Docker. |
| Screenshots | Created `docs/screenshots/.gitkeep` and referenced four core flow screenshots with descriptive captions. |
| Architecture & ERD | Inlined the full Mermaid `erDiagram` and `flowchart TD` diagrams from `docs/architecture.md`. |
| Tech Stack & Structure | Documented versions, tree hierarchy, and prerequisites (Node 20, Docker Desktop). |
| Environment Variables | Tabulated every environment variable from `.env.example` with descriptions and non-secret examples. |
| Setup & Migrations | Documented primary single-command `docker compose up -d --build` alongside local dev and manual migration fallbacks. |
| Testing Guide | Documented execution of 77 tests across 12 suites with explicit file paths for all §9 required tests. |
| Story Cast Credentials | Tabulated Nusrat, Rafiq, Shirin, Jashim, and Karim with demo password `tinchaka123`. |
| Deployment | Documented Docker Compose as the primary deliverable and provided the technical justification for the Render free-tier fallback per §1 and §13. |
| API Overview | Tabulated all 16 REST endpoints matching routes implemented on disk. |
| Key Decisions & Trade-offs | Detailed the 6 core architectural decisions (same-zone matching, no-membership table, integer poysha money, row-lock concurrency, one vehicle per driver, client-declared zone). |
| Limitations & Next Steps | Documented the known MVP limitations and future improvements (WebSockets, PostGIS, bKash/Nagad). |
| Justification Table | Inlined the 12-row technology justification table verbatim from `PROJECT_PLAN.md §1`. |
| AI Usage & Video Placeholder | Summarized AI pairing methodology, accepted/rejected suggestions, and provided the 6-minute video placeholder. |

### 2. Verification Summary
- **Section Verification:** Confirmed all 19 required sections are present with valid Markdown headings.
- **Diagram Rendering:** Both Mermaid blocks formatted without proprietary styling for native GitHub rendering.

---

## Log Entry 16: Release Branch Cut, Fresh-Volume Verification & Release Tagging (Step 14C)

- **Date / Timestamp:** 2026-09-27T00:03:00+06:00
- **AI Tools Used:** Antigravity (powered by Gemini 3.8 Flash)
- **Phase Covered:** Step 14C (Cut release/v1.0.0 branch from pre-release, performed clean fresh-volume Docker stack verification, verified database seed cast, and created annotated release tag v1.0.0)
- **Branch:** `release/v1.0.0`

### 1. Operations Performed

| Action | Description |
|--------|-------------|
| Cut Release Branch | Created `release/v1.0.0` directly from `pre-release` at commit `d2b8891`. |
| Fresh Volume Teardown & Rebuild | Executed `docker compose down -v` followed by `docker compose up -d --build` to force clean volume creation and re-test automated migrations and seeding via `entrypoint.sh`. |
| Container Status Verification | Confirmed all 3 services (`tinchaka-db`, `tinchaka-api`, `tinchaka-web`) reached running and healthy states (`Up (healthy)`). |
| Multi-Endpoint Smoke Check | Verified HTTP 200 on all core endpoints: `GET /health` (200), `GET /` (200), `GET /passenger` (200), `GET /driver` (200), `GET /login` (200). |
| Seed Integrity Verification | Queried PostgreSQL `users` table via `docker exec`; confirmed exactly the 6 canonical story-cast accounts exist: Karim, Nusrat, Rafiq, Rumi, Shirin (PASSENGER) and Jashim (DRIVER). |
| Teardown | Executed `docker compose down` leaving the host environment clean. |
| Tag Creation | Created annotated Git tag `v1.0.0` pointing to the release deliverable with message: `"TinChaka MVP v1.0.0 — Dhaka ride pooling, story-cast, Docker Compose deliverable"`. |

### 2. Verification Summary
- **HTTP Status Check:** All 4 web routes and API health check returned `HTTP 200`.
- **Database Seed Check:** 6 users returned in exact alphabetical and role-sorted order.
- **Git Tag Check:** `git tag --list` confirmed `v1.0.0` pointing to `d2b8891`.




---

## Log Entry 15A: Vercel Serverless Prep + Neon Postgres Migration

- **Date / Timestamp:** 2026-09-27T00:43:00+06:00
- **AI Tools Used:** Antigravity (powered by Claude Sonnet 4.6 Thinking)
- **Phase Covered:** Step 15A — Vercel deployment preparation; Neon DB migration
- **Commit:** `3eedd01` on `release/v1.0.0`
- **Branch:** `release/v1.0.0`

### 1. Operations Performed

| File / Action | Change |
|---|---|
| `tinchaka-api/api/index.ts` (new) | Vercel serverless entry point — imports `app`, no `listen()` call |
| `tinchaka-api/vercel.json` (new) | `@vercel/node` build config routing all traffic to `api/index.ts` |
| `tinchaka-api/src/config/db.ts` | Global `PrismaClient` caching gated on `VERCEL=1` only; Docker/test always create a fresh instance to preserve test isolation |
| `tinchaka-api/src/middleware/rateLimit.ts` | Added `process.env.VERCEL === '1'` to skip predicate — in-memory window state is not shared across serverless instances |
| `tinchaka-api/src/app.ts` | Replaced wide-open `cors()` with an origin allowlist: `localhost:3000` always allowed; `FRONTEND_URL` env var adds the deployed Vercel frontend URL |
| Neon migration | `prisma migrate deploy` applied `20260925201845_init` to Neon Postgres (`neondb` at `ap-southeast-1`) |
| Neon seed | `prisma db seed` inserted story-cast users + vehicles into Neon |

### 2. Docker Verification (Task 5 Gate)

- `docker compose up -d --build` rebuilt both images cleanly (Prisma generate + tsc succeeded).
- `GET http://localhost:3001/health` → `{"status":"ok","db":"up"}` ✅
- `npm test` (with Docker stack running): **77/77 tests, 12/12 suites** ✅

### 3. Accepted Suggestions
- **Vercel-scoped global PrismaClient:** Initial implementation used `NODE_ENV !== 'production'` as the global-caching guard, which broke test isolation by reusing a Prisma instance across Jest test files that might have different DB states. Corrected to `VERCEL === '1'` so only serverless invocations benefit from caching; Docker and Jest always get a fresh client.
- **FRONTEND_URL allowlist:** Replaced wide-open `cors()` with an explicit origin allowlist. `localhost:3000` is always included for Docker/local dev; the Vercel frontend URL is added via `FRONTEND_URL` env var.

### 4. Considered and Rejected
- **`log: ['query']` in non-production:** Enabled Prisma query logging for all non-production environments; this caused "Cannot log after tests are done" Jest warnings and was revised to `log: []` in non-production (errors only in production remains the correct choice for signal-to-noise ratio).
- **Global caching in all non-production environments:** Rejected; caused test DB connection failures as Jest re-uses a globally-cached but potentially closed Prisma client across serial test suites.

### 5. Secret Handling
- Neon connection string was passed exclusively as a PowerShell `$env:DATABASE_URL` shell-scoped variable.
- `git log --all -p` scan confirmed zero secret strings in any tracked file or commit.

### 6. Human Corrections & Guidance Acknowledged
1. **Rule — Never commit the Neon connection string:** Confirmed adherence; string never written to `.env`, source code, config file, or commit message.
2. **Rule — Docker is primary deliverable:** Vercel additions are purely additive; Docker health check and 77-test suite used as the pass/fail gate.
