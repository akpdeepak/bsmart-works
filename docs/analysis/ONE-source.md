# ONE Philosophy — Single Source of Truth (SSoT) Audit

> Auditor: Principal Software Architect. Scope: `works-backend` + `works-frontend`.
> Lens: **ONE Source** — every piece of data, state, vocabulary, and rule has exactly one definitive
> owner. Violations = duplicated state, redundant fetching, overlapping logic, and hand-copied
> vocabularies. Date: 2026-06-13.
> Ties to the seven unification layers (RB-40) and "one concept, one name across Java/DB/REST" (RB-10 §5).

---

## A. Server state — duplicated and mirrored (the root-cause violation)

### A.1 TanStack Query configured but **never used** — server state mirrored into 275 `useState`s
- **The Problem:** `lib/query-client.js` builds a `QueryClient`, `main.jsx` provides it, but a repo-wide
  search finds **zero** `useQuery`/`useMutation` outside those two files. Every resource is fetched
  imperatively (`api.send`/`api.raw` in `useEffect`) and mirrored into local `useState`. `App.jsx` holds
  **275 `useState`** including `workItems` (174), `projects` (175), `users` (176), `workspaces` (290);
  `fetchAll` (757–771) copies `/work-items`, `/projects`, `/users` into setters; a manual 409
  refetch-and-merge (1057–1067) hand-rolls what the cache gives free.
- **The ONE Solution:** A `src/hooks/queries/` layer — one hook per resource over `apiClient`, each with
  a shared query-key factory. The local mirrors and manual reconciliation delete themselves.
- **Status:** **PR F3** introduces the layer + migrates the low-risk consumers; App.jsx migration staged.

### A.2 Same resource fetched independently in 2–5 places
- **The Problem:**
  - `/users?workspaceId=` — `App.jsx:762`, `metric-share-control.jsx:29`, `performance-panel.jsx`.
  - `/projects` — `App.jsx:761`, `performance-panel.jsx:165`.
  - `/users/me` — `i18n.jsx:36` (locale) separately from App's identity load.
  - a single work-item by id — `App.jsx:1061/3266`, `bql-view.jsx:156`, `work-item-status-timeline.jsx:63`.
  No shared hooks; the "keys" are duplicated raw URL strings.
- **The ONE Solution:** `useWorkspaceUsers(ws)`, `useProjects(ws)`, `useCurrentUser()`, `useWorkItem(id)`
  keyed `['users', ws]` etc. — fetched once, cached, shared.
- **Status:** **PR F3** ships `useWorkspaceUsers` + `useProjects` and migrates `metric-share-control` +
  `performance-panel`.

**Non-violation (confirmed):** the single `apiClient` is the only `fetch` caller — no inline
`fetch`/`axios` anywhere. Sound.

---

## B. Cross-stack vocabularies — hand-typed in both Java and JS

The systemic pattern: the backend often has **no shared enum** (a free-form `String` field with allowed
values living only in a code comment, or a single `Set.of(...)`), while the frontend re-lists the same
values in many literals. Nothing enforces equality.

### B.1 Work-item type taxonomy (16 types + hierarchy + auto-ID prefixes + colours) — **drifting**
- `DefaultWorkItemTypes.java:26-169` (`VALID_CHILDREN`, `MOVABLE_TYPES`, `ALL`) ↔ `work-item-types.js:40-170`
  (comment literally says *"mirrors DefaultWorkItemTypes"*). Colours already diverge: backend `PRODUCT`
  = `#334155` vs frontend `bg-neutral-700`; backend `#475569` ≠ frontend `bg-neutral-600`. Frontend uses
  token names, backend raw hex — correspondence is manual.
- **The ONE Solution:** Backend owns the taxonomy and serves it via an endpoint (the pattern `ChartType`
  already uses); store **token names** backend-side, resolve hex at render. **Data model — Deepak-gated.**

