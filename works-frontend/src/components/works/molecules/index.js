/**
 * Molecules — CLAUDE.md §4.19 Atomic Design.
 *
 * Molecules compose atoms into reusable UI chunks that still carry no domain data.
 * Target inventory (build as features require):
 *   SearchInput      — debounced text input + Search icon
 *   FilterBar        — row of filter chips with active-state styling
 *   FormField        — Label + Input/Select + helper text + inline error
 *   UserAvatar       — Avatar + display name + optional role badge
 *   RowActions       — hover-visible icon button row (edit · delete · more)
 *   DateRangeInput   — from/to date picker pair
 *
 * Rules (CLAUDE.md §4.19):
 *   - Compose atoms; add no domain data (no workItem / sprint / project props).
 *   - Use cva + cn() exactly as atoms/input.jsx demonstrates.
 *   - File naming: kebab-case.jsx beside kebab-case.test.jsx.
 *   - Export each molecule from this index once it exists.
 */
