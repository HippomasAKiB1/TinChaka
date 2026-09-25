# TinChaka — Master Build Plan (v2)
### (Dhaka Tesla Pool — RoBenDevs Internship Challenge)

> **Project name: TinChaka** ("তিন চাকা" — "three wheels"), a direct callback to the PRD's closing line: *"in Dhaka, your Tesla may have three wheels — but your engineering should still be production-minded."* Use this name consistently everywhere: repo name, package.json `name` fields, README title, Docker service/container names, video title, and demo deployment title. Do not fall back to generic names like "dhaka-tesla-pool" mid-project.
>
> **Naming conventions to apply immediately:**
> - GitHub repo: `tinchaka`
> - Backend package: `tinchaka-api`
> - Frontend package: `tinchaka-web`
> - Docker Compose project name / service prefixes: `tinchaka-api`, `tinchaka-web`, `tinchaka-db`
> - README H1: `# TinChaka — Dhaka Ride Pooling MVP`
>
> **Purpose of this document:** Single source of truth to build, test, dockerize, document, and ship the TinChaka MVP. Written for an AI coding agent to execute top-to-bottom with zero open decisions left to chance. Every choice below is final — if the agent wants to deviate, that's a flag to stop and ask, not to silently pick differently.

---

## 0. Ground Rules

- **Story cast everywhere, always:** Passengers = **Nusrat**, **Rafiq**, **Shirin**. Driver = **Jashim**. Vehicle = **Bullet**, capacity = 3 seats. No `user1`/`driver1` anywhere — seed data, tests, screenshots, video.
- **No paid infrastructure.** Free tiers only.
- **No secrets committed.** Only `.env.example` with placeholder values.
- **No over-engineering.** No microservices, Kafka, Kubernetes, Redis, queues. This is graded down, not up, for extra tech.
- **AI use disclosed, not hidden.** Log as you go (§11), not retroactively.
- **Understand everything shipped.** Every non-trivial piece of AI-generated code gets a one-line comment explaining *why*, so the human can defend it live without re-deriving it.

---

## 1. Locked Technical Decisions (no forks — execute as written)

| Decision | Choice | Why (final, ready for README) |
|---|---|---|
| Backend framework | **Express + TypeScript** | NestJS's DI/module ceremony costs setup time this MVP doesn't need. Express + a clear folder structure (routes/controllers/services/repositories) gets the same separation of concerns with less boilerplate. Switch to NestJS later only if the team grows past ~3 backend engineers and module boundaries become a real coordination problem. |
| Frontend | Next.js (App Router) | Mandated option; routing + SSR out of the box. |
| Database | PostgreSQL | Transactional guarantees needed for capacity/concurrency (§5). |
| ORM | Prisma | Type-safe schema + migrations + seed scripting in one tool. |
| Auth | JWT (access token, 24h expiry) + bcrypt | Stateless, no session infra needed at this scale. |
| Validation | Zod | Pairs with TS, minimal ceremony. |
| Styling | Tailwind CSS | Fast, no design-system overhead. |
| Testing | Jest + Supertest | Standard, minimal setup, good async/transaction test support. |
| Matching rule | **Same pickup zone only** (Option B) | Corridor/direction-compatibility logic is exactly the kind of unnecessary complexity the PRD warns against ("not a Google Maps rebuild"). Same-zone is a one-line, hand-verifiable rule an evaluator can check without a map. State this as a documented, deliberate simplification — not an oversight — in README trade-offs. |
| Pool/ride schema shape | **`ride_requests.pool_id` FK, no separate membership table** | `seats_requested` already lives on `ride_requests`; capacity is enforced by summing `seats_requested` for all `ride_requests` sharing a `pool_id`. A membership table would be a pure join with no extra attributes — unjustified complexity. |
| Deployment default | **Docker Compose is the primary deliverable.** Render (free tier) attempted as a stretch goal, not a dependency. | Free-tier availability changes; the grading rubric explicitly accepts "document the constraint, give reproducible Docker deployment" as a full-credit fallback. Don't burn build time chasing a flaky free host. |
| Distance model | Fixed lookup table of pairwise zone distances (not haversine) | Fully deterministic, zero floating-point geometry, trivially hand-verifiable — matches the fare model's "must be testable by hand" requirement better than computed geo-distance. |

---

## 2. Domain Model & Ride Lifecycle

### 2.1 State machine

