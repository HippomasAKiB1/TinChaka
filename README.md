# TinChaka — Dhaka Ride Pooling MVP

A production-minded point-to-point ride pooling platform designed for Dhaka's transit reality, connecting commuters with three-wheeled electric vehicles ("Teslas") while ensuring strict transactional seat capacity enforcement, deterministic fare splitting, and an append-only audit trail.

---

## 1. Project Name (WHY "TinChaka")

"TinChaka" ("তিন চাকা" — three wheels) is a direct callback to the PRD's closing line: *"in Dhaka, your Tesla may have three wheels — but your engineering should still be production-minded."* The name is applied consistently across the repository, package manifests (`tinchaka-api`, `tinchaka-web`), and Docker Compose service identifiers (`tinchaka-api`, `tinchaka-web`, `tinchaka-db`).

---

## 2. Summary + Problem Statement (in our own words)

During evening rush hour at Banani, thousands of commuters like Nusrat and Rafiq compete for limited transport toward Mohakhali and Gulshan, while drivers like Captain Jashim navigate three-wheeled electric vehicles ("Teslas") with empty passenger capacity. Conventional single-passenger ride hailing inflates individual transit costs and worsens Dhaka's gridlock by putting under-utilized vehicles on saturated roadways.

The engineering challenge is dynamically pooling multiple independent passenger requests into a single 3-seat vehicle in real time while guaranteeing zero seat overbooking under concurrent access. TinChaka solves this by enforcing database row-level locking during seat allocation, calculating transparent two-stage fares with deterministic multi-rider discounts in integer poysha, and recording every state transition in an immutable audit trail.

---

## 3. Features Implemented

- **Role-Based Authentication:** Stateless JWT authentication (24-hour expiry) with bcrypt password hashing and strict role segregation (`PASSENGER` vs `DRIVER`).
- **Passenger Ride Request Flow:** Instant booking interface with destination zone selection, seat specification (1–3), and immediate solo fare estimation.
- **Two-Stage Dynamic Fare Display:** Displays solo estimate upon initial request, visibly updating to struck-through estimate and discounted final fare (20% distance discount) once matched in a multi-rider pool.
- **Driver Online Availability & Zone Declaration:** Optimistic UI availability toggle with station zone picker persisted in `localStorage`.
- **Pending Request Discovery Feed:** Real-time polling feed displaying compatible same-zone ride requests with seat-fitting validation.
- **Atomic Pooling Engine:** Single `POST /pools/accept` endpoint utilizing PostgreSQL `SELECT ... FOR UPDATE` row locks inside a transaction to prevent race conditions and enforce the 3-seat capacity limit.
- **Strict State Machine Lifecycle:** Progressive 5-stage lifecycle (`REQUESTED` $\rightarrow$ `MATCHED` $\rightarrow$ `DRIVER_ARRIVED` $\rightarrow$ `STARTED` $\rightarrow$ `COMPLETED`) preventing illegal state transitions.
- **State-Enforced Cancellation with Cutoff:** Passengers and drivers can cancel during early stages with automatic fare rebalancing for remaining riders; cancellations are strictly blocked once the trip transitions to `STARTED`.
- **Co-Passenger Presence with Privacy:** Displays co-passenger names, pickup zones, and seat allocations without leaking individual fare amounts.
- **Trip History & Financial Summaries:** Historical trip logs for passengers (receipts and payment records) and drivers (collected cash totals).
- **Append-Only Audit Trail:** Centralized `ride_status_history` logging actor IDs, timestamps, previous status, and target status for every transition.
- **Containerized Single-Command Boot:** Unified Docker Compose orchestration with automated entrypoint migrations, story-cast database seeding, and health checks.

---

## 4. Screenshots — The Banani Rush-Hour Story

The screenshots below walk through a complete ride-pooling trip on the
live deployment at **https://tinchaka-web.vercel.app**. They are in
chronological order — the same sequence the 6-minute video demo uses.

### 1. Rafiq requests a ride
![Rafiq requests a ride](docs/screenshots/01-rafiq-requests.png)
_Rafiq books Banani → Mohakhali and sees the ৳75 solo estimate before
pooling._

