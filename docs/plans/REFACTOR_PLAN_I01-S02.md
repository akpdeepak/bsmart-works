# Refactor Plan — I01-S02 · Cap A · Workspaces

**Iteration:** 1 (Foundation — The Works MVP) · **Release 1.0**
**Spec source:** `docs/bsmart-works-iteration-guide.md` Part 7, Iteration 1 — *"Workspaces — Top-level
multi-tenant container. Each BCITS team or customer gets a workspace with branding, members,
settings."*
**Branch:** `claude/spec-refactor-i01-s02-pdVrC`
**Classification:** **Partial** — the workspace container, branding, and membership exist, but the
tenant boundary is not actually enforced, RBAC lives in the wrong layer, there is no service layer,
no events are recorded, and multi-workspace context is absent.

> ⚠️ **GATED + governance-sensitive (CLAUDE.md §5 / RB-40).** Workspaces is tenant-isolation
> territory. This plan changes **tenant scoping**, touches **RBAC placement**, and raises a
> **tenant-context (JWT) design decision**. Per the prime directive and the operator's instruction,
> **no code is written until Deepak signs off on the three decisions in §6.**

---

## 1. Phase 1 — Multi-Lens Analysis (what exists today)

Files in scope: `Workspace.java`, `WorkspaceController.java`, `WorkspaceRepository.java`,
`RbacService.java`, `SecurityConfig.java` (JWT filter), `AuthController.java` / `MfaController.java`
(token issuance), `works-frontend/src/App.jsx` (switcher + `WS-001` hardcoding),
`organisms/sidebar-nav.jsx`. Schema: `V3__core_identity_schema.sql` (`workspaces`,
`workspace_members`), `V13` (branding columns), `V7` (roles/tiers).