```
REQUESTED → MATCHED → DRIVER_ARRIVED → STARTED → COMPLETED
                ↘ CANCELLED (only from REQUESTED, MATCHED, or DRIVER_ARRIVED)
```

- Each transition is its own backend function (`markMatched`, `markArrived`, `markStarted`, `markCompleted`, `cancelRide`) — never a generic `PATCH /status`.
- Every transition writes a row to `ride_status_history` (ride_request_id, from_status, to_status, changed_by_user_id, changed_at). This is the audit trail requirement.
- Transition functions validate current status server-side before mutating — client-sent status is never trusted.

### 2.2 Actors — responsibilities (unchanged from PRD, restated for completeness)

- **Passenger** (Nusrat/Rafiq/Shirin): signup/in, request ride, see fare, track status, view own history, cancel while valid.
- **Driver/Tesla** (Jashim/Bullet): sign in, online/offline toggle, see compatible pending requests in their zone, accept/pool, mark arrival/start/complete, see own vehicle's passengers/history only.
- **Ride/Pool**: multiple requests share one vehicle instance while occupied seats ≤ capacity; each passenger has an individually computed fare; pool membership is visible via shared `pool_id`.

### 2.3 Fare display state — CLOSED GAP

Two distinct fare numbers exist and must both be shown, labeled differently:

1. **Estimated fare** — shown immediately at `REQUESTED`, computed solo (no pool discount assumed), using `baseFare + distanceCharge`.
2. **Final fare** — recalculated and re-displayed the moment the ride transitions to `MATCHED` (pool discount applied if pooled). The passenger UI must visibly update this number at that transition, labeled "Final fare" vs. the earlier "Estimated fare" — do not silently overwrite one number with another with no indication it changed.

Backend implication: `ride_requests.fare_amount_poysha` is written twice — once (estimate) at creation, once (final) at match time — and both values are worth keeping (`estimated_fare_poysha`, `final_fare_poysha` as two columns) so the history/audit trail can show the discount effect. This also gives you a free, visible thing to point at in the video when explaining pooling.

---

## 3. Fare Model

```
passengerFare = baseFare + distanceCharge - poolDiscount
```

- `baseFare` = 30 (integer, poysha unit — 1 taka = 100 poysha).
- `distanceCharge` = `ratePerKm (e.g. 15 poysha/km) * distanceKm` from the fixed zone-distance lookup table.
- `poolDiscount` = 20% of `distanceCharge`, applied per passenger, **only** when `pool_id` has 2+ active `ride_requests`.
- All money stored as **integer poysha** — never floats — to avoid rounding drift in storage or comparisons.
- Payment: simulated only, enum `CASH` | `TESLAPAY_WALLET` on a `payments` record, no gateway.

**Worked example (put this verbatim in README, computed against final chosen constants):**
- Banani → Mohakhali distance: X km (fill from lookup table).
- Banani → Gulshan 1 distance: Y km (fill from lookup table).
- Nusrat solo estimate, Nusrat final pooled fare, Rafiq solo estimate, Rafiq final pooled fare — show all four numbers with the arithmetic spelled out so an evaluator can verify with a calculator in under a minute.

---

## 4. Database Schema (final — no "consider" language, this is what gets built)

- **`users`**: id, name, email (unique), password_hash, role (`PASSENGER`|`DRIVER`), created_at.
- **`vehicles`**: id, driver_id (FK→users, unique — one vehicle per driver for MVP), name, capacity (int, default 3), is_online (bool, default false).
- **`ride_requests`**: id, passenger_id (FK→users), pickup_zone, destination_zone, seats_requested (int), status (enum), pool_id (nullable FK→pools), estimated_fare_poysha (int), final_fare_poysha (nullable int), created_at, updated_at.
- **`pools`**: id, vehicle_id (FK→vehicles), status (enum, mirrors/aggregates member statuses — see note below), started_at (nullable), completed_at (nullable), created_at.
- **`ride_status_history`**: id, ride_request_id (FK), from_status, to_status, changed_by_user_id (FK→users), changed_at.
- **`payments`**: id, ride_request_id (FK, unique), method (enum), amount_poysha (int), status (enum), created_at.

**Note on `pools.status` vs `ride_requests.status`:** the pool has its own lifecycle (driver-facing: matched → arrived → started → completed) while each `ride_request` inside it can independently cancel before `STARTED`. Once the pool hits `STARTED`, no member can cancel. Enforce this in the `cancelRide` function, not just in the UI.