### 2. Nusrat requests a ride in the same zone
![Nusrat requests a ride](docs/screenshots/02-nusrat-requests.png)
_Nusrat books Banani → Mohakhali in the same pickup zone, unlocking the
same-zone matching rule (§1 of the project plan)._

### 3. Jashim goes online and sees both pending requests
![Driver pending list](docs/screenshots/03-driver-pending.png)
_Same-zone matching surfaces both Banani pickups to the driver, each
showing their ৳75 solo estimate._

### 4. Jashim accepts both — pool formed with 2 riders
![Pool formed](docs/screenshots/04-driver-pool.png)
_Bullet seats 2/3. The transactional accept (§5) enforced capacity on
the way in; the pool now waits for one more rider or for the driver to
advance._

### 5. Nusrat's fare drops from ৳75 to ৳66
![Nusrat — two-stage fare display](docs/screenshots/05-passenger-fare.png)
_§2.3: the estimate is struck through and the final fare recomputed
with the 20% pool discount. The "Pooled discount" badge appears live._

### 6. Rafiq's fare drops from ৳75 to ৳66
![Rafiq — fare recomputed](docs/screenshots/06-rafiq-fare.png)
_Same transition on Rafiq's side — each passenger sees only their own
fare, never the other's._

### 7. Trip progresses through the state machine
![Driver lifecycle controls](docs/screenshots/07-driver-lifecycle.png)
_Matched → Arrived → Started → Completed. Cancellation is blocked once
the pool is `STARTED` (§9 test 6)._

### 8. Nusrat's ride history after completion
![Nusrat history](docs/screenshots/08-nusrat-history.png)
_Simulated CASH payment recorded at ৳66 with full status history from
the audit trail._

### 9. Rafiq's ride history after completion
![Rafiq history](docs/screenshots/09-rafiq-history.png)
_Same record on the co-passenger's side — total ৳132 collected on the
pooled trip._

### 10. Jashim's trip history
![Driver history](docs/screenshots/10-driver-history.png)
_The driver sees completed pools newest-first, with the total fares
collected for each trip._

---

## 5. Architecture Diagram + ERD

