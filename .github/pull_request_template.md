<!-- bSmart Works PR. The checklist mirrors the Orchestrator's Definition of Done (ai-rules/00-ORCHESTRATOR.md §4).
     CI enforces most of these automatically; tick the rest honestly.
     dod-version: 2026-07-19-r1 — must match the tag in ai-rules/00-ORCHESTRATOR.md. -->

## What & why
<!-- One or two sentences. Link the iteration/work item. -->

- Iteration: <!-- e.g. 5 — confirm this work belongs to the active iteration -->
- Work item / issue:

## Plan, acceptance criteria & validation
<!-- Copy or link the plan written before execution. Keep trivial work concise, but complete. -->

- Scope and boundaries: <!-- objective; in scope; out of scope; affected dimensions -->
- Execution steps: <!-- ordered steps; dependencies; assumptions; risks -->
- Acceptance criteria:
  - [ ]
- Validation plan: <!-- criterion → test/check → expected result → evidence -->

## Test-first evidence (coding changes)
<!-- Required for coding-related changes that alter executable behavior. Use N/A with a reason for
     non-code work. For a pure
     refactor, put the pre-edit characterization baseline under RED evidence and state that RED is
     intentionally N/A; do not manufacture a failure. -->

- RED evidence: <!-- test command + intended failure observed before production code -->
- GREEN evidence: <!-- targeted passing command/result after minimum implementation -->
- REFACTOR / final-green evidence: <!-- related/full suite command/result -->

## Definition of Done

**Backend**
- [ ] New endpoints validate input with `@Valid`, sit under `/api/v1/`, plural kebab path
- [ ] Schema changes are a Flyway migration (next sequential `V{n}__snake_case.sql` — Orchestrator §6), plural table names
- [ ] RBAC checks are in the service layer via `RbacService`, not in controllers
- [ ] Errors use the standard `{ code, message, field? }` shape via `@ControllerAdvice`
- [ ] New code is in `com.bcits.works` (package rename TD-001 complete)
- [ ] Logging uses SLF4J `Logger` — no `System.out.println`
- [ ] AI features have a documented deterministic fallback
- [ ] Any PR touching auth, CORS, RBAC, JWT, or file upload is labelled `security-review`

**Frontend / UI**
- [ ] No raw hex / arbitrary px — token classes only (`brand-*`, `neutral-*`, `semantic-*`)
- [ ] New components follow the `button.jsx` cva + `cn()` pattern, filed at the correct Atomic Design level
- [ ] Every interactive element has all 5 states: default, hover, active, disabled, focus ring
- [ ] Every new section or panel supports expand/collapse with localStorage persistence
- [ ] Loading states use skeleton screens (`animate-pulse`) — no content-area spinners
- [ ] Empty states include: icon + why it's empty + CTA to fix it
- [ ] Form errors are inline beneath the field, not toast-only
- [ ] Page-level actions sit in the sticky header top-right, not floating or in sidebar
- [ ] No Tailwind `gray-*` classes — only `neutral-*` from the token set
- [ ] Orange/amber appear at most 1–2 times per screen
- [ ] All text meets WCAG 2.1 AA contrast (`text-neutral-400` or lighter never used for body text)
- [ ] Status/state never communicated by colour alone — label or icon always accompanies colour
- [ ] Every custom non-`<button>` click target has `role`, `tabIndex`, and keyboard handler
- [ ] Focus moves into opened panels/modals; returns to trigger on close
- [ ] Lists that can exceed ~100 rows use virtual scrolling
- [ ] Mutations use optimistic UI — UI updates before API response
- [ ] Z-index uses named tokens (`z-modal`, `z-toast` …), not arbitrary values
- [ ] All HTTP goes through the `apiClient` wrapper (no inline fetch/axios)
- [ ] New list endpoints use `PageResponse<T>` + `Pageable` — no bare `findAll()` on user data

**Cross-cutting**
- [ ] A right-sized execution plan was written before work began, including scope and boundaries, execution steps, acceptance criteria, and a validation plan
- [ ] Coding-related changes followed test-first TDD (RED → GREEN → REFACTOR), or a pure refactor recorded its pre-edit characterization baseline
- [ ] Scope matches the task — no speculative features or abstractions
- [ ] PR diff ≤ 400 lines of changed code, or the description explains why it is larger
- [ ] Any new npm/Maven dependency is documented in the PR description (why added, license, bundle impact)
- [ ] `node scripts/generate-ai-rules.mjs --check` passes (AI rules in sync with CLAUDE.md)
- [ ] `node scripts/check-task-execution-contract.mjs` passes (planning + TDD contract present)
- [ ] `bash scripts/check-dod-sync.sh` passes (DoD version tag in sync)

## Screenshots / evidence
<!-- For UI changes, before/after. For API changes, a sample request/response. -->