**DB-level constraints:**
- `vehicles.capacity > 0` (check constraint).
- `ride_requests.seats_requested > 0`.
- Unique constraint on `vehicles.driver_id` (one vehicle per driver, MVP simplification — state this as a documented limitation, not silently assumed).
- Indexes: `ride_requests(status)`, `ride_requests(pickup_zone)`, `vehicles(is_online)`, `ride_requests(pool_id)`.
- FK `ON DELETE RESTRICT` on all financial/audit-linked tables (`payments`, `ride_status_history`) — never cascade-delete money or audit records.

**ERD:** Mermaid `erDiagram`, committed to README, matching exactly the tables above — no drift.

---

## 5. Concurrency Handling

**Scenario:** Bullet has 1 seat left; Nusrat and Shirin both request it near-simultaneously.

**Implementation:**
1. Wrap the accept/join-pool operation in a single Postgres transaction.
2. Inside the transaction, `SELECT ... FOR UPDATE` on the target `pools` row (or the `vehicles` row if no pool exists yet) to acquire a row lock before reading current occupied seats.
3. Recompute occupied seats (`SUM(seats_requested)` over active `ride_requests` for that pool) **inside** the lock — never trust a pre-transaction read.
4. If adding the new request would exceed `vehicles.capacity`, roll back and return `409 Conflict`.
5. Commit only if capacity holds.

**Documented in README as:**
- *Now:* transactional row-lock, correct but serializes writes per-vehicle (acceptable at MVP volume).
- *At scale:* move to optimistic concurrency with a version column on `pools`, or an atomic counter in a fast store (mentioned as a future direction only — not implemented now, keeps ground rule "no Redis at MVP scale" intact).

**Required test:** fire two near-simultaneous accept requests for the last seat in an integration test (e.g. `Promise.all` against two Supertest calls); assert exactly one 200 and one 409, and that final occupied-seat count never exceeds capacity.

---

## 6. Backend Build Order

1. Scaffold: Express + TypeScript + Prisma + Postgres connection, folder structure (`routes/`, `controllers/`, `services/`, `repositories/`, `middleware/`).
2. `.env.example` + Docker Compose skeleton (api + db) — verify `docker compose up` works empty-but-running before adding features.
3. Prisma schema (§4) + migration + seed script (Jashim/Bullet/Nusrat/Rafiq/Shirin, plus 1-2 extra passengers for realistic "compatible requests" list testing).
4. Auth: signup/login, JWT issuance, `requireAuth` middleware, `requireRole('PASSENGER'|'DRIVER')` middleware.
5. **Ownership-check middleware, built once, used everywhere it applies (closes the audit gap):** a single `requireOwnership` helper that checks `req.user.id` against the resource's owner on **every** ride-detail, ride-history, and ride-mutation endpoint — not just list endpoints. Write this before building the endpoints that need it, so it's structurally impossible to forget on one route. Test explicitly: passenger A cannot `GET /rides/:id` for passenger B's ride, even with a valid token.
6. Passenger: `POST /ride-requests` → estimate fare (§2.3 estimate) → status `REQUESTED`.
7. Driver: `PATCH /vehicles/me/online`, `GET /ride-requests?zone=...&status=REQUESTED` (compatible/pending list, same-zone rule).
8. Accept/pool: `POST /pools` (new) or `POST /pools/:id/join` (existing) → capacity check per §5 → recompute final fare per §2.3 → status → `MATCHED` for all members.
9. Lifecycle: `PATCH /pools/:id/arrived|start|complete`, `PATCH /ride-requests/:id/cancel` — each validates current state, writes `ride_status_history`.
10. History/read endpoints, ownership-checked (per step 5) for both passenger and driver views.
11. Error handling + request logging middleware; Zod validation on every input; rate limit `/auth/*` minimally.

---

## 7. Frontend Build Order

1. Scaffold Next.js + Tailwind, base layout/nav, auth context.
2. Auth pages (signup/login, role selection).
3. Passenger: request-ride form → **two-stage fare display** per §2.3 (estimate, then final on match) → status tracker → history list → cancel (disabled once non-cancellable, per §4 pool-status note).
4. Driver: online/offline toggle → pending-request list (same-zone, per §1) → accept/pool action → active-ride panel (passengers, seats used/capacity, current stage) → arrival/start/complete controls → driver history.
5. Loading/error/empty states on every list and form — explicitly required, don't skip.
6. Pool view: show co-passenger presence (names/seat count) without exposing another passenger's private fare — this is the "obvious pool membership without leaking private data" requirement, made concrete.

