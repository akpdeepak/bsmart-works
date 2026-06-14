/**
 * Organisms — CLAUDE.md §4.19 Atomic Design.
 *
 * Organisms compose molecules + atoms and CAN accept domain data.
 * They represent complete, self-contained sections of UI.
 * Target inventory (build as features require):
 *   WorkItemRow      — single row in the work-item list (title, status, assignee, priority)
 *   SprintCard       — sprint summary card (name, dates, capacity bar, item count)
 *   ModeRail/SubRail — the two-tier left navigation (navy icon rail + contextual surface list)
 *   CommandPalette   — ⌘K overlay (search input, fuzzy results, keyboard nav)
 *   BulkActionBar    — fixed-bottom bar that appears when ≥1 row is selected
 *   NotificationList — notification panel content (bell icon → right panel)
 *   WorkItemDetail   — right-panel detail view for a single work item
 *
 * Rules (CLAUDE.md §4.19):
 *   - Compose molecules + atoms; may receive domain-typed props (WorkItem, Sprint, etc.).
 *   - No business logic — data comes from hooks/queries in the parent page.
 *   - File naming: kebab-case.jsx beside kebab-case.test.jsx.
 *   - Export each organism from this index once it exists.
 */

export { ModeRail } from './mode-rail';
export { SubRail } from './sub-rail';
export { UserMenu } from './user-menu';
export { DeveloperWorkspace } from './developer-workspace';
export { CommandPalette } from './command-palette';
export { OfflineBanner } from './offline-banner';
export { PresenceBar } from './presence-bar';
export { ConflictResolver } from './conflict-resolver';
export { ShortcutsHelp } from './shortcuts-help';
export { StatusPage } from './status-page';
export { PushSettingsPanel } from './push-settings-panel';
// Multi-dimensional pivot widgets — one dispatcher + one shared builder, reused across
// Dashboards, the Report Builder and Reports (RB-10 §2/§6: one source of truth, server-scoped).
export { PivotChart } from './pivot-chart';
export { WidgetBuilder } from './widget-builder';
