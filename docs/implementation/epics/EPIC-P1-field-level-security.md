# EPIC P1 — Field-Level Security (server-enforced)

> Phase 1 (Governance & security closure). Sibling of EPIC P1 / #243 (central tenant filter).
> **Lane: Large/risky** (data model · security · RBAC) → requires a Stage-2 checkpoint before code
> (Orchestrator §5, RB-05). **This document is that checkpoint — design only, no code yet.**
>
> Branch: `feat/p1-field-level-security` · Next migration if needed: **V110** (Orchestrator §6).

---

## 1. Problem (DEFINED-but-NOT-ENFORCED)

Field-level security is a spec commitment: *"sensitive fields are visible per-field, per-role,
**enforced server-side** — not hidden in the UI. Manager drill-down into individuals is blocked at
the API"* (RB-40 §1; spec `06 §5.5`, `06 §3 Layer 2`).

The model exists but is inert:

- `FieldVisibility` entity (`@Table field_visibility`) + `FieldVisibilityRepository` hold per-`(field,
  role)` rules with vocabulary **`HIDDEN | READ_ONLY | EDITABLE`** (default `EDITABLE`). Schema in
  `V21__iteration3_workflows_fields_permissions.sql` (`field_visibility`, `field_def`, `role_def`).
- `FieldDefController.resolveFieldVisibility(fieldDefId, wsId, tier)` and `hiddenFieldIds(wsId, tier)`
  compute the rules by joining `field_visibility → role_def` on **`role_def.tier`** with
  most-restrictive-wins (`HIDDEN > READ_ONLY > EDITABLE`).

**But only the two dedicated value endpoints consult them.** Every work-item list/detail/search/
board/backlog/my/starred/trash response serializes **all** `work_item_field_value` rows verbatim via
`WorkItemReadService.attachFieldValuesBatch`, with **zero** visibility filtering. So a `HIDDEN` field
value is returned to anyone who can read the item — the feature is bypassed on the dominant path.

**Operational reality:** `field_visibility` and `role_def` are **empty in every running instance**
(no seed data anywhere). The feature is doubly inert: no enforcement path *and* no rules to enforce.
This EPIC delivers the enforcement layer; rule authoring/seeding is called out in scope below.

---

## 2. Current state (verified 2026-06-20)

| Surface | File · lines | FLS today |
|---|---|---|
| `GET /field-defs/values/{workItemId}` | `FieldDefController` 138–154 | **HIDDEN filtered** (reference impl). READ_ONLY not marked. Fail-open if `tier==0`/`wsId==null`. |
| `PUT /field-defs/values/{id}/{fieldDefId}` | `FieldDefController` 156–198 | **HIDDEN/READ_ONLY rejected (403)**. Fail-open if `tier==0`/`wsId==null`. |
| `DELETE /field-defs/values/{id}/{fieldDefId}` | `FieldDefController` 200–204 | **No check** — HIDDEN/READ_ONLY value deletable. |
| `attachFieldValuesBatch(items)` | `WorkItemReadService` 270–290 | **No check** — the primary leak. |
| → list `GET /work-items` | `WorkItemReadService` 32–64 | leaks (line 57) |
| → detail `GET /work-items/{id}` | `WorkItemReadService` 79–91 | leaks (line 88) |
| → `GET /work-items/search` | `WorkItemReadService` 108–132 | leaks (line 130); items cross workspaces |
| → `GET /work-items/starred` | `WorkItemReadService` 93–106 | leaks (line 103) |
| → `GET /work-items/trash` | `WorkItemReadService` 66–77 | leaks (line 75) |
| → `GET /work-items/my` | `WorkItemController` 193–199 | leaks (line 198); items cross workspaces |
| `getBacklog` | `WorkItemReadService` 134–143 | does **not** attach `fieldValues`; only `customFields` JSONB via `mapRow` |
| legacy `custom_fields` JSONB | `WorkItemReadService.mapRow` 178–184 | attached unfiltered (see §6 decision) |

**Tier-source mismatch (must be acknowledged, not "fixed" silently).** The user's tier comes from
`roles.tier` via `RbacService.getUserTier` (`SELECT r.tier FROM workspace_members wm JOIN roles r …`,
V7). The visibility rules key on `role_def.tier` (V21, a different, empty, workspace-scoped table).
They line up **only by integer coincidence** on the shared 1–5 scale (VIEWER 1 < MEMBER 2 < LEAD 3 <
ADMIN 4 < OWNER 5). Enforcement reuses this exact `getUserTier → field_visibility JOIN role_def.tier`
chain — i.e. it inherits the existing semantics rather than inventing a new one. The deeper
reconciliation (membership role lives in `workspace_members.role_id → roles`, not `role_def`) is
**out of scope for this slice** and noted in §7; this slice keeps the established tier-on-tier match
so behavior is consistent with the already-shipped `FieldDefController` endpoints.