---

## 8. Docker & Environment

- `docker-compose.yml`: `api`, `db` (Postgres), `web` (Next.js) services, healthchecks on `api` and `db`.
- `.env.example`: `DATABASE_URL`, `JWT_SECRET`, `PORT`, `NEXT_PUBLIC_API_URL` — placeholders only.
- Startup runs migrations + seed automatically (`prisma migrate deploy && prisma db seed` in an entrypoint script), documented as manual fallback in README if automation proves flaky.
- Gate: clean-clone `docker compose up` must work before Docker is considered done — this is a checkpoint, not a "should work."

---

## 9. Testing Plan

1. Bullet's capacity never exceeded (unit test on the capacity-check function).
2. Concurrent last-seat race — exactly one success, one 409 (§5).
3. Invalid state transitions rejected (e.g. `COMPLETED → STARTED` throws).
4. Nusrat/Rafiq pooled fares match the hand-computed worked example exactly (§3).
5. **Cross-user access denied on every ownership-checked route**, not just the list endpoint — test ride-detail, history, and cancel endpoints individually with passenger A's token against passenger B's ride ID (closes the audit gap from review).
6. Cancellation blocked once pool status is `STARTED` or `COMPLETED`.

---

## 10. Architecture Diagram & ERD

```
Browser --> Next.js (App Router) --> Express API --> PostgreSQL
```

Plus Mermaid `erDiagram` matching §4 exactly, and (optional, strong for the video) a sequence diagram of the accept→lock→capacity-check→commit flow from §5.

**Rule:** if implementation drifts from the diagram, the diagram is updated in the same PR — never let docs go stale.

---

## 11. AI Usage Log (`/docs/ai-usage.md`, updated continuously)

- Tools used + what for.
- One accepted suggestion.
- One rejected/modified suggestion — strong candidates: AI suggesting Redis/queue infra prematurely, a naive non-transactional seat check, floating-point money storage, or NestJS when Express was the better fit for scope. Pick whichever actually happened.
- Be ready to explain any AI-authored code live.

---

## 12. Git Workflow

**Repo name:** `tinchaka`.

**Branches:** `master`, `pre-release`, `release/v1.0.0`, plus `feature/*`:
`feature/project-scaffold`, `feature/docker-setup`, `feature/db-schema-and-seed`, `feature/auth`, `feature/ownership-middleware`, `feature/ride-request-flow`, `feature/tesla-pooling`, `feature/ride-lifecycle-transitions`, `feature/ride-history`, `feature/frontend-passenger-flow`, `feature/frontend-driver-flow`, `feature/testing`, `feature/deployment-docs`.

**Flow:** branch off `master` per feature → incremental commits → merge to `master` when working + minimally tested → cut `pre-release` once MVP features are integrated → fix integration/deploy issues there → cut `release/v1.0.0` from `pre-release`.

**Commit format:** `<type>(<scope>): <short description>` — `feat|fix|refactor|test|docs|chore|build`.

```
feat(auth): add passenger login endpoint
feat(pool): enforce Bullet's seat capacity
fix(pool): prevent overbooking available seats
feat(pool): add two-stage fare display (estimate → final)
build(docker): add compose setup for api, web, and postgres
docs(readme): add architecture diagram and ERD
test(concurrency): add last-seat race condition test
test(auth): verify cross-user ride access is denied
```

**Never:** vague messages, direct pushes to `master`, one giant initial commit, committed secrets.

---

## 13. Priority & Cut Line (NEW — explicit time-boxing)

If running behind schedule, cut **in this exact order** (top of list = cut first, bottom = never cut):

1. Bonus scaling write-up (§15) — cut entirely if short on time.
2. Render/free-host deployment attempt — fall back to Docker-only + documented reasoning.
3. Frontend visual polish (animations, transitions) beyond functional loading/error/empty states.
4. TeslaPay wallet UI — collapse to a single payment-method dropdown with no extra screens.
5. Driver online/offline toggle styling — a plain button is fine.
6. Optional sequence diagram (§10) — ERD + architecture diagram alone are sufficient.
7. **Never cut:** concurrency handling + its test (§5/§9-2), ownership checks + their tests (§6-5/§9-5), fare correctness test (§9-4), git branch discipline (§12), README core sections (§13-checklist below), and the 6-minute video. These are the highest-weighted, most-checked items — cutting any of these costs more than any three items above combined.