### Architect
- **No service layer.** `WorkspaceController` does HTTP **+ authorization + raw `JdbcTemplate` SQL**
  in one class — a direct violation of RB-10 §2 "one job per layer" and CLAUDE.md §4 ("RBAC in the
  service, never the controller"). This is the parked item from I01-S01.
- **Branding bypasses the entity.** `Workspace` maps only `id/name/slug`; `primary_color`,
  `logo_url`, `description` (added in V13) are read/written with inline SQL in the controller — a
  second, parallel persistence path for the same row.
- No second implementation of a *unification layer* is being created, but the inline-SQL pattern is
  duplication debt that the service layer removes.

### System designer
- **Not event-sourced.** Member add/remove, branding changes, and workspace updates record **no
  events** — violates the "event-sourced from day one" commitment (RB-10 §3, Constitution Part 2).
  Every other mutating surface in the app records via `EventService`; workspace mutations are silent.
- **Tenant context is implicit and unverified** (see Governance).

### Product manager
- The guide's Workspace = "multi-tenant container … with branding, members, settings." Branding +
  members exist; **"multi-tenant" is not actually delivered** — the frontend hardcodes a single
  workspace `WS-001` in ~30 places and the switcher dropdown is a non-functional stub that lists one
  hardcoded entry. A user who belongs to two workspaces cannot see or switch to the second.

### UI/UX lead
- **Switcher is a dead end** (App.jsx ~1696–1740): renders `workspace.name` from a hardcoded
  constant, the "Workspaces" list shows one static row, and there is no loading/empty/error state.
  Violates Constitution Part 4 (empty states guide the next action; no dead ends).
- Workspace **Settings** surface exists (branding editor) but reads/writes the bypass endpoints.

### Developer (blast radius)
- Backend: `WorkspaceController` is consumed only by the workspace + project-member surfaces in
  App.jsx. Introducing `WorkspaceService` is contained. The JWT-filter / token-issuance change
  (Decision A in §6) would touch `AuthController`, `MfaController`, `AuthController#verify`,
  `JwtUtil`, `SecurityConfig` — wider, which is why it is gated as a decision.
- Frontend: replacing `WS-001` is cross-cutting (~30 references) but mechanical — funnel through one
  `activeWorkspaceId` value held in `App.jsx` state, sourced from the new `/workspaces/mine` call.

### 🔴 Governance (RB-40 §1) — the critical finding
- **Cross-tenant read leakage.** `GET /workspaces/{id}`, `GET /workspaces/{id}/members`,
  `GET /workspaces/{id}/branding`, and `GET /workspaces/{wsId}/projects/{projectId}/members`
  perform **no membership check**. Any authenticated user — *from any tenant* — can read any
  workspace's name, branding, and **full member roster (names + emails)** by guessing/iterating IDs
  (`WS-001`, `WS-002`, …). This is exactly the "single catastrophic risk … cross-tenant leakage"
  RB-40 §1 names. It must be closed in this spec.
- Mutating endpoints *do* call `rbac.require(...)`, but in the controller (wrong layer) and the
  permission check (`canDo`) doubles as the membership gate only for writes, not reads.

---

## 2. In-scope changes (numbered)

> **Items 1–6 are within the foundation-appropriate scope and are recommended regardless of the §6
> decisions. Item 7 is the decision itself.** Each maps to a commit.

**1. `refactor: introduce WorkspaceService; controller becomes thin (RB-10 §2)**
   New `WorkspaceService` owns all workspace business logic, RBAC calls, and data access.
   `WorkspaceController` only parses HTTP and delegates. Resolves the parked RBAC item.
   *Lens:* Architect. *Clause:* RB-10 §2, CLAUDE.md §4. *AC:* no `rbac.*` or `JdbcTemplate` reference
   remains in `WorkspaceController`; `ArchitectureTest` still green.

**2. `fix: enforce workspace membership on every workspace read (RB-40 §1)** 🔴
   Reads (`getWorkspace`, `getMembers`, `getBranding`, project-member reads) require the caller to be
   a member of the target workspace (tier ≥ 1 / `view` permission). Non-members get **404**
   (not 403 — do not confirm a foreign workspace exists). Closes the cross-tenant leak.
   *Lens:* Governance. *Clause:* RB-40 §1. *AC:* cross-tenant read returns 404; member read succeeds.
   **→ tenant-scoping change — gated by Decision B (§6).**

**3. `refactor: map branding onto the Workspace entity; delete inline branding SQL**
   Add `primaryColor`, `logoUrl`, `description` to `Workspace` (columns already exist — **no
   migration**). Branding read/write goes through the repository/service, not raw SQL.
   *Lens:* Architect. *AC:* branding round-trips through the entity; no `UPDATE workspaces … SET
   primary_color` string SQL remains.

**4. `feat: record workspace events (event-sourced commitment)**
   `WORKSPACE_UPDATED`, `WORKSPACE_BRANDING_UPDATED`, `MEMBER_ADDED`, `MEMBER_REMOVED` via
   `EventService` (workspace-scoped, `workspace_id` on the event per RB-40 §1).
   *Lens:* System designer. *Clause:* RB-10 §3. *AC:* each mutation appends one event.

**5. `feat: GET /api/v1/workspaces/mine — workspaces the caller belongs to**
   Returns `[{id, name, slug, role}]` from `workspace_members` for the authenticated user. This is
   the membership-truth source the switcher needs, and is workspace-scoped by construction.
   *Lens:* PM / UI. *AC:* returns only the caller's workspaces; empty array when none.

**6. `feat(frontend): real workspace switcher + single activeWorkspaceId**
   Replace the hardcoded `const workspace = {id:'WS-001'}` and the ~30 `'WS-001'` literals with one
   `activeWorkspaceId` held in `App.jsx`, seeded from `/workspaces/mine` (default = first membership,
   persisted to `localStorage`). Switcher lists real memberships with loading/empty/error states,
   marks the active one, and switching re-points the active id (and refetches). One primary action,
   navy/neutral styling, brand tokens, keyboard-accessible (Constitution Part 4 + Part 6, RB-30).
   *Lens:* UI/UX. *AC:* a user in 2 workspaces can switch; data refetches for the selected workspace;
   five states present. **→ shape depends on Decision A (§6).**

**7. Tenant-context mechanism — DECISION A (see §6).** The *how* of "active workspace" — JWT claim vs
   client-held + server-validated — is the governance decision below and sets the final form of
   items 2 and 6.

---

## 3. Out-of-scope (parked → `docs/PARKED.md`)

- **App-shell topbar/sidenav/global-search polish** → I01-S03 (App shell). This spec wires the
  switcher's *data + behavior*; broader shell chrome is S03.
- **Workspace settings beyond branding** (locale, timezone, working calendar, defaults) → Iteration
  17 Cap R (Universal Customization Engine) — *do not build ahead* (RB-20 §2).
- **Moving the other 4 controllers' RBAC into services** (`Project`, `Sprint`, `WorkItem`, `Rbac`)
  → their own specs (I01-S05, I02-S02, I01-S07, Iteration 3). Adding a *global* ArchUnit "no RBAC in
  controller" rule now would force those refactors — parked to avoid building ahead.
- **`App.jsx` 2500+-line monolith decomposition** → `TECH-DEBT.md` (already parked).
- **Per-workspace "enforce MFA", refresh-token revocation** → Iteration 19 (already parked).

---

## 4. Test & validation plan

**Backend (JUnit 5; `WorkspaceService` unit tests + controller slice where feasible):**
- *Happy:* member reads own workspace, members list, branding; admin updates branding/name; admin
  adds/removes member; `/workspaces/mine` returns memberships.
- *Unauthorized:* non-admin member cannot update workspace/branding or add/remove members (403).
- *Cross-tenant (mandatory, RB-40):* user of WS-A requests WS-B's workspace / members / branding /
  project-members → **404**; `/workspaces/mine` for a WS-A user never includes WS-B.
- *Edge/empty:* `/workspaces/mine` empty array; add member with unknown email → 404; remove
  non-member → no-op.
- *Events:* each mutation appends exactly one event with the right type + `workspace_id`.
- *Regression:* full existing suite green; `ArchitectureTest` (layering) green.

**Frontend (Vitest + RTL):**
- Switcher renders memberships from a mocked `/workspaces/mine`; loading skeleton, empty state, error
  state; selecting a workspace updates active id; active item marked. Token/a11y lint clean.

**UI/UX + a11y (live build, Phase 5):** switcher keyboard-only operable, focus-visible ring, brand
tokens only (no raw hex), one orange element rule respected, empty/loading/error verified.

**Performance smoke vs §4 P95:** `/workspaces/mine` and workspace reads are single indexed lookups —
assert well under the 800 ms page-load / 500 ms query gates.

---

## 5. Risk & rollback

| Risk | Mitigation |
|---|---|
| Read-membership gate accidentally locks out legitimate members | Gate uses the same `workspace_members` truth as writes; cross-tenant + happy-path tests both required before merge. |
| Frontend `WS-001` sweep misses a reference → stale tenant | Funnel through one `activeWorkspaceId`; grep-assert zero remaining `'WS-001'` literals. |
| Token-shape change (if Decision A) breaks existing sessions | Only if Decision A is chosen; mitigated by backward-compatible claim (absent claim → resolve default membership server-side). |
| Event volume / schema | Reuses existing `EventService` + `events` table — no schema change. |

**Rollback:** no schema migration in the recommended path (items 1–6), so revert = revert the branch.
If Decision A is taken and a seed migration (V35) is added, it is forward-only seed data, revertible
by a follow-up forward migration.

**Migration:** recommended path adds **no migration**. If Decision C-seed is chosen, next number is
**`V35__seed_second_workspace.sql`** (V34 is the current high-water mark).

---

## 6. 🔴 Decisions requiring Deepak's sign-off (CLAUDE.md §5)

**Decision A — Tenant-context mechanism (multi-workspace login):**
- **B. Membership-enforced, identity-only JWT (recommended).** JWT keeps carrying only the user.
  Active workspace is client-held (`localStorage`) + **server-validated against `workspace_members`
  on every workspace-scoped request** — the membership check *is* the isolation guarantee. Smallest
  blast radius, no auth-token churn, foundation-appropriate.
- **A. JWT-embedded active workspace.** Login resolves memberships; token carries a `wsId` claim;
  switching re-issues the token; backend trusts claim + validates membership. "Proper" stateless
  tenant pin, but changes the token shape and touches login/MFA/verify/`JwtUtil`/`SecurityConfig`
  — arguably ahead of an MVP whose benefit statement is "single workspace per team."
- **Defer.** Do only items 1–5 + read-isolation now; leave the switcher wiring (item 6) to I01-S03.

**Decision B — Close the cross-tenant read leak now?** (changes who can read)
- **Yes (recommended):** enforce membership on all workspace reads in this spec (item 2). It is the
  RB-40 §1 catastrophic-risk hole.
- **No:** park to a dedicated security spec (not recommended — it is squarely Workspaces' job).

**Decision C — Schema / seed data:**
- **No migration, keep single seeded workspace (recommended):** plumbing is made correct;
  `workspace_members` already supports multi-membership; nothing new in the schema.
- **Add `V35__seed_second_workspace.sql`** so switching is demonstrable end-to-end with seeded data.

> Default recommendation if approved as-is: **B + Yes + No-migration** → deliver items 1–6 with no
> schema change, identity-only JWT, membership-enforced isolation, and a real switcher.
