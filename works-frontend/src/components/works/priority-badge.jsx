// Priority badge, extracted from the App.jsx monolith. PRIORITY_CONFIG stays module-private (it is
// used only here) so this file exports a single component (react-refresh/only-export-components).
// The unified <Badge> work (UX finding A4) will later fold this into the one badge API.
const PRIORITY_CONFIG = {
  CRITICAL: { color: 'text-semantic-danger',  bg: 'bg-semantic-danger-surface',  label: 'Critical' },
  HIGH:     { color: 'text-semantic-warning',  bg: 'bg-semantic-warning-surface', label: 'High' },
  MEDIUM:   { color: 'text-neutral-600',       bg: 'bg-neutral-100',              label: 'Medium' },
  LOW:      { color: 'text-neutral-600 dark:text-neutral-400',       bg: 'bg-neutral-50',               label: 'Low' },
};

export function PriorityBadge({ priority }) {
  const p = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.MEDIUM;
  return <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${p.bg} ${p.color}`}>{p.label}</span>;
}
