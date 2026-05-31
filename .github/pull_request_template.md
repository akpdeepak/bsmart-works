<!-- bSmart Works PR. The checklist mirrors CLAUDE.md §7 (Definition of Done).
     CI enforces most of these automatically; tick the rest honestly. -->

## What & why
<!-- One or two sentences. Link the iteration/work item. -->

- Iteration: <!-- e.g. 2 — confirm this work belongs to the active iteration -->
- Work item / issue:

## Definition of Done

**Backend**
- [ ] New endpoints validate input with `@Valid`, sit under `/api/v1/`, plural kebab path
- [ ] Schema changes are a Flyway migration (`V15+`, `V{n}__snake_case.sql`), plural table names
- [ ] RBAC checks are in the service layer via `RbacService`, not in controllers
- [ ] Errors use the standard `{ code, message, field? }` shape via `@ControllerAdvice`
- [ ] New code is in `com.example.demo` (no new top-level packages without a rename plan)

**Frontend**
- [ ] No raw hex / arbitrary px — token classes only (`brand-*`, `neutral-*`, `semantic-*`)
- [ ] New components follow the `button.jsx` cva + `cn()` pattern
- [ ] All HTTP goes through the `apiClient` wrapper (no inline fetch/axios)

**Cross-cutting**
- [ ] AI features have a documented deterministic fallback
- [ ] Scope matches the task — no speculative features or abstractions
- [ ] `node scripts/generate-ai-rules.mjs --check` passes (AI rules in sync with CLAUDE.md)

## Screenshots / evidence
<!-- For UI changes, before/after. For API changes, a sample request/response. -->
