# EPIC 7 - bSmart Today

Status: Code-verified complete; PR [#487](https://github.com/akpdeepak/bsmart-works/pull/487) awaiting CI
Branch: `codex/epic-07-today-completion`
Roadmap: V.20 Phase 3 / W3

## Intent

Make `/` a calm, role-aware daily clarity surface that answers what matters, why it matters, and
what the user can do next without opening a dense reporting grid.

## Code-Reconciled Scope

The June 2026 slice supplied the Daily clarity band and configurable role canvases, but production
code still lacked actionable attention state, support-agent Today, selected-workspace scoping on the
developer aggregate, visible AI provenance/fallback, and several source-domain signals. This
closeout owns those gaps.

- Keep Today as the authenticated `/` landing page.
- Preserve developer, scrum-master/team-lead, product-owner/PM, executive, and admin layouts; add
  the support-agent layout because Service Desk and customer chat already exist in production.
- Build attention from real priorities, approvals/waits, blockers, SLA/customer/code risk,
  important customer messages, and DevSync activity.
- Show at most five signals, with a reason, source, Open action, snooze, and dismiss on each.
- Persist attention state by workspace, user, and role; a changed signal fingerprint must reappear
  and returning users must see newly introduced signals.
- Render the AI summary returned by the AI Control Plane, exact work-item source links, model/fallback
  metadata, and a deterministic fallback when AI is unavailable.
- Preserve personal and workspace role-template widget customization.
- Require selected-workspace predicates and server RBAC for every Today aggregate.
- Enforce a two-second read budget and validate the hot path on a fresh seeded PostgreSQL schema.

## Acceptance Scenarios

- Happy: every authorized role opens a populated, actionable Today surface.
- Edge: attention remains capped at five; changed dismissed signals return; snoozed signals return
  after their deadline.
- Empty: quiet-win copy replaces an empty attention list; AI fallback remains visible.
- Error: failed AI calls produce deterministic content rather than a blank card.
- Unauthorized: dashboard endpoints fail before service access when workspace/permission checks fail.
- Cross-tenant: a multi-workspace user receives only the explicitly selected workspace; support
  conversations and messages cannot cross the workspace boundary.
- Performance: dashboard reads carry a two-second transaction timeout and the selected-workspace
  integration scenario completes inside two seconds on seeded data.

## Verification

- `node scripts/epic-07-completion.mjs`
- `cd works-frontend && npm run verify`
- `cd works-backend && ./mvnw -Dgroups=unit verify`
- `cd works-backend && ./mvnw test-compile failsafe:integration-test failsafe:verify`
- `npm run verify`
- GitHub PR checks, squash merge, and post-merge `main` verification
