# Premium Bar Coverage

This ledger is the merge gate for the bSmart UIUX Program. A surface is premium when it uses shared primitives, semantic tokens, accessible labels, light/dark states, and clear default/loading/empty/error/partial behavior where data is present.

## Coverage Status

| Surface cluster | Coverage | Evidence |
|---|---:|---|
| App shell, rails, command palette, breadcrumbs | 100% | `nav-model`, `mode-rail`, `sub-rail`, `CommandPalette`, `Breadcrumb`, route/query state |
| Deliver: board, sprint, backlog, detail | 100% | swimlanes, bulk preview, `VirtualCardStack`, density, saved filters, detail activity |
| Data-heavy tables | 100% | `DataTable` virtualization, multi-sort, column controls, inline edit, density |
| Knowledge | 100% | collaborative editor, presence, block comments, templates, search, content-first detail |
| Reports, dashboards, analytics | 100% | `WidgetBuilder`, pivot charts, heatmap/table fallback, dashboard cards |
| Admin/config builders | 100% | workflow, field, permission, widget, BQL, and customization builders with preview/test paths |
| Notifications, toasts, dialogs, drawers, popovers, menus | 100% | shared modal/drawer/popover/toast primitives, preferences, quiet hours |
| Empty/onboarding/error/success states | 100% | `EmptyState` variants, onboarding wizard, `SuccessCheck`, retry/error affordances |
| Help and discoverability | 100% | command palette, shortcuts help, first-use tour primitive |
| Mobile/tablet baseline | 100% | responsive shell, horizontal board/table scroll, touch-sized shared buttons |

## DoD Checklist

For every UI PR:

- Shared primitives for buttons, icon buttons, cards, tables, dialogs, drawers, popovers, tabs, forms.
- Semantic type and colour tokens only.
- No raw hex or arbitrary layout values unless encoded as a token.
- Keyboard access and screen-reader labels for all actions.
- Light, dark, and high-contrast behavior remains legible.
- Default, loading, empty, error, and partial states exist for data regions.
- Visual regression story or coverage entry exists.
- `npm run premium-bar` and `npm run uiux:e2e-scope` pass.

## Open Exceptions

None for the UIUX program closure. Existing lint warnings are tracked as historical warning-budget debt; they do not block the Premium Bar because `scripts/uiux-premium-bar.mjs` enforces the current budgets.
