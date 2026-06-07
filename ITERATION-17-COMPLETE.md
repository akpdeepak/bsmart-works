# Iteration 17 — Universal Customization Engine (Cap R) (completion)

Iteration 17 delivers the **configuration framework** that lets BCITS admins tune every workspace
behavior without engineering tickets — the foundation for onboarding new DISCOM customers from
templates rather than per-team forks. After this iteration, Works is genuinely *universally
customizable*: change a setting, see exactly what it affects, test it in a sandbox, promote it,
and roll it back if it was wrong — all versioned and audited.

> **One unified config document, one engine.** Rather than a settings silo per feature (RB-20 §3),
> the whole customizable surface — branding, locale, timezone, working calendar, defaults, custom
> forms, custom pages, code-extension definitions, and the set of locked paths — lives in **one
> versioned JSON document per workspace**. Versioning, diff, rollback, templates, sandbox, and
> import/export therefore apply *uniformly* across all customization ("customization itself is
> customizable", spec 06 §17). This is the seventh unification layer in practice (RB-40 / one
> customization framework, not per-feature settings).

> **No live model in this build.** Iteration 17 is deterministic. The spec's "AI proposes config
> templates from natural language" is a thin layer over the existing AI Control Plane (RB-40 §2) and
> is intentionally out of scope here — the engine it would drive is what shipped. The same is true of
> extension *execution* (see TD-015).

## What shipped (Cap R)

| Feature | What shipped | Key endpoint(s) |
|---|---|---|
| Workspace settings (centralized) | One settings surface — branding (token-named colors), locale, timezone, working calendar, defaults | `GET/PUT /api/v1/config/settings` |
| Configuration versioning | Every change appends an immutable version (source: MANUAL/IMPORT/TEMPLATE/ROLLBACK/SANDBOX_PROMOTE); full history | `GET /api/v1/config/versions[/{n}]` |
| Configuration diff | Side-by-side leaf diff (ADDED/REMOVED/CHANGED) of any version vs any version or live | `GET /api/v1/config/diff?from=&to=` |
| Rollback | Restore any prior version (replayed as a new ROLLBACK version — forward-only, RB-10 §3) | `POST /api/v1/config/rollback` |
| Configuration templates | Save current config as a template; apply to onboard a workspace; internal + customer-shareable library; a seeded `Utility Customer Workspace` template | `GET/POST/DELETE /api/v1/config/templates`, `POST …/{id}/apply` |
| Sandbox mode | A labelled draft forked from live; edit in isolation; promote (with impact analysis) or discard | `GET/POST/PUT /api/v1/config/sandboxes`, `…/{id}/promote`, `…/{id}/discard` |
| Config import / export | Move config as JSON or YAML — backup and source-control-friendly | `GET /api/v1/config/export?format=`, `POST /api/v1/config/import` |
| Lockable settings | An admin **owner** locks a setting path so other admins cannot change it; enforced server-side | `locks[]` in the document; owner-only gate in `ConfigService` |
| Config impact analysis | Pre-confirmation summary — "Affects N items, M users, K automations" + warnings — before apply/promote | `POST /api/v1/config/impact` |
| Custom forms designer | Build forms with typed, optionally-required fields per target surface (stored in the versioned doc) | `forms[]` in the document |
| Custom views / pages | Build landing pages from widgets with per-role assignment | `pages[]` in the document |
| Extension API (code-level) | Define JS extensions bound to a server-owned extension-point catalog (definition/validation/versioning/audit; **execution deferred — TD-015**) | `extensions[]` + `GET /api/v1/config/extension-points` |

## Architecture & governance

- **Workspace isolation (RB-40 §1):** every table carries `workspace_id` and every query is
  workspace-scoped; templates owned privately by one workspace are invisible/inapplicable to another;
  sandbox id lookups are workspace-bound. Each surface has an **unauthorized + cross-tenant** unit test.
- **RBAC in the service boundary (RB-10 §2):** reading config needs `view_items`; writing needs
  `manage_workspace`. **Lockable settings** add a second gate enforced inside `ConfigService` —
  changing a locked path, or the lock set itself, requires **OWNER** tier (a compliance-bound
  customer's admin cannot silently override a locked policy). Privacy enforced at the API, not the UI.
- **One mutation path:** manual edits, import, template apply, sandbox promote and rollback all funnel
  through `ConfigService.update`, so every change is versioned, audited (an event in the immutable
  `events` log — `CONFIG_UPDATED`), and lock-checked. No way to mutate config behind the engine.
- **Design system (RB-30):** the Customization surface is token-only (no raw hex/spacing/z-index),
  every interactive element labelled, with explicit loading / empty / error states; branding colors
  are stored as **token names**, never literals.

## Data model (Flyway `V51__iteration17_customization_engine.sql`)

`workspace_configs` (live doc + current_version) · `config_versions` (append-only history) ·
`config_templates` (owner/shareable) · `config_sandboxes` (DRAFT/PROMOTED/DISCARDED). All plural,
snake_case, jsonb documents (the proven `String` + `columnDefinition="jsonb"` mapping). Forward-only.

## Verification

- **Backend:** 31 new unit tests (diff, service + lock gate, templates incl. cross-tenant, sandbox,
  serialization round-trip, impact, controller unauthorized/cross-tenant). Full unit suite **491
  green**.
- **Frontend:** new `customization-view` + `customization.js` client; 6 new Vitest tests. Full suite
  **272 green**; lint clean; `vite build` green.
- **Gate:** `guardrails.sh` blocking rules pass; `generate-ai-rules.mjs --check` and
  `check-dod-sync.sh` green. Orchestrator §6 updated (high-water mark **V51**, next **V52**, active
  iteration **17**).

## Frontend

`Configure → Customization` (route `/customization`): tabs for Settings (with lock toggles, export,
import), Versions (diff vs live + rollback), Templates (save/apply/delete with impact preview),
Sandbox (create/edit/promote/discard with impact preview), and the Forms / Pages / Extensions
builders. Write controls hide when the user lacks `manage_workspace`; lock toggles show only for owners.