---

## 14. README Checklist

- [ ] Project name "TinChaka" explained in the summary (why: three-wheeled Tesla + the PRD's closing line — a nice, quick way to show you read the brief closely)
- [ ] Summary + problem statement (own words)
- [ ] Features implemented
- [ ] Screenshots/GIFs: passenger flow, driver flow, pooling, two-stage fare display
- [ ] Architecture diagram + ERD
- [ ] Tech stack, project structure, prerequisites
- [ ] Environment variables list
- [ ] Local setup + Docker instructions + migration/seed commands
- [ ] How to run tests
- [ ] Demo credentials (story-cast usernames)
- [ ] Deployment URL or documented Docker-only fallback + reasoning
- [ ] API overview (endpoint table)
- [ ] Key decisions & trade-offs — **explicitly include:** same-zone-only matching (§1), no-membership-table schema (§1), integer-poysha money (§3), transactional row-lock concurrency (§5), one-vehicle-per-driver limitation (§4)
- [ ] Known limitations
- [ ] Next improvements
- [ ] Technology justification table (§1, final wording)
- [ ] AI Usage section (§11)
- [ ] Demo video link

---

## 15. Bonus: Scaling Reasoning (cut first if short on time — see §13)

Cover in reasoning only (no implementation): load balancing/horizontal scaling, DB indexing/read replicas, caching, geospatial search (PostGIS instead of fixed zones), event queues for matching, WebSockets for live status, rate limiting/idempotency keys, observability, DB contention beyond row locks (sharding or dedicated seat-reservation service), retry/failure strategy, security at scale, deployment strategy (blue/green, autoscaling, managed Postgres replicas).

---

## 16. Six-Minute Video Script

- **0:00–1:00** — Problem, users, core idea, own words.
- **1:00–3:00** — Architecture + ERD walkthrough, one key decision (same-zone matching or no-membership-table schema), one trade-off (row-lock concurrency now vs. optimistic/versioned at scale).
- **3:00–6:00** — Live tour: passenger requests a ride, sees estimate; second passenger pools; driver accepts, both see final (discounted) fare update live; full lifecycle to completion; show the last-seat race condition test passing; deployment if live.

---

## 17. Submission Checklist

- [ ] Public repo, working MVP (frontend + backend + DB)
- [ ] Docker setup + `.env.example`, no secrets
- [ ] Migrations + seed data (story cast)
- [ ] Architecture diagram + ERD
- [ ] `master`/`pre-release`/`release/v1.0.0` with meaningful history
- [ ] All 6 required tests passing (§9)
- [ ] README fully checked (§14)
- [ ] Deployment link or documented fallback
- [ ] 6-minute video linked
- [ ] AI Usage section present and honest
- [ ] Bonus scaling section if time allowed

---

## 18. What NOT to Do

Don't pay for infra. Don't commit secrets. Don't submit one giant commit. Don't push straight to `master`. Don't add tech to look impressive. Don't polish UI while capacity/concurrency is broken. Don't hide AI usage or ship unexplainable code. Don't strip the story cast anywhere.

---

## 19. Order of Operations (execute top-to-bottom)

1. Read §1 — all decisions are final, do not re-litigate mid-build.
2. Design schema (§4) + ERD + architecture diagram (§10) before any code.
3. Scaffold repo + Docker Compose + `.env.example` (§8); verify empty-but-running.
4. Create `master`, start first `feature/*` branch (§12).
5. Backend, feature-by-feature (§6) — build the ownership middleware (step 5) before any endpoint that needs it, not after.
6. Frontend, feature-by-feature (§7), including the two-stage fare display (§2.3).
7. Concurrency implementation + test (§5/§9) — treat as core path, not a late add-on.
8. Tests land with each feature, not batched at the end (§9).
9. Keep AI usage log current (§11).
10. MVP complete on `master` → cut `pre-release` → fix integration/deploy → finalize README (§14).
11. Cut `release/v1.0.0`.
12. Deploy (Docker-first, Render as stretch) — see cut line (§13) if behind.
13. Record video (§16).
14. Bonus scaling doc if time allows (§15) — first thing cut if not (§13).
15. Run submission checklist (§17) before calling it done.
