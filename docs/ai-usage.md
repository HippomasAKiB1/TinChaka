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
