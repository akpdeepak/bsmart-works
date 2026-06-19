# bSmart Works Current State

Last verified: 2026-06-19

This document is the EPIC 0 baseline for the bSmart Transformation Roadmap. It records what is
implemented, what is partial, what is intentionally deferred, and which safety rules must remain true
before broader feature expansion.

## Repository Reality

| Area | Current state |
|---|---|
| Repository | `akpdeepak/bsmart-works` |
| Backend | Java 21, Spring Boot 4.1.0, Maven |
| Frontend | React 19.2, Vite 8, Tailwind, React Query, Vitest, Playwright, Storybook |
| Database | PostgreSQL with Flyway migrations |
| Flyway high-water | V109, next migration should be V110 |
| Auth | Spring Security, stateless JWT, MFA, WebAuthn/passkeys, customer portal auth |
| AI | AI Control Plane with Anthropic provider activation and deterministic fallback |
| Canonical modes | Home, Deliver, Insight, Service, Know, Extend |
| Work-item hierarchy | Existing hierarchy/taxonomy remains baseline; extend only through explicit EPIC plans |

## Implemented Major Surfaces

- Workspace identity, users, RBAC tiers, SCIM provisioning, API tokens, and security/audit surfaces.
- Work items, boards, backlog/sprint flows, workflow statuses, watchers, links, comments, attachments,
  and field/layout customization.
- Projects, Scrum/Product Owner/Leadership/Admin surfaces, reports, dashboards, BQL, saved views, and
  scheduled/audited BQL runs.
- Knowledge spaces, articles, templates, block editor, article comments, workflow columns, export,
  public sharing, full-text search, and stale indicators.
- Service desk/customer portal, SLA policy/instance/escalation, customer accounts, customer auth, and
  support chat.
- Developer workspace/DevSync-style raw evidence surfaces for PRs, code links, focus blocks, and
  Definition of Done.
- Automation, integrations, OAuth callback, marketplace/developer portal foundations, AI settings,
  and performance/security centers.

## Partial Or Guarded Areas

- `App.jsx` remains a large orchestration file and is tracked as architecture debt.
- Backend remains a modularizing monolith under `com.bcits.works`; new code should respect service
  boundaries without premature microservice extraction.
- Full bSmart Messenger remains future EPIC 9 work and must stay separate from customer support chat.
- Team-first onboarding, framework policy engine, five business-facing user types, team-key display
  IDs, inline BQL filters, and dynamic query boards are V1.6 overlay requirements, not EPIC 0 scope.
- Query-param JWT authentication is now constrained to `/api/v1/realtime/stream` only.
- Root dependency archives/logs and `node_modules/` are source-control artifacts and are removed from
  Git tracking in this baseline.

## Deferred Or External

- Native iOS/Android apps remain separate future repositories; this repo is PWA-first.
- SOC 2 Type 2 and ISO 27001 require external audit engagement.
- Production infrastructure target remains gated by deployment/environment decisions.
- BYOK/AWS KMS production wiring depends on approved AWS credentials, key policy, and operational
  controls.

## Safety Rules For Future EPICs

- Preserve the canonical modes: Home, Deliver, Insight, Service, Know, Extend.
- Preserve current work-item hierarchy/taxonomy unless an EPIC plan proves a compatible extension.
- No production `WS-001` fallback in live paths.
- No arbitrary `userId` trust for another user's data.
- Every tenant-scoped query/API must enforce workspace scope.
- RBAC must be enforced server-side.
- Query-param JWT is allowed only for realtime SSE.
- AI answers/actions must respect workspace/RBAC, show sources where important, and expose
  deterministic fallback.
- Customer-visible and internal content must remain explicitly separated.