---

## 3. Central mechanism — one resolver, one choke point

### 3.1 `FieldVisibilityService` (new) — the single resolver

Lift the two private helpers out of `FieldDefController` into a reusable `@Service` so **every**
response path shares one implementation. Add the missing `READ_ONLY` batch query.

```
@Service FieldVisibilityService

  /** The per-(user,workspace) visibility verdict, computed once. */
  record FieldVisibilitySets(Set<String> hiddenFieldDefIds, Set<String> readOnlyFieldDefIds) {
      static FieldVisibilitySets EMPTY = new FieldVisibilitySets(Set.of(), Set.of());
  }

  /** PRIMARY ENTRY POINT for read redaction. */
  FieldVisibilitySets resolveForUser(String userId, String workspaceId)

  /** Single-field verdict for the write path (HIDDEN | READ_ONLY | EDITABLE). */
  String resolveFieldVisibility(String fieldDefId, String workspaceId, int tier)

  // internal, tier-keyed (one SQL round-trip each), reused by resolveForUser:
  Set<String> hiddenFieldIds(String workspaceId, int tier)
  Set<String> readOnlyFieldIds(String workspaceId, int tier)   // NEW — symmetric to hiddenFieldIds
```

`resolveForUser(userId, wsId)`:
1. `int tier = rbac.getUserTier(userId, wsId);`
2. **Fail-closed on indeterminate identity (policy change — see §3.4):** if `wsId == null`, return
   `EMPTY` (no rules computable — the caller is already past tenant scoping, so nothing to redact
   beyond what scoping did). If `tier == 0` (caller is **not a member** of the item's workspace),
   the item should not have reached this caller via the workspace-scoped read at all; treat as
   indeterminate and **redact nothing extra here** but rely on the upstream `MEMBER_PROJECTS` scope —
   documented explicitly so the fail-open is bounded and intentional, not accidental.
3. Build `hiddenFieldIds(wsId, tier)` and `readOnlyFieldIds(wsId, tier)` (each: `field_visibility
   JOIN role_def ON rd.id = fv.role_def_id WHERE rd.workspace_id=? AND rd.tier=? AND fv.visibility=?`).
4. Cache the result **per request** keyed by `(userId, wsId)` (see §3.3) — a single list response
   touches one workspace once, not once per item.

`readOnlyFieldIds` is the **new** batch method (today READ_ONLY is only resolved per-field on the
write path). It is the symmetric counterpart to `hiddenFieldIds` and lets the read path *mark*
READ_ONLY (for the future write-affordance signal) without an N×SQL fan-out.

`FieldDefController` is refactored to delegate to this service (its current inline copies are
deleted) so there is exactly one resolver in the codebase.

### 3.2 The choke point — where redaction is applied

**Redaction is applied at the one place field values are assembled into a response object, not
scattered per-controller.** That place is:

- **Read (work-item responses): `WorkItemReadService.attachFieldValuesBatch(items)`** — the single
  method that populates `WorkItem.fieldValues` for every list/detail/search/board/my/starred/trash
  path. After it builds the per-item `Map<fieldDefId,value>`, it strips `hiddenFieldDefIds` **before**
  setting the map on each item. Because **items in a batch can span multiple workspaces** (search /
  my / starred), redaction resolves the verdict **per item's workspace**, memoized per request:

  ```
  for each distinct workspaceId in the batch:
      sets = fieldVisibilityService.resolveForUser(userId, workspaceId)   // memoized
  for each item:
      item.fieldValues.keySet().removeAll(sets(item.workspace).hiddenFieldDefIds)
  ```

  The item→workspace mapping is obtained in the same batch (one extra query: `SELECT wi.id,
  p.workspace_id FROM work_items wi JOIN projects p ON p.id = wi.project_id WHERE wi.id IN (…)`), or
  by reusing `project_id` already on each `WorkItem` plus a `project_id→workspace_id` lookup. This
  keeps the whole batch at O(distinct-workspaces) RBAC resolutions, not O(items).

- **Read (dedicated endpoint): `FieldDefController.getValues`** already redacts HIDDEN; it is
  re-pointed at `FieldVisibilityService` so it shares the exact same logic (no behavior change, just
  de-duplication).

- **Write: `FieldDefController.setValue`** already rejects HIDDEN/READ_ONLY; re-pointed at the
  service. `deleteValue` gains the **same** guard (close the gap at §2). These two are the canonical
  write choke point for the unified `work_item_field_value` store.

This is deliberately the *narrowest* choke point that covers the leak: a single read method and the
two `FieldDefController` value mutators. No Jackson serializer hook, no controller-advice — those
would be broader and harder to reason about for a security control.

### 3.3 Per-request memoization

`resolveForUser` is wrapped so repeated calls for the same `(userId, wsId)` within one request reuse
the first result. Implementation: a request-scoped cache bean, or a simple `Map` built and passed
within `attachFieldValuesBatch` for the batch's distinct workspaces. No cross-request caching (rules
can change; a stale cache is a security risk) — scope is strictly the current request.

