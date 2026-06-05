# Iteration 13 — Automation Engine + Integrations (completion)

Iteration 13 makes Works part of BCITS's broader IT fabric: a visual automation engine, outbound
webhooks, the public-API foundation, and the connector registry (Slack / GitHub / GitLab / email /
calendar + SSO/SCIM). Everything is workspace-scoped (RB-40 §1) and auditable (RB-20 §5).

> **Pluggable seams, no live egress.** As with the iteration-11 AI provider, there is no external
> network call in this build. Webhook delivery and the connectors are **deterministic seams** (e.g. a
> target URL containing `fail` simulates a rejecting endpoint), so retry / dead-letter and connect /
> validate behaviour are real and testable today, and a real HTTP/OAuth client plugs in later without
> touching callers.

## 1. Automation engine (Cap C)

- **`automation_rules`** — "When [trigger], if [condition], then [action(s)]". New rules start
  **disabled** (test-before-activate). Triggers: ITEM_CREATED / ITEM_UPDATED / STATUS_CHANGED /
  ITEM_ASSIGNED / SCHEDULED. Actions: SET_STATUS / SET_PRIORITY / ASSIGN / ADD_COMMENT / NOTIFY /
  POST_WEBHOOK (`AutomationCatalog`).
- **Safe condition matcher** — `field op value` (`=` / `!=`), AND-combined, fields priority / type /
  status / assignee. Pure + static, unit-tested; no SQL, no code.
- **Test mode** — `POST /{id}/test` previews the affected item count **without mutating anything**.
- **Run audit** — `automation_runs` is append-only; every real run and dry-run is recorded.
- **AI rule suggestions** — `POST /suggest` via the control plane (`AUTOMATION_SUGGEST`), falling back
  to the one-click template library.
- **API** `/api/v1/automations` — catalog, CRUD, toggle, test, run, runs, suggest.

## 2. Integrations (Cap Q / Cap A)

- **Connectors** (`integration_connections`): Slack, GitHub, GitLab, email, calendar, and the SAML /
  OIDC / SCIM identity providers (`IntegrationCatalog`), with per-provider required-field validation,
  connect/disconnect/test, and an **email-inbound → work item** path. API `/api/v1/integrations`.
- **Outbound webhooks** (`webhook_subscriptions` / `webhook_deliveries`): per-event-type, **HMAC-SHA256
  signed**, with retry and a **dead-letter** terminal state, and a delivery audit log. API
  `/api/v1/webhooks`. The automation POST_WEBHOOK action feeds this.
- **Public-API tokens** (`api_tokens`): the bearer/OAuth foundation — tokens are shown once, only a
  prefix + SHA-256 hash are stored, scoped and revocable. API `/api/v1/api-tokens`.
- **Migration `V42__automation_and_integrations.sql`** — all six tables plus `manage_automations`,
  `manage_integrations`, `manage_api_tokens` (ADMIN) permissions. Plural, workspace-scoped, indexed.

## 3. UI

- **`AutomationsPanel`** — rule list, a When/If/Then create form, enable/disable, **test** (dry-run
  preview) and **run**, and the run log.
- **`IntegrationsPanel`** — three tabs: connectors grid (connect via the required fields), webhooks,
  and API tokens (issue shows the plaintext once). Tokens only, five interactive states, WCAG-AA.

## 4. Tests

- `AutomationCatalogTest`, `IntegrationCatalogTest` — the registries.
- `AutomationServiceTest` — condition matcher, action normalization, **test mode mutates nothing**,
  real evaluation applies the action + audits, cross-workspace rejected.
- `WebhookServiceTest` — deterministic HMAC signing, wildcard matching, the retry → dead-letter state
  machine.
- `ApiTokenServiceTest` — hash/prefix stability, hash-not-plaintext storage, verify, cross-workspace
  revoke rejection.
- `IntegrationServiceTest` — config validation, connect, inbound-email with its workspace-scope guard.
- `AutomationControllerAccessTest`, `IntegrationControllerAccessTest`, `WebhookControllerAccessTest`,
  `ApiTokenControllerAccessTest` — unauthorized + cross-tenant on every entry point.
- Frontend `automations-panel.test.jsx`, `integrations-panel.test.jsx`.

## 5. Not in scope (logged)

- Live provider calls / real OAuth flows (the seams are ready), the SCIM provisioning server, and a
  scheduled-automation cron runner (the SCHEDULED trigger + `runNow` exist; wiring a scheduler is a
  follow-up, consistent with the existing compliance schedulers).
- A generated OpenAPI 3.1 document (endpoints are versioned and bearer-authenticated via api_tokens).