### B.2 Role keys `{developer, scrum-master, product-owner, executive, admin}` — **drifting**
- `TodayLayoutService.java:26` ↔ `today-layouts.js:12-65` + `nav-model.js:171-192`. The frontend already
  disagrees with itself: `nav-model` uses `leadership` in `ROLE_PROFILES` but `executive` in `LENSES` —
  precisely because the vocabulary is hand-copied. **The ONE Solution:** backend owns `ROLE_KEYS`,
  served + consumed. **RBAC-adjacent — Deepak-gated.**

### B.3 Priority `CRITICAL/HIGH/MEDIUM/LOW` — **drifting (phantom value)**
- Backend allow-list: `RequestTypeService.java:15` `Set.of("CRITICAL","HIGH","MEDIUM","LOW")` (and
  `WorkItem.priority` is a free-form `String` with no enum). Frontend re-lists it in **10+** sites
  (`type-field-schemas.js:5`, `dashboard-metrics.js:15`, `my-works-view.jsx:28`, `priority-badge.jsx:4`,
  `sprint-board.jsx:34`, `pm-view.jsx:563/620`, `backlog-view.jsx:156`, …). **Real drift:**
  `dashboard-metrics.js:14` introduces `HIGHEST`, which has no backend counterpart.
- **The ONE Solution:** Backend enum/constant + endpoint; remove `HIGHEST`; validate priority server-side.

### B.4 Supported locales — duplicated three ways, and the DB default fails its own validator
- `locales.js:7-18` (frontend SSoT) ↔ `UserController.java:22` `Set.of("en",…,"ko")` ↔ `User.java:47-58`
  (re-lists + hard-codes `"en"` fallback twice). The backend has the list **twice**, and a configured
  default `en-IN` (`ConfigDefaults.java`) is **not** in the controller's validator set.
- **The ONE Solution:** One `SupportedLocales` constant backend-side, consumed by controller + entity;
  align the default. This is the cleanest first cut of SSoT discipline. **PR B3** (backend-only, safe).

### B.5 Status categories / outcomes / status colours
- `TODO/IN_PROGRESS/DONE` and `NEUTRAL/POSITIVE/NEGATIVE`: backend `WorkflowStatus.java` /
  `StatusWorkflowDefaults.java` ↔ frontend `status-config.js:11`, `status-management-tab.jsx:10-19`.
  Frontend already fetches `/status-config`, so the hardcoded `<select>` option list is the duplication.
- Status seed colours (e.g. `#94A3B8`) hand-typed in `StatusWorkflowDefaults.java:29-34` **and**
  `status-management-tab.jsx:42/109/251` — raw hex crossing the boundary (also an RB-30 token concern).
- **The ONE Solution:** Derive the option lists + colours from `/status-config`; stop re-hardcoding.

