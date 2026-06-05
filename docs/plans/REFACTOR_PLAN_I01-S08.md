# Refactor Plan — I01-S08 · Cap F · Kanban board (basic)

**Iteration:** 1 · **Mode:** AUTO. **Spec:** *"Column-based board mapped to default statuses. Drag-drop status changes. Card density modes."*
**Classification:** **Implemented → polished.** Columns (Todo / In Progress / Done with brand-token dots), drag-drop status change with **optimistic UI + revert on failure**, density modes (compact/comfortable/spacious), per-column counts and a "Drop items here" empty state all already meet the spec and the Part-4 non-negotiables.

## Phase 1 — finding
- The board's **loading state used a spinner** ("Loading board…", `animate-spin`) — a direct Part-4 violation ("skeleton loaders, never spinners"). Worse, a correctly-built **column skeleton** sat directly below it as **dead code**, unreachable behind an impossible second `loading ?` ternary branch.

## Phase 2 — scope (in)
1. Wire the existing column skeleton into the loading branch and delete the spinner + the dead ternary. The board now shows a layout-matching skeleton while items load (Part-4).

## Out of scope (parked)
- Board reads its work items from the shared `workItems` list, already tenant-scoped at the API in I01-S07 — no board change needed.
- Per-type/configurable board columns (workflow statuses) → Iteration 3 (workflow editor). MVP uses the 3 default columns.
- Extracting the board out of `App.jsx` → monolith-decomposition tech-debt.

## Tests / validation
- Frontend `npm run lint` clean, `npm run build` OK, full Vitest suite green (board lives in the un-unit-tested `App.jsx` monolith; behavior verified by build + manual logic review). No backend change, no migration.

## Risk
- Very low: removes a spinner + dead branch, enables an already-written skeleton. Revert = revert branch.
