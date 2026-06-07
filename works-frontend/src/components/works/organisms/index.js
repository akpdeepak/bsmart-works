/**
 * Organisms — CLAUDE.md §4.19 Atomic Design.
 *
 * Organisms compose molecules + atoms and CAN accept domain data.
 * They represent complete, self-contained sections of UI.
 * Target inventory (build as features require):
 *   WorkItemRow      — single row in the work-item list (title, status, assignee, priority)
 *   SprintCard       — sprint summary card (name, dates, capacity bar, item count)
 *   SidebarNav       — the full left navigation (brand-navy, collapsed/expanded, active state)
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

export { SidebarNav } from './sidebar-nav';
export { UserMenu } from './user-menu';
export { DeveloperWorkspace } from './developer-workspace';
export { CommandPalette } from './command-palette';
export { OfflineBanner } from './offline-banner';
export { PresenceBar } from './presence-bar';
export { ConflictResolver } from './conflict-resolver';
export { ShortcutsHelp } from './shortcuts-help';
export { StatusPage } from './status-page';
export { PushSettingsPanel } from './push-settings-panel';