### B.6 RBAC tier ladder + raise types + impediment severity + SLA snapshot states (values match — yet)
- Tier ladder `VIEWER1…OWNER5`: `RbacService.java:8` ↔ `nav-model.js:20` (self-labelled "mirror").
- Raise types (6 keys): `ImpedimentService.java:25-30` ↔ `scrum-master-cockpit-view.jsx:69-72` (frontend
  already prefers the server's `allowedRaiseTypes`, falling back to the local copy).
- Impediment severity `LOW/MEDIUM/HIGH/CRITICAL`: only a comment backend-side (`Impediment.java:26`) ↔
  `scrum-master-cockpit-view.jsx:562`.
- SLA snapshot states `NONE/MET/BREACHED/AT_RISK/ON_TRACK`: `ServiceRequestService.java:170-188`
  (string literals, no enum) ↔ `serviceSla.js:8-44`.
- **The ONE Solution:** Promote each to a backend enum/endpoint; consume on the frontend.

### B.7 Nav surface→tier map — 33 byte-identical entries duplicated
- `NavSurfaces.java` ↔ `nav-model.js` `SURFACE_TIER` (comment: *"keep reconciled… tracked as
  tech-debt"*). The server already returns the authoritative `surfaces` list in `/rbac/me`.
- **The ONE Solution:** Delete the frontend `SURFACE_TIER` heuristic; consume `/rbac/me.surfaces`.

---

## C. Overlapping logic — the same rule computed in two places

### C.1 SLA / lapse — two engines, different vocabularies
- Backend `SlaCalculationService` returns bands `OK/WARN/BREACH`; frontend `status-lapse.js:18-34`
  **re-derives** `on_track/at_risk/breached` client-side from raw thresholds. An "On track" badge can
  contradict a server "Breached". Violates RB-20 §5 "one engine, two contexts."
- **The ONE Solution:** Server computes the state; the client renders it. **Deepak-adjacent (SLA engine).**

### C.2 Risk score computed three ways
- `LeadershipService` product (1–9) vs `pm-view.jsx` index-sum (0–4) vs stored `WorkItem.riskScore` —
  the same risk, a different severity per surface.
- **The ONE Solution:** One server-side risk function; surfaces read it. **Data-governance — Deepak-gated.**

### C.3 AI model tier already drifted (honesty bug)
- UI + validator accept `OPUS`, but `AiModelTier` + `AnthropicAiProvider` silently downgrade it to
  Haiku. Users believe they run the best model; they run the cheapest.
- **The ONE Solution:** One tier source honoured end-to-end (or the UI must not offer `OPUS`).
  **AI Control Plane — Deepak-gated (Orchestrator §5).**

### C.4 Date / number formatting bypasses the one formatting layer
- `format.js` is the designated layer, but ~30 sites use raw `new Date(...).toLocaleString()` /
  `toLocaleDateString()`, `my-works-view.jsx:37-46` re-implements the relative-time ladder, and
  `admin-ops-view.jsx`/`ai-settings-panel.jsx` hand-roll currency/number formatting with an inconsistent
  locale (`en-IN` vs none).
- **The ONE Solution:** Route all display formatting through `format.js`; extend it to be locale-aware so
  the view-local re-implementation can be deleted.

### C.5 Pagination default `50` — backend constant + 7 frontend literals
- `ListPaging.java:21` `DEFAULT_SIZE=50` ↔ `50` hardcoded in `ai.js`, `automation.js`, `integrations.js`,
  `security.js`, `admin-ops-view.jsx`, `security-center.jsx`. **The ONE Solution:** one frontend config
  constant mirroring the backend.

### C.6 Brand/semantic palette defined three ways
- `tailwind.config.js:14-44` (canonical) ↔ `brand-tokens.js:6-8` (its own header warns of the hazard) ↔
  `DefaultWorkItemTypes.java:57-165` (raw hex seed). **The ONE Solution:** `tailwind.config.js` is the
  one token→hex map; generate `brand-tokens.js`; backend stores token names.

---

## D. Verified non-violations (no action)
- Single `apiClient` (only fetch caller); RTL list (`locales.js:20`, single source); AI budget thresholds
  (server-only, not mirrored); NFR budgets (docs-only); permission *catalog* (DB-driven via `RbacService`
  /`PermissionScheme`, frontend reads `/rbac/me`); workflow transition rules (backend-only); lapse
  warn/breach *threshold* storage (backend) vs *state derivation* (frontend) — parallel, not copied.

---

## Ranked remediation (drift risk × blast radius)
1. **A.1/A.2** adopt TanStack Query hooks — root cause. → **PR F3** (first cut).
2. **B.1 / B.2 / B.3** taxonomy, role keys, priority — *already drifting*. → backend endpoint + consume
   (data-model/RBAC → **Deepak-gated**).
3. **B.4** supported locales — safe, self-contained. → **PR B3** now.
4. **B.7** delete `SURFACE_TIER`, consume `/rbac/me.surfaces` — already returned. → safe follow-up.
5. **C.3 AI tiers / C.2 risk / C.1 SLA** — touch AI/governance/SLA engine → **Deepak-gated** (Orchestrator §5).
6. **C.4–C.6 / B.5–B.6** formatting, page-size, palette, status vocab — mechanical consolidations, batched.

**The codebase's own proven pattern is the fix:** backend owns the list, exposes an endpoint, frontend
consumes (exactly how `ChartType` already works).
