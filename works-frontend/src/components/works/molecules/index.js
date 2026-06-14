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

export { DonutChart } from './donut-chart';
export { BarChart } from './bar-chart';
export { SegmentBar } from './segment-bar';
export { DayBars } from './day-bars';
export { PairedBars } from './paired-bars';
// Pivot chart library — the renderers that cover the 19 server chart types, dispatched by
// <PivotChart/> (organisms). Each is domain-free and consumes a reshaped pivot result.
export { LineChart } from './line-chart';
export { StackedBarChart, GroupedBarChart, HeatmapChart, MatrixTable } from './matrix-chart';
export { ScatterChart } from './scatter-chart';
export { TreemapChart, FunnelChart } from './treemap-chart';
export { Scorecard, Gauge, Sparkline } from './scalar-chart';
export { ComboChart } from './combo-chart';
export { PivotTable } from './pivot-table';
