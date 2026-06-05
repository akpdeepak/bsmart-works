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

**Result:** `App.jsx` UI is emoji-free (only the legacy type-icon back-compat data map
references emoji); no light-mode `neutral-400` readable text remains; failures surface as
toasts; the shell works on mobile.

## Remaining (P1)

- **D2/E3** — convert remaining inline `fixed inset-0` modals to the accessible `<Modal>`;
  move large creation flows (New Item, New Project) into a right-side drawer; finish the
  3 deferred clickable elements (2 modal backdrops + the accordion header).
- **E1/D3** — migrate the ~169 raw inputs / ~89 unlabeled controls to `FormField`+`Input`
  (labels, required `*`, `aria-describedby/invalid`, inline validation, submit loading).
- **F5** — optimistic updates + targeted query invalidation (replace refetch-on-mutation).
- **A3/H2 + H1** — decompose `App.jsx` into per-view route modules under lint, then
  `React.lazy` per route and re-enable the guardrail gate (finding J). Largest + riskiest;
  best done with runtime verification available.

## Needs a human runtime smoke (merged on the static gate)
- #119 error toasts — trigger a failed save (offline) → expect one error toast.
- #121 responsive shell — check 375 / 768 / 1280 px: drawer open/close, backdrop tap, nav.
- #118 type-icon picker — Settings → Work Item Types: pick an icon, create a custom type.
