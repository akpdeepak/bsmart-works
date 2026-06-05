# UX Overhaul — Progress Log

Companion to `docs/UX-CODEBASE-ANALYSIS.md` (the roadmap). Tracks what has shipped to
`main` so the state is always legible. Newest first.

> Verification norm: CI runner is degraded, so each change is verified **locally** before
> merge — `vite build` + `vitest` (172 tests) + `eslint` (changed component files) +
> `scripts/guardrails.sh` (exit 0). `App.jsx` is the `/* eslint-disable */` monolith, so it
> relies on build + guardrails + careful review.

## Shipped (this session)

| PR | Area | Finding(s) | Summary |
|----|------|-----------|---------|
| #115 | Visual / a11y | C1, D2/D6 | Interactive symbol glyphs + inline emoji in `App.jsx` → Lucide with aria-labels (✕/✏/★/☆/arrows/✓ + 🔐📅📍🔍🛡🖼 etc.) |
| #116 | a11y contrast | C2 | All ~267 light-mode `text-neutral-400` readable text → `text-neutral-600 dark:text-neutral-400` (dark-safe; WCAG AA) |
| #117 | Visual | C1 | De-emoji label arrays (backlog quick-filters, PM-artifact tabs, board swimlane labels, blocker cell) → Lucide via an `Icon` field |
| #118 | Visual / product | C1 | Work-item **type icons**: emoji-string model → curated Lucide set + **icon picker**; back-compat map for legacy rows; **no DB migration** |
| #119 | State/feedback | F1/F2 | 95 silent `.catch(() => {})` → one `reportError` toast contract (single-slot, no spam) |
| #120 | Architecture | A3/J | Removed dead shell code (`NavItem`, `NavCollapsedCtx`, `navBadge`, `navDot`) orphaned by the SidebarNav swap |
| #121 | Responsive | G1 | Responsive shell: sidebar → off-canvas drawer under `md` (hamburger + backdrop + close-on-navigate); responsive header/search |
| #123 | a11y modals | D2/E3, D1 | Routed 5 inline `fixed inset-0` dialogs through the accessible `<Modal>` (focus trap, Escape, scroll lock, real backdrop) — cross-project dep, PM create, scheduled delivery, rule builder, new customer |
| #124 | a11y forms | D3/E1 | `Field` helper now wraps its control in the `<label>` (implicit association) — ~95 inputs become labelled for AT in one change |
| #125 | a11y | D1 | Workflow accordion header made keyboard-operable (`role=button`, `tabIndex`, `onKeyDown`, `aria-expanded`, focus ring) |

**Result:** `App.jsx` UI is emoji-free (only the legacy type-icon back-compat data map
references emoji); no light-mode `neutral-400` readable text remains; failures surface as
toasts; the shell works on mobile; 5/6 modals are accessible; `Field` inputs are labelled.

## Remaining — and why each is deferred

These are the open P1 (and one P0) findings. Each is deferred for a concrete reason: it
either needs a **running app** to verify (the static gate can't prove it works) or is a
**high-churn refactor whose value is "done right" = a visual change** that should be eyeballed.

- **A4 (P0) — one `<Card>` atom + unified `<Badge tone>`.** 83 duplicated card-chrome blocks
  and 4 badge components (`TypeBadge`/`PriorityBadge`/`RoleBadge`/`StatusBadge`). Consolidating
  *well* means standardising the inconsistent density (p-4/p-5/p-6) and folding domain
  colour-logic into a tone prop — i.e. deliberate **visual** + behavioural change. Safe to do,
  but should be reviewed in a running app, not merged blind.
- **C5 — shared `<DataTable>`** (sticky header, sortable, zebra/hover). New component + ~10
  table call-sites; visual, wants runtime review.
- **D3/E1 (rest)** — raw placeholder-only inputs *not* wrapped in `Field`, and inline
  `<label>…</label><input>` pairs that aren't associated, still need labels; the full
  `FormField`+`Input` migration (required `*`, `aria-describedby/invalid`, inline validation,
  submit-loading) is a large per-site change.
- **E3 — drawers.** Move the large New Item / New Project flows into a right-side drawer
  (`ThreeZoneLayout` `panel` slot). The dashboard drill-down modal (already `role=dialog` +
  `aria-modal` + Escape + autoFocus) can also move onto `<Modal>` for focus-trap/scroll-lock.
- **F5 — optimistic updates** + targeted query invalidation (replace refetch-on-mutation).
  Changes mutation/caching behaviour — needs runtime verification.
- **F4 / G2** — uniform empty-state next-actions; full dark-mode contrast audit.
- **A3/H2 + H1 + J — decompose `App.jsx`** into per-view route modules under lint, then
  `React.lazy` per route and re-enable the guardrail gate (export libs are already lazy).
  > **Strong recommendation: do this with a running app.** It is deep surgery on an 8,378-line
  > file with 253 hooks and shared closures; build + the current unit tests do **not** exercise
  > the views, so "build-green" ≠ "works". Splitting it blind risks silent runtime breakage on
  > `main`. Sequence it as its own effort with runtime verification, extracting one view at a
  > time and smoke-testing each — this also unblocks H1 route-splitting and finding J (re-enabling
  > ESLint/guardrails on the de-`eslint-disable`d slices).

## Needs a human runtime smoke (merged on the static gate)
- #119 error toasts — trigger a failed save (offline) → expect one error toast.
- #121 responsive shell — check 375 / 768 / 1280 px: drawer open/close, backdrop tap, nav.
- #123 modals — open each converted dialog: Escape + backdrop close, tab stays trapped.
- #118 type-icon picker — Settings → Work Item Types: pick an icon, create a custom type.
