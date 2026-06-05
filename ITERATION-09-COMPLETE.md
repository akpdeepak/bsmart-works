# Iteration 9 — Service Management / Customer Portal (completion)

Iteration 9 makes Works **sellable**: the external customer-facing surface — branded portals,
self-service requests, agent queues, customer-facing SLAs, a customer KB and CSAT. All ten Cap N /
Cap M specs (I09-S01…S10) are delivered end to end, workspace-isolated, event-sourced and tested.

## What was built

### Data model (V42) + seed (V43)
`customer_accounts`, `customer_users` (a **separate identity** from internal `users`), `request_types`
(with a JSON `form_schema`), `customer_sla_tiers`, `service_requests`, `csat_responses`, plus an
`articles.portal_published` flag. New permissions `manage_service` (LEAD) and `work_service` (MEMBER).
V43 seeds a demonstrable desk on **WS-002 (BCITS Support Desk)**: Platinum/Gold/Silver SLAs, the three
system request types with portal forms, and a demo customer (`admin@amrutilities.example` / `portal1234`).

### Backend (all workspace-scoped, RBAC at the service boundary, events on every mutation)
- **Customer accounts + portal users** (S01) — `CustomerAccountController`, with portal-user
  provisioning and password reset; hashes are never returned.
- **Request types + portal forms** (S03, S04) — `RequestTypeController`; `form_schema` validated as a
  JSON array; conditional `showIf` fields supported.
- **Multi-tier SLAs** (S10) — `CustomerSlaTierController`; an account's tier selects response/resolution
  targets applied at submit time.
- **Agent queues + lifecycle** (S05, S06) — `ServiceRequestController`: All open · Mine · Unassigned ·
  High priority; pick-up, assign, status lifecycle, work-item linking; every response carries the
  **server-computed SLA snapshot**.
- **CSAT** (S08) — `ServiceCsatController` trends; submission via the portal.
- **Customer portal API** (S02, S07, S09) — `CustomerAuthController` (separate login → customer-scoped
  JWT) + `CustomerPortalController`: request-types, submit, my-requests, request detail, CSAT, KB
  read/search, dashboard. Responses are customer-shaped (internal fields omitted).
- **KB portal publishing** (S07) — `ArticleController` gains `portal-publish` / `portal-unpublish`.

### Frontend
- **Customer portal** (`src/CustomerPortal.jsx`) — a separate, lighter experience served at `/portal`
  (routed in `main.jsx`), with its own session and per-account branding: login, dashboard, 2-step
  request submission (pick type → dynamic form), my-requests, request detail with SLA badge + CSAT
  stars, and the knowledge base. Design tokens only; a11y-clean.
- **Agent Service Desk** (in `App.jsx`) — a new nav entry with Queues, Customers, Request types, SLA
  tiers and CSAT tabs.
- `src/lib/serviceSla.js` — pure SLA presentation helpers.

## Tests (all `@Tag("unit")` / Vitest — green, coverage gate met)
Backend: `ServiceRequestServiceTest` (SLA states + lifecycle), `CsatServiceTest`,
`CustomerAccountServiceTest`, `RequestTypeServiceTest`, `CustomerSlaTierServiceTest`, customer-token
cases in `JwtUtilTest`, and `ServiceRequestControllerAccessTest` (cross-tenant + unauthorized, RB-40).
Frontend: `serviceSla.test.js`, `CustomerPortal.test.jsx`.

## Key decisions
- **Self-contained SLA engine.** Iteration 8's generalized SLA engine is not yet built, so the
  customer-facing SLA (S06) is implemented self-contained via `customer_sla_tiers` + a pure
  `ServiceRequestService.computeSla`. The agent and customer read the **same** computed snapshot — one
  engine, two contexts — so this folds into the iteration-8 engine later without an API change.
- **Two identity systems, cleanly separated.** Customer JWTs carry `scope=customer` + account/workspace
  claims; `CustomerContext` enforces scope on `/portal/**`, and a customer's subject is never a
  workspace member so internal RBAC denies it (defense in depth).
- **Customer requests are the incident record**, with an optional `linked_work_item_id` seam to an
  internal work item (full auto-creation of a linked WorkItem is logged as a follow-up).

## Migration numbering
Concurrent iteration 10/11 (AI Control Plane, #95) and an event-store migration landed on `main`
alongside this work, taking the Flyway high-water to **V41**. Service-management schema is therefore
**V42** (`service_management`) and the seed is **V43** (`seed_service_management`) — forward-only.

## Not in scope (logged follow-ups)
Custom domains / true DNS white-labeling, a drag-and-drop visual form designer (forms are JSON-schema
driven today), auto-creating a linked internal WorkItem on submission, and the customer-side admin UI
for self-provisioning portal users.
