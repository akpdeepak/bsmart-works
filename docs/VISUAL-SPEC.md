# bSmart Works Visual Spec

This is the UIUX program source of truth for premium visual craft. It complements `docs/brand/brand-and-identity.md` and is enforced by `scripts/uiux-end-to-end-scope.mjs` plus the Premium Bar.

## Typography

Use semantic type utilities only for product hierarchy:

| Token | Use |
|---|---|
| `text-display` | rare hero/dashboard number moments |
| `text-title` | page-level titles |
| `text-heading` | section titles |
| `text-subheading` | card/dialog titles |
| `text-body` / `text-body-sm` | primary reading text |
| `text-caption` | metadata and helper text |
| `text-overline` | compact uppercase labels |
| `font-mono` | IDs, code, formulas, telemetry values |

Line-height and letter spacing are owned by the token. Do not use arbitrary font sizes in product UI.

## Iconography

Lucide is the only product icon set. Standard sizes are:

| Size | Class | Use |
|---|---|---|
| 16 | `h-4 w-4` | dense rows, chips, compact buttons |
| 20 | `h-5 w-5` | default icon buttons and empty-state symbols |
| 24 | `h-6 w-6` | modal/detail emphasis |
| 32 | `h-8 w-8` | rare page-level or illustration emphasis |

One icon has one meaning within a surface. If an icon-only action is unfamiliar, it must have an accessible label and hover/focus tooltip or equivalent context.

## Illustration And Imagery

Use `EmptyState` variants for zero-data, onboarding, error, and success states. Use `Avatar` for people: image when available, otherwise deterministic initials colour. Do not introduce stock imagery for operational surfaces.

## Signature Moments

Use restrained feedback only when it confirms value:

- `SuccessCheck` for item-done, onboarding milestone, and saved-state completion.
- `ToastStack` for queued notifications.
- `duration-base` and `out-quint` motion tokens, always respecting reduced motion.

## Mobile And Touch

Touch targets should be at least 32 px in dense controls and 40 px for primary actions. Boards and dense tables must scroll predictably instead of wrapping into unreadable cards unless a dedicated mobile layout exists.

## Premium Bar

Every changed UI surface must meet `docs/PREMIUM-BAR-COVERAGE.md`: tokens, shared primitives, all data states, keyboard access, dark mode, no raw page chrome, and visual-regression coverage or explicit ledger entry.