### 3.4 Fail-open vs fail-closed — explicit decision

The existing helpers fail-**open** (`EDITABLE` / empty set on null/exception). For a security
control that is risky. This slice:

- **Read path:** on an *exception* computing the sets (DB error), **fail-closed for HIDDEN** is
  impractical (we'd have to drop all field values). Instead: log at WARN and **redact nothing**
  (degrade to current behavior) — but the exception is surfaced to observability so it is never
  silent. Documented as a known residual; acceptable because the upstream workspace scope still
  bounds *which items* are visible. (No over-redaction on transient DB errors.)
- **Write path:** on an exception resolving a single field's visibility, **fail-closed** — reject
  the write with the standard 403. A write is rarer and reversible by the user; denying on
  uncertainty is the safe default and does not leak.
- **`tier == 0` (non-member):** the read should never reach a non-member because `MEMBER_PROJECTS`
  already excludes those items; the write endpoints sit behind the same tenant scope. We therefore
  do **not** treat `tier==0` as "see everything"; we document that this branch is unreachable for
  in-tenant items and redact nothing extra (the bound is the tenant scope, not FLS).

---

## 4. Read path — conservative, no over-redaction

**Rule:** a field-def value is omitted from a response **only** when there is an **explicit
`HIDDEN`** rule for the caller's tier in that field's workspace. Everything else is returned
unchanged.

- No rule configured → `EDITABLE` (default) → **visible**. (Empty `field_visibility`/`role_def` =
  today's behavior = nothing redacted. The change is invisible until an admin authors a HIDDEN rule.)
- `READ_ONLY` → **value is still returned** (it must render; it is simply not writable). READ_ONLY is
  *not* a read-redaction case — only HIDDEN removes a value from a read response.
- `HIDDEN` → key dropped from `WorkItem.fieldValues` (and from `getValues`' returned list).

This is the conservative posture the task mandates: **redact only the explicitly-HIDDEN set; never
over-redact.** A higher tier with no HIDDEN rule sees the value; a lower tier with a HIDDEN rule does
not — exactly the "manager drill-down blocked at the API" shape, expressed per field/per tier.

The read path may *optionally* attach the `readOnlyFieldDefIds` set to the response as a
non-redacting hint (so the UI can render read-only affordances without a second call). This is
additive metadata, not a security action, and can be deferred — flagged, not built, in this slice if
it widens the response contract.

---

## 5. Write path — reject READ_ONLY/HIDDEN edits with the standard error shape

Writes to the unified `work_item_field_value` store go through `FieldDefController.setValue` /
`deleteValue`. Both resolve `(wsId, tier)` and consult `FieldVisibilityService.resolveFieldVisibility`:

- `HIDDEN` → `throw ApiException.forbidden("You do not have permission to access this field.")`
- `READ_ONLY` → `throw ApiException.forbidden("This field is read-only for your role.")`

`ApiException.forbidden` yields the **standard error shape** `{ code: "FORBIDDEN", message }` at HTTP
403 via the existing `@ControllerAdvice` (RB-10 §4, one error shape everywhere). `setValue` already
does HIDDEN+READ_ONLY; **`deleteValue` is brought to parity** (currently unguarded). The write path
fails **closed** on resolution error (§3.4).

---

## 6. Coverage list — in scope vs out of scope for this slice

### In scope — surfaces that GET redaction (reads)
1. `WorkItemReadService.attachFieldValuesBatch` (the choke point) → automatically covers:
   `GET /work-items` (list), `GET /work-items/{id}` (detail), `GET /work-items/search`,
   `GET /work-items/starred`, `GET /work-items/trash`, `GET /work-items/my`.
2. `FieldDefController.getValues` (`GET /field-defs/values/{workItemId}`) → re-pointed at the shared
   service (already redacts HIDDEN; de-duplicated, hardened per §3.4).

### In scope — write points that GET protection
3. `FieldDefController.setValue` (`PUT /field-defs/values/{id}/{fieldDefId}`) → re-pointed at the
   shared service (already enforced).
4. `FieldDefController.deleteValue` (`DELETE /field-defs/values/{id}/{fieldDefId}`) → **new** guard
   (currently the open gap).

### In scope — refactor (no behavior change)
5. Extract `resolveFieldVisibility` / `hiddenFieldIds` + add `readOnlyFieldIds` into
   `FieldVisibilityService`; delete the inline copies in `FieldDefController`.

### Explicitly OUT of scope for this slice (enumerated, with rationale)
- **Legacy `custom_fields` JSONB read leak — NOW IN SCOPE / CLOSED (correction).** The original
  rationale assumed this store is keyed by `field_key`; adversarial verification showed that **post-V80
  its keys ARE `field_def` ids**, so a HIDDEN field leaked through it identically to
  `work_item_field_value`. `redactHiddenFieldValues` now strips HIDDEN keys from `WorkItem.customFields`
  too (and runs even when the `work_item_field_value` map is empty, for legacy-only items). Proven by
  the IT `hiddenValue_inLegacyCustomFieldsJsonb_isAlsoRedacted`. The legacy JSONB **write** guard stays
  out of scope (the V80 store is being dropped; object-level RBAC still applies).
- **`WorkItemCommandService.persistCustomFields` write guard** — writes the legacy JSONB column, not
  `work_item_field_value`; same JSONB rationale. Out of scope for the same reason. (Object-level RBAC
  `create_items`/`canEdit` still applies.)
- **BQL field-level filtering** (`BqlCompiler` 391–420; `BqlContextFactory` tier gate). BQL
  **predicates** can probe a HIDDEN field's value by binary-searching filters (RB-10 §6: "field
  access inside BQL respects field-level security"). This is a *filter-leak/inference* vector, not
  direct serialization (`BqlExecutionService.SELECT_COLUMNS` does not project custom-field values).
  **Out of scope for this slice** — recorded as the next FLS follow-up so the direct-serialization
  leak (the dominant one) ships first.
- **`WorkflowRuleEngine` system writes** (`upsertCustomField` 228–244) and reads
  (`getCustomFieldValue` 213–221). These are **system/automation** actions, not per-user edits.
  **Decision:** automation runs as a trusted/system context (cf. `TenantScope.runAsSystem`) and
  **skips per-user READ_ONLY/HIDDEN** checks — otherwise valid automations break. Confirmed
  non-goal; noted so it is a deliberate exclusion, not an oversight.
- **`SprintDao.itemsForSprint` and other builders** verified to **not** populate
  `customFields`/`fieldValues`, so they serialize no field-def values — nothing to redact.
- **Rule authoring UI + seed data.** This slice enforces rules; it does not build the admin UI to
  create `field_visibility`/`role_def` rows, nor seed any. Because both tables are empty today, the
  enforcement is a **no-op in production until rules exist** — which makes the rollout inherently
  safe (zero behavior change for current data). Seeding/authoring is a separate follow-up. *(If a
  V110 data migration to seed demo `role_def` rows on the V7 1–5 tier scale is wanted for
  testability, it is forward-only and would take V110 — flagged, not assumed.)*
- **Tier-source reconciliation** (`roles.tier` vs `role_def.tier`, §2) — kept as-is this slice;
  larger RBAC change deferred (§7).

### No schema migration required
`field_visibility`, `role_def`, `field_def` already exist (V21). Enforcement is pure application
logic over existing columns — forward-safe and reversible by removing the calls.

---

## 7. Holistic / second-order notes

- **Unification layers:** reuses the one RBAC service (`RbacService.getUserTier`) and the one error
  shape — no new auth or error surface.
- **Tenant filter interplay (#243):** redaction runs *after* tenant scoping; it narrows *fields*,
  never *rows*. Independent of the central Hibernate filter EPIC; no ordering conflict.
- **Performance (RB-40 §5):** O(distinct-workspaces-in-batch) RBAC resolutions + 2 indexed SQL reads
  per workspace, memoized per request — negligible against list/detail budgets. No N+1 (the explicit
  failure mode if redaction were done per-item).
- **Deferred RBAC reconciliation:** properly resolving membership-role → `role_def` (so rules can
  key on the user's *actual* assigned custom role, not just a coincident tier) is a larger RBAC
  change. Out of scope; recorded here so the coincidental tier-match is a known, bounded assumption.

---

## 8. Test plan (Stage 3) — a Field-Level-Security IT (Testcontainers)

Mirror `CrossTenantFilterIsolationIT` / `WorkspaceFilterScopeIT`: `@Tag("integration")
@Testcontainers @SpringBootTest @Transactional`, real `postgres:16-alpine` + `@ServiceConnection`,
raw `JdbcTemplate` seeding with id-scoped DELETE teardown, `em.clear()` after seed, AssertJ.
`FieldDefControllerAccessTest` (unit, Mockito) is the model for controller allow/deny unit tests.

**New `FieldLevelSecurityIT` seeds:** one workspace WS; one project + one work item; one `field_def`
("Salary"); two `role_def` rows at **tier 1 (VIEWER)** and **tier 4 (ADMIN)** on the V7 1–5 scale;
`field_visibility` = HIDDEN for the tier-1 role, plus a second field ("Notes") = READ_ONLY for
tier-1; `work_item_field_value` rows for both fields; `workspace_members` rows binding a low-tier
user (VIEWER) and a high-tier user (ADMIN); set the `SecurityContext` principal so
`AuthenticatedUser.id()` resolves each test user.

**Mandatory scenario categories (RB-05 Stage 3 / RB-40 §1):**

| Scenario | Assertion |
|---|---|
| **Happy — high tier sees value** | ADMIN: `WorkItem.fieldValues` contains the HIDDEN field's id+value; `getValues` returns it. |
| **Read redaction — low tier** | VIEWER: `WorkItem.fieldValues` does **not** contain the HIDDEN field id (in **both** `GET /work-items/{id}` embedded map **and** `GET /field-defs/values/{id}`); the READ_ONLY field's value **is** still present (not over-redacted). |
| **Conservative — no rule = visible** | A third field with no `field_visibility` rule is present for **both** tiers. |
| **Write — READ_ONLY rejected** | VIEWER `PUT /field-defs/values/{id}/{readOnlyFieldId}` → 403, body `{code:"FORBIDDEN", message:"This field is read-only for your role."}`. ADMIN succeeds. |
| **Write — HIDDEN rejected** | VIEWER `PUT`/`DELETE` on the HIDDEN field → 403 `{code:"FORBIDDEN"}`. (deleteValue parity test.) |
| **Unauthorized** | A user who is not a member of WS gets the item filtered out by `MEMBER_PROJECTS` (404/empty) — FLS never reached; documents the bound. |
| **Cross-tenant** | A user in a *different* workspace seeded with the same field_def id space cannot see WS's item nor its field values (existing tenant scope holds under FLS). |
| **Batch multi-workspace** | `search`/`my` spanning two workspaces redacts per-item-workspace correctly (HIDDEN in WS-A stripped, visible in WS-B where no rule). |

**Unit (Mockito, `@Tag("unit")`):** `FieldVisibilityService.resolveForUser` returns the right
hidden/read-only sets for given tier; most-restrictive-wins (HIDDEN beats READ_ONLY for the same
field across two roles at one tier); fail-closed on write-resolution exception.

**Regression:** existing `FieldDefControllerAccessTest`, `WorkspaceTenantIsolationIT`,
`CrossTenantFilterIsolationIT`, `WorkspaceFilterScopeIT` stay green; full unit + integration +
smoke-boot + guardrails gate green (RB-10, Orchestrator §4).

---

## 9. Acceptance criteria

- One `FieldVisibilityService` is the **only** field-visibility resolver; `FieldDefController`'s
  inline copies are gone and it delegates to the service.
- A HIDDEN field value is **absent** from every work-item read response (list/detail/search/my/
  starred/trash **and** `getValues`) for a tier with a HIDDEN rule, and **present** for a tier
  without one — proven by IT.
- READ_ONLY values are still **returned** on reads and **rejected on write** (`setValue` *and*
  `deleteValue`) with the standard `{code:"FORBIDDEN"}` 403 shape.
- No over-redaction: fields with no explicit HIDDEN rule are unchanged for all tiers.
- Legacy JSONB, BQL filter-leak, automation writes, rule-authoring UI, and tier reconciliation are
  documented as out-of-scope with rationale (§6/§7).
- Full gate green (unit + integration + smoke-boot + guardrails); mandatory unauthorized +
  cross-tenant scenarios pass.

## 10. Rollback

Pure application logic over existing tables; no migration. Remove the redaction calls in
`attachFieldValuesBatch` and the `deleteValue` guard, and revert `FieldDefController` to its inline
helpers — behavior returns to exactly today's. Zero data/schema risk. Because production
`field_visibility`/`role_def` are empty, the enforcement is a no-op on current data, so the change is
inert (and therefore safe) until rules are authored.
