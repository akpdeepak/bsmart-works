# Refactor Plan — Iteration 9 · Cap N + M · Service Management / Customer Portal

> Iteration 9 (Release 9.0) — *"External customer portal with self-service requests, queues,
> customer-facing SLAs, customer KB. The external face of Works — and the point Works becomes
> sellable."*
> Branch: `claude/iteration-10-complete-y6ls0` · Pipeline: `docs/REFACTOR_MASTER_PROMPT.md`
> Status: **implemented + green** (backend + frontend), pending PR review.

> **Scope note (batching).** All ten iteration-9 specs (I09-S01…S10) on one branch, per the owner
> directive to complete the iteration in one pass. Iteration 9 is the genuine next iteration
> (iteration 8 is `Done`); nothing built ahead. It builds directly on iteration 8's SLA engine.

---

## Classification: **Missing** (built to spec)

No service-management code existed. Built fresh, reusing the established patterns (workspace-scoped
parameterized queries, RBAC at the service boundary, event-sourced mutations) and the iteration-8
SLA engine for customer-facing countdowns.

### Phase-1 findings by lens
- **Architect:** the customer portal is a *separate identity domain* — external `customer_accounts`
  must never reuse internal `users` or an internal session. Built a parallel portal auth flow
  (`PortalAuthController` + `PortalAuthenticatedUser`) issuing a portal JWT, but on the **same**
  `JwtUtil` and BCrypt scheme — one identity mechanism, two audiences (not a second crypto stack).
- **System designer:** every customer read/write is **organization-scoped from the verified token**,
  never the request body. The single catastrophic risk (customer A seeing customer B's data) is
  closed at the API with `findByIdAndOrganizationId`-style guards, proven by cross-org tests.
- **Product manager:** delivers the chapter's journeys — branded portal, request submission via a
  per-type form, agent queue pickup with a visible SLA countdown, customer KB self-service, CSAT.
- **UI/UX lead:** the portal is a deliberately lighter, friendlier surface (2-step submit, large
  targets) distinct from the internal power-user agent console; both honour tokens + the five states.
- **Developer:** new migration `V39`; `manage_service` permission (LEAD); customer-facing SLA reuses
  iteration-8 instances; new entities added to the JaCoCo exclude list.

---

## In-scope changes (by spec)
1. **S01 Customer accounts** — `customer_accounts` + `/portal/auth/register|login` (BCrypt, rate-limited,
   portal JWT with account/workspace/org claims; `PortalAuthenticatedUser` enforces the portal claim).
2. **S02 Branded portal** — `customer_organizations` (logo/colour/subdomain/tier) + public GET branding.
3. **S03 Request types / S04 forms** — `request_types` with a JSON `form_schema`; server-side
   required-field validation of submitted `form_data`.
4. **S05 Agent queues** — All open / Mine / Unassigned / High priority + triage (assign, status, link).
5. **S06 Customer-facing SLA** — surfaces the linked work item's iteration-8 clocks to agent + customer.
6. **S07 Customer KB** — publish/unpublish internal articles to `portal_kb_articles`; list + search.
7. **S08 CSAT** — rating + comment on resolved requests; trend aggregation (avg / count / distribution).
8. **S09 Customer dashboard** — a customer sees only their org's requests + SLA status.
9. **S10 Multi-tier SLAs** — org tier surfaced; tier-matching policy `customerTier` exposed on the request.

## Out of scope (parked → `docs/PARKED.md`)
- Real custom-domain hosting / a separately-deployed portal SPA (infra, not this iteration).
- A drag-and-drop visual form designer (schema is edited as JSON; the renderer is built).
- Automatic tier-appropriate SLA-policy *selection* on work-item creation (the iteration-8 evaluation
  engine already governs the linked work item's clocks).
- Customer email notifications on status change (events recorded; no portal email channel wired).

## Test plan & results
- **Unit (pure):** `ServiceManagementServiceTest` — form validation, CSAT aggregation, defaults.
- **Access (mandatory RB-40):** `ServiceManagementControllerAccessTest` (unauthorized + cross-tenant on
  every internal write) and `PortalControllerAccessTest` (**cross-organization** isolation — org A
  cannot read or rate org B's request; a foreign-workspace request type is rejected).
- **Frontend:** smoke tests for `ServiceManagementView` and `CustomerPortalView`.
- **Result:** backend 254 unit tests green + JaCoCo gate met + compile/checkstyle; frontend 125 tests
  green + eslint clean + build OK; guardrails blocking rules clean.
- **Not run here (honest gap):** Testcontainers row-level isolation + live portal/browser validation
  (no Docker/browser in this environment) — tracked as the standing integration-test follow-up.

## Risk & rollback
- `V39` is forward-only/additive (new tables only); rollback is a new forward migration.
- Portal auth is fail-closed and rate-limited; tokens carry the org binding so a customer cannot
  pivot to another org regardless of request input.
- The feature is isolated behind its own tables, endpoints, identity, and nav entries — reversible.