### Database Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    users ||--o| vehicles : "owns (1:1)"
    users ||--o{ ride_requests : "places"
    users ||--o{ ride_status_history : "audits transition"
    vehicles ||--o{ pools : "operates"
    pools ||--o{ ride_requests : "contains (1:N via pool_id)"
    ride_requests ||--o{ ride_status_history : "records history"
    ride_requests ||--o| payments : "settles (1:1)"

    users {
        uuid id PK
        varchar name
        varchar email UK
        varchar password_hash
        UserRole role
        timestamptz created_at
    }

    vehicles {
        uuid id PK
        uuid driver_id FK,UK
        varchar name
        int capacity
        boolean is_online
        timestamptz created_at
    }

    pools {
        uuid id PK
        uuid vehicle_id FK
        PoolStatus status
        timestamptz started_at
        timestamptz completed_at
        timestamptz created_at
    }

    ride_requests {
        uuid id PK
        uuid passenger_id FK
        varchar pickup_zone
        varchar destination_zone
        int seats_requested
        RideRequestStatus status
        uuid pool_id FK "nullable"
        int estimated_fare_poysha
        int final_fare_poysha "nullable"
        timestamptz created_at
        timestamptz updated_at
    }

    ride_status_history {
        uuid id PK
        uuid ride_request_id FK
        RideRequestStatus from_status "nullable"
        RideRequestStatus to_status
        uuid changed_by_user_id FK
        timestamptz changed_at
    }

    payments {
        uuid id PK
        uuid ride_request_id FK,UK
        PaymentMethod method
        int amount_poysha
        PaymentStatus status
        timestamptz created_at
    }
```
_Normalized relational schema with direct `ride_requests.pool_id` linkage, foreign key RESTRICT constraints, and immutable audit logs._

### System Architecture Diagram

```mermaid

flowchart TD
    subgraph Client["Client Layer - Browser"]
        UI["Next.js App Router<br/>Passenger Booking and Tracker<br/>Driver Panel and Pool Controls<br/>Tailwind CSS"]
    end

    subgraph API["API Server - Node.js, Express, TypeScript"]
        Router["Express Routing and Middleware<br/>requireAuth: JWT verification<br/>requireRole: PASSENGER or DRIVER<br/>requireOwnership: Resource isolation<br/>Zod Input Validation"]
        Controllers["Controllers and Services<br/>AuthService<br/>RideRequestService: Fare estimation<br/>PoolService: Seat calculation and Discount<br/>RideLifecycleService: State machine and Audit"]
        PrismaClient["Prisma ORM Client<br/>PostgreSQL Transactions<br/>SELECT FOR UPDATE Row Locks"]
    end

    subgraph DB["Data Layer - PostgreSQL"]
        PostgresDB[("PostgreSQL 15<br/>Strict Constraints and Enums<br/>Immutable Audit History<br/>ACID Transactions")]
    end

    UI -->|HTTP and JSON| Router
    Router --> Controllers
    Controllers --> PrismaClient
    PrismaClient -->|Connection Pool| PostgresDB
```

_Three-tier monolithic architecture prioritizing transactional integrity, minimal runtime latency, and zero distributed state._

---

## 6. Tech Stack + Project Structure + Prerequisites

### Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Backend API** | Express + TypeScript | Node 20 / Express 4.19 | REST API endpoints, routing, and domain service logic |
| **Frontend Web** | Next.js (App Router) | Next.js 14.2.5 (React 18) | Server-rendered pages, client dashboards, and polling UI |
| **Database** | PostgreSQL | 15 Alpine | ACID-compliant relational data store with row-level locking |
| **ORM / Data Access** | Prisma | 5.18 | Type-safe queries, relational schema migrations, and seeding |
| **Authentication** | JWT + bcrypt | jsonwebtoken 9 / bcryptjs 2.4 | Stateless authorization tokens and salted password hashing |
| **Input Validation** | Zod | 3.23 | Strict runtime payload and query parameter schema validation |
| **Styling** | Tailwind CSS | 3.4 | Utility-first responsive design without UI framework bloat |
| **Testing** | Jest + Supertest | Jest 29 / Supertest 7 | Unit testing, integration testing, and concurrent race tests |

### Project Structure

```
tinchaka/
├── docs/                      # Architectural designs, project plans, and AI logs
│   ├── PRD.md                 # Product requirements document
│   ├── PROJECT_PLAN.md        # Master build plan and specifications
│   ├── architecture.md        # Technical architecture, ERD, and fare matrix
│   ├── ai-usage.md            # AI interaction and review log
│   └── screenshots/           # UI walkthrough captures
├── tinchaka-api/              # Express + TypeScript backend application
│   ├── prisma/                # Database schema, migrations, and seed script
│   │   ├── schema.prisma      # PostgreSQL models, enums, and indexes
│   │   ├── migrations/        # Timestamped SQL migration files
│   │   └── seed.ts            # Story-cast demo data seeder
│   ├── src/                   # Source code
│   │   ├── controllers/       # Request handlers
│   │   ├── domain/            # State machine assertion rules
│   │   ├── middleware/        # Auth, role, logging, rate limit, and validation
│   │   ├── routes/            # REST endpoint definitions
│   │   ├── schemas/           # Zod validation schemas
│   │   ├── services/          # Business logic and database operations
│   │   ├── app.ts             # Express app setup and middleware pipeline
│   │   └── server.ts          # Server listener entry point
│   ├── tests/                 # Jest integration and concurrency test suites
│   ├── Dockerfile             # Multi-stage production container build
│   └── entrypoint.sh          # Container migration and server startup script
├── tinchaka-web/              # Next.js 14 App Router frontend application
│   ├── app/                   # App Router pages and layouts
│   │   ├── driver/            # Driver dashboard and active pool controls
│   │   ├── passenger/         # Passenger dashboard and ride tracker
│   │   ├── login/             # Authentication page with demo credentials
│   │   ├── signup/            # Registration page
│   │   ├── layout.tsx         # Root layout with AuthProvider and TopNav
│   │   └── page.tsx           # Landing page with role CTAs
│   ├── components/            # Reusable UI components
│   ├── lib/                   # API client helpers, auth context, and zones
│   └── Dockerfile             # Next.js standalone container build
├── .env.example               # Environment variable template
├── .gitattributes             # Line-ending normalizations
├── .gitignore                 # Build and dependency exclusions
└── docker-compose.yml         # Multi-container orchestration definition
```

### Prerequisites

- **Node.js:** `v20.x` LTS
- **Docker Desktop:** Version 24+ with Docker Compose v2
- **System Memory:** Minimum 4 GB RAM available

---

## 7. Environment Variables

The project reads environment variables from `.env` in the root workspace or passes them directly into containers via `docker-compose.yml`.

| Variable Name | Required By | Purpose | Example Value |
|---|---|---|---|
| `POSTGRES_USER` | `tinchaka-db`, `tinchaka-api` | PostgreSQL database superuser | `postgres` |
| `POSTGRES_PASSWORD` | `tinchaka-db`, `tinchaka-api` | PostgreSQL database password | `postgres_password_placeholder` |
| `POSTGRES_DB` | `tinchaka-db`, `tinchaka-api` | PostgreSQL database name | `tinchaka_db` |
| `DATABASE_URL` | `tinchaka-api` | Prisma connection string | `postgresql://postgres:postgres_password_placeholder@tinchaka-db:5432/tinchaka_db?schema=public` |
| `JWT_SECRET` | `tinchaka-api` | Secret key for signing authorization tokens | `replace-me-with-a-long-random-string` |
| `PORT` | `tinchaka-api` | HTTP listening port for Express API | `3001` |
| `NEXT_PUBLIC_API_URL` | `tinchaka-web` | Public API base URL used by browser | `http://localhost:3001` |

> **Security Note:** No production secrets or live credentials are committed to version control. The repository contains only `.env.example` with safe placeholder values.

---

## 8. Local Setup + Docker + Migrations

### Primary Setup: Docker Compose (Single Command)

1. Clone the repository:
   ```bash
   git clone https://github.com/HippomasAKiB1/TinChaka.git
   cd TinChaka
   ```
2. Copy the environment configuration:
   ```bash
   cp .env.example .env
   ```
3. Build and launch all services:
   ```bash
   docker compose up -d --build
   ```

*Automated Database Initialization:* The `tinchaka-api` container automatically executes `npx prisma migrate deploy` followed by `npx prisma db seed` upon container boot via `entrypoint.sh`.

### Manual Database Migration & Seeding Fallback

If running migrations manually against a running database container:
```bash
cd tinchaka-api
npx prisma migrate deploy
npx prisma db seed
```

### Local Development (Non-Docker API & Web)

1. Start only the PostgreSQL database container:
   ```bash
   docker compose up -d tinchaka-db
   ```
2. Configure `tinchaka-api/.env` pointing `DATABASE_URL` to `localhost:5432`:
   ```bash
   cd tinchaka-api
   npm install
   npx prisma migrate deploy
   npx prisma db seed
   npm run dev
   ```
3. Start the Next.js frontend:
   ```bash
   cd ../tinchaka-web
   npm install
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## 9. How to Run Tests

All automated tests run against a live PostgreSQL database to validate transactions, row locks, and foreign key integrity.

1. Ensure the database container is active:
   ```bash
   docker compose up -d tinchaka-db
   ```
2. Run the test suite:
   ```bash
   cd tinchaka-api
   npm test
   ```

### Test Coverage Summary (77 Tests across 12 Suites)

All test suites execute with `--runInBand` to prevent transaction isolation races across suites:

- **§9 Test 1: Capacity & Fare Bounds** (`tests/pool.test.ts`): Enforces vehicle capacity limit of 3, rejects zone mismatches, and verifies solo vs pooled fare arithmetic.
- **§9 Test 2: Concurrency Race Condition** (`tests/concurrency.test.ts`): Simulates near-simultaneous booking requests for the last remaining vehicle seat under `Promise.all`; proves exactly one request succeeds (200) while the competing request is rejected (409 Conflict) with no seat overbooking.
- **§9 Test 3: State Machine Legality** (`tests/state-machine.test.ts`): Verifies forward progression and rejects illegal status transitions (e.g. `COMPLETED → STARTED`).
- **§9 Test 4: Fare Arithmetic Precision** (`tests/fare.test.ts`): Confirms integer poysha calculations match the Dhaka distance matrix exactly without floating-point drift.
- **§9 Test 5: Resource Ownership & Isolation** (`tests/ride-detail.test.ts`): Proves passengers cannot read or manipulate rides belonging to other commuters.
- **§9 Test 6: Lifecycle Cancellation Cutoff** (`tests/lifecycle.test.ts`): Enforces that cancellation is permitted before trip start, triggers dynamic fare rebalancing, and is strictly prohibited once `STARTED`.
- **Additional Test Suites:** Auth (`tests/auth.test.ts`), Vehicle availability (`tests/vehicle.test.ts`), Zone matrix (`tests/zones.test.ts`), CORS preflight rate limit bypass (`tests/cors.test.ts`), Passenger co-rider visibility (`tests/passenger-pool-visibility.test.ts`), Ride requests (`tests/ride-request.test.ts`), and Health/rate limit checks (`tests/backend-polish.test.ts`).

---

## 10. Demo Credentials (Story Cast)

The database seed (`prisma/seed.ts`) populates the system with canonical characters from `PROJECT_PLAN.md §0`:

| Role | Name | Vehicle / Context | Email | Password |
|---|---|---|---|---|
| **Passenger** | Nusrat | Commuter (Banani $\rightarrow$ Mohakhali) | `nusrat@tinchaka.dev` | `tinchaka123` |
| **Passenger** | Rafiq | Commuter (Banani $\rightarrow$ Gulshan 1) | `rafiq@tinchaka.dev` | `tinchaka123` |
| **Passenger** | Shirin | Commuter (Banani $\rightarrow$ Mohakhali) | `shirin@tinchaka.dev` | `tinchaka123` |
| **Driver** | Jashim | Operator of "Bullet" (Capacity: 3) | `jashim@tinchaka.dev` | `tinchaka123` |
| **Driver** | Karim | Operator of "Bijli" (Capacity: 3) | `karim@tinchaka.dev` | `tinchaka123` |

> **Notice:** All credentials use the demo password `tinchaka123`. These accounts are for evaluation only and must never be reused in production.

---

## 11. Deployment

### Live deployment (bonus)

A working live deployment is available for evaluators who want to click
through without running anything locally:

- **Frontend:** https://tinchaka-web.vercel.app
- **Backend API:** https://tinchaka-api.vercel.app
- **Database:** Neon Serverless Postgres

Log in with any of the demo credentials from §10 (e.g.
`nusrat@tinchaka.dev` / `tinchaka123`).

**Notes on the live environment:**
- Vercel free tier — the first request after idle takes 1–3 s
  (serverless cold start). If you see a transient `500` on the very
  first click, hard-refresh (Ctrl+Shift+R) and retry — the function
  warms up in a second and subsequent calls are instant. This is a
  free-tier cold-start quirk, not a defect in the application logic.
- The in-memory rate limiter on `/auth/*` is disabled on Vercel because
  serverless instances do not share state. It remains active in the
  Docker deployment.
- `bcryptjs` (pure JS) is used instead of `bcrypt` (native) because
  Vercel's build environment blocks native compilation via install
  scripts. Hash format is identical, so seed passwords verify unchanged.
- Prisma Client generation is forced through a `postinstall` hook,
  because `vercel.json`'s `builds` array bypasses Vercel's UI Build
  Command.
- Neon migrations and seed were applied once from a local shell via
  `npx prisma migrate deploy && npx prisma db seed`.
- **For a fully deterministic experience with no cold-start caveats,
  use the Docker Compose deployment below** — it is the primary
  deliverable for exactly this reason.

### Deployment reasoning

The plan's §13 cut line puts a paid-host deployment below core
functionality in priority. Rather than gamble on a free-tier backend
with >50 s cold starts (Render was prototyped and rejected for this
reason), the deployment targets **Vercel (serverless) + Neon
(serverless Postgres)** — both free tiers, both responsive, and the
combination best preserves the concurrency guarantees the concurrency
test exercises. **Docker Compose remains the primary deliverable**
because it is the deterministic, no-cold-start, no-rate-limit caveat
environment the plan explicitly asks for; Vercel is the click-through
bonus.

### Primary deliverable — Docker Compose

**Docker Compose is the primary deliverable** per `PROJECT_PLAN.md §1`
and `§13`. It is the deterministic, fully reproducible evaluation
environment — no cloud dependency, no cold starts, no rate-limit
caveats. Everything below runs from a clean clone with a single command.

```bash
git clone https://github.com/HippomasAKiB1/TinChaka.git
cd TinChaka
cp .env.example .env
docker compose up -d --build
```

---

## 12. API Overview

All routes except `/auth/*` and `/health` require a valid bearer token passed in the `Authorization: Bearer <token>` header.

| Method | Endpoint | Auth | Role | Purpose |
|---|---|---|---|---|
| `POST` | `/auth/signup` | Public | Any | Register a new passenger or driver account |
| `POST` | `/auth/login` | Public | Any | Authenticate user credentials and return signed JWT |
| `GET` | `/health` | Public | Any | Health check verifying API status and live PostgreSQL connection |
| `POST` | `/ride-requests` | Required | `PASSENGER` | Create a new ride request and compute solo estimated fare |
| `GET` | `/ride-requests/me` | Required | `PASSENGER` | List active and historical ride requests for the caller |
| `GET` | `/ride-requests?zone=...` | Required | `DRIVER` | List pending unpooled requests matching the driver's pickup zone |
| `GET` | `/ride-requests/:id` | Required | Owner / Driver | Retrieve detailed ride status with complete transition audit trail |
| `PATCH`| `/ride-requests/:id/cancel` | Required | Owner / Driver | Cancel an individual ride request before trip start |
| `PATCH`| `/vehicles/me/online` | Required | `DRIVER` | Toggle driver availability status (`is_online`) |
| `POST` | `/pools/accept` | Required | `DRIVER` | Atomically accept a request into an existing or new vehicle pool |
| `GET` | `/pools/me/active` | Required | `DRIVER` | Retrieve the driver's current active pool, members, and fares |
| `GET` | `/pools/me/history` | Required | `DRIVER` | List completed and cancelled vehicle pools for the driver |
| `PATCH`| `/pools/:id/arrived` | Required | `DRIVER` | Transition pool and members from `MATCHED` to `DRIVER_ARRIVED` |
| `PATCH`| `/pools/:id/start` | Required | `DRIVER` | Transition pool and members to `STARTED` (locks cancellation) |
| `PATCH`| `/pools/:id/complete` | Required | `DRIVER` | Transition pool to `COMPLETED` and generate settled payment records |
| `PATCH`| `/pools/:id/cancel` | Required | `DRIVER` | Cancel entire pool prior to trip start and release occupied seats |

---

## 13. Key Decisions & Trade-offs

This project explicitly documents every trade-off made to achieve production-grade reliability within the MVP scope:

### 1. Same-Pickup-Zone-Only Matching (Option B)
- **Decision:** Requests are eligible for pooling only if they originate from the exact same pickup zone (`pickup_zone`).
- **Why:** Rebuilding Google Maps routing or corridor-direction geometry would introduce high complexity and external dependencies. A discrete same-zone rule is hand-verifiable and provides immediate value for high-density commuter hubs like Banani station.
- **At Scale:** Transition to PostGIS corridor matching where vehicles pick up riders whose origin and destination align with the route trajectory within an angular threshold.

### 2. No Membership Table (`ride_requests.pool_id` Foreign Key)
- **Decision:** Ride requests directly reference their assigned pool via a nullable foreign key `ride_requests.pool_id`, with no intermediate `pool_members` join table.
- **Why:** Key attributes (`seats_requested`, individual fares, passenger IDs) already live on `ride_requests`. A join table would be an empty relational link adding unnecessary join overhead.
- **At Scale:** Reintroduce an explicit membership entity if pool-level member attributes emerge (e.g. per-passenger pickup timestamps, ratings, or seat reassignment history).

### 3. Integer-Poysha Money Storage & Dhaka Pricing Calibration
- **Decision:** All monetary amounts are stored and calculated strictly as integer poysha ($1\text{ Taka} = 100\text{ poysha}$), with `baseFare = 3000 poysha` (৳30) and `ratePerKm = 1500 poysha` (৳15/km).
- **Why:** Eliminates IEEE-754 floating-point rounding errors and fractional currency drift. Per `architecture.md §4(e)`, scaling the constants by $100\times$ aligns the calculations with real-world Dhaka transit pricing rather than unrealistic sub-taka fractions.
- **At Scale:** Retain integer storage; support multi-currency integer scaling (e.g. minor currency units).

### 4. Transactional Row-Lock Concurrency (`SELECT ... FOR UPDATE`)
- **Decision:** Concurrency control during ride acceptance uses PostgreSQL row-level pessimistic locking (`SELECT ... FOR UPDATE` inside `prisma.$transaction`).
- **Why:** Provides absolute consistency guarantees when multiple requests compete for the final seat. Occupied capacity is re-summed inside the transaction lock, completely eliminating race conditions.
- **Trade-off:** Serializes write operations per vehicle pool.
- **At Scale:** Adopt optimistic concurrency with a version column on `pools` or an in-memory atomic counter in Redis to achieve higher throughput under thousands of concurrent drivers.

### 5. One Vehicle per Driver
- **Decision:** Enforced a `UNIQUE` database constraint on `vehicles.driver_id`.
- **Why:** Aligns with the Dhaka owner-operator reality for electric vehicles ("Teslas") and eliminates ambiguous vehicle selection during authentication and pooling.
- **At Scale:** Expand into a fleet management model where drivers can be assigned to different vehicles across operating shifts.

### 6. Client-Declared Driver Zone
- **Decision:** The driver explicitly selects their operating zone via a dropdown menu, passed as a `?zone=...` query parameter.
- **Why:** Real-time GPS tracking and geofencing were outside the MVP scope. Self-reporting enables deterministic testing and immediate deployment without device sensor permissions.
- **At Scale:** Replace client-selected zones with background GPS coordinate streaming and reverse geocoding into polygon transit zones.

---

## 14. Known Limitations

- **Co-Corridor Pooling:** Commuters travelling along the same route who board one station apart cannot be pooled together under same-zone matching.
- **Absence of Live GPS Tracking:** Vehicle locations and station zones are declared manually by drivers rather than derived from hardware GPS sensors.
- **Simulated Payment Gateway:** Payment transactions settle as internal database records (`CASH` or `TESLAPAY_WALLET`) without external payment gateway callbacks.
- **Polling over WebSockets:** Frontend dashboards refresh data via 3-second HTTP polling intervals instead of persistent duplex WebSocket connections.
- **Single-Vehicle Driver Binding:** Drivers cannot operate multiple vehicles simultaneously or transfer active pools between shifts.
- **Cloud Hosting Constraints:** Cloud-hosted deployment on free-tier providers was omitted due to cold-start limits in favor of reproducible local Docker execution.

---

## 15. Next Improvements

1. **WebSocket Event Bus:** Replace HTTP polling with Socket.io / WebSocket event push for instant status updates and driver-passenger notifications.
2. **PostGIS Spatial Matching:** Implement spatial routing algorithms with PostGIS to pool passengers along compatible directional corridors.
3. **Optimistic Concurrency Control:** Introduce versioned entity records or Redis-based distributed locks to increase acceptance throughput under extreme scale.
4. **Mobile Financial Services Integration:** Integrate bKash and Nagad payment gateway SDKs with webhook settlement verification.
5. **Fleet & Shift Management:** Allow fleet owners to manage multiple vehicles, assign drivers to shifts, and monitor real-time battery telemetry.
6. **Automated CI/CD Pipeline:** Deploy GitHub Actions workflows to execute linter checks, type checking, and the complete Jest integration suite on every pull request.

---

## 16. Technology Justification Table

The following technical decisions were established in `PROJECT_PLAN.md §1` and strictly maintained throughout implementation:

| Decision | Choice | Why (final, production-minded rationale) |
|---|---|---|
| **Backend framework** | **Express + TypeScript** | NestJS's DI/module ceremony costs setup time this MVP doesn't need. Express + a clear folder structure (routes/controllers/services/repositories) gets the same separation of concerns with less boilerplate. Switch to NestJS later only if the team grows past ~3 backend engineers and module boundaries become a real coordination problem. |
| **Frontend** | **Next.js (App Router)** | Mandated option; routing + SSR out of the box. |
| **Database** | **PostgreSQL** | Transactional guarantees needed for capacity/concurrency (§5). |
| **ORM** | **Prisma** | Type-safe schema + migrations + seed scripting in one tool. |
| **Auth** | **JWT (access token, 24h expiry) + bcrypt** | Stateless, no session infra needed at this scale. |
| **Validation** | **Zod** | Pairs with TS, minimal ceremony. |
| **Styling** | **Tailwind CSS** | Fast, no design-system overhead. |
| **Testing** | **Jest + Supertest** | Standard, minimal setup, good async/transaction test support. |
| **Matching rule** | **Same pickup zone only (Option B)** | Corridor/direction-compatibility logic is exactly the kind of unnecessary complexity the PRD warns against ("not a Google Maps rebuild"). Same-zone is a one-line, hand-verifiable rule an evaluator can check without a map. State this as a documented, deliberate simplification — not an oversight — in README trade-offs. |
| **Pool/ride schema shape** | **`ride_requests.pool_id` FK, no separate membership table** | `seats_requested` already lives on `ride_requests`; capacity is enforced by summing `seats_requested` for all `ride_requests` sharing a `pool_id`. A membership table would be a pure join with no extra attributes — unjustified complexity. |
| **Deployment default** | **Docker Compose is the primary deliverable** | Free-tier availability changes; the grading rubric explicitly accepts "document the constraint, give reproducible Docker deployment" as a full-credit fallback. Don't burn build time chasing a flaky free host. |
| **Distance model** | **Fixed lookup table of pairwise zone distances** | Fully deterministic, zero floating-point geometry, trivially hand-verifiable — matches the fare model's "must be testable by hand" requirement better than computed geo-distance. |

---

## 17. AI Usage

Development of TinChaka utilized Antigravity (powered by Gemini 3.8 Flash) as an interactive pair-programming partner across all build phases, adhering to the disclosure principles in `PROJECT_PLAN.md §0 & §11`.

- **Accepted Suggestion:** In Step 7, Antigravity recommended implementing pessimistic row-level locking (`SELECT ... FOR UPDATE`) directly inside the Prisma transaction callback to prevent race conditions during seat allocation. This suggestion was accepted because it guarantees ACID consistency at the database level and passes §9 Test 2 with zero distributed dependencies. In Step 8, Antigravity suggested role-scoped ownership authorization inside the service layer for cancellation and detail endpoints, allowing passengers and drivers to access rides through their respective relationship paths without duplicating route middleware queries.
- **Considered & Rejected Suggestion:** In Step 8, an initial proposal suggested exposing a generic `PATCH /status` endpoint to handle state updates. This was rejected in favor of explicit, intention-revealing lifecycle functions (`markArrived`, `markStarted`, `markCompleted`, `cancelRideRequest`) to prevent client-side state manipulation and enforce server-side state machine assertions. In Step 7, optimistic locking via version columns was evaluated and rejected for the MVP to avoid retry loops during high-contention spikes on single vehicles.

For a complete chronological record of AI interactions, prompts, architectural considerations, and verification transcripts across all 14 steps, see [`docs/ai-usage.md`](docs/ai-usage.md).

---

## 18. Demo Video

🎥 **[Demo Video Link](<https://youtu.be/Qv579qT00J4>)**  
_Recorded at final submission (6 minutes); covers problem context, architectural walkthrough, ERD, live pooling demonstration with Nusrat, Rafiq, and Jashim, dynamic fare discount updates, and automated concurrency race test execution._

---

## 19. License

This project is licensed under the MIT License — educational and evaluation release for the RoBenDevs Internship Challenge.

---

## Author

**Akib Hasan** — Dhaka, Bangladesh

- 🌐 Website: [akibhasan.me](https://akibhasan.me)
- 💼 LinkedIn: [linkedin.com/in/akib-hasan-pyil](https://linkedin.com/in/akib-hasan-pyil)
- 🐙 GitHub: [@HippomasAKiB1](https://github.com/HippomasAKiB1)
- 📧 Email: [akibhasankp1245@gmail.com](mailto:akibhasankp1245@gmail.com)
- ✉️ Alt: [mail@akibhasan.me](mailto:mail@akibhasan.me)

_Built as a submission for the RoBenDevs internship challenge, September 2026._

---