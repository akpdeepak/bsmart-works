/**
 * Iteration 6 — extra dashboard metrics, layered on top of the existing
 * config-driven widgets (SCORECARD / STATUS_BAR / ITEM_LIST / PIE / BAR + drill-down).
 * Pure helpers only (no JSX) so they are unit-testable; the widget cards in App.jsx
 * render their output.
 */

// Token-only series colours (CLAUDE.md §4.2 — no raw hex). Cycled for multi-series viz.
export const SERIES_BG = [
  'bg-brand-navy', 'bg-brand-navy-tint', 'bg-brand-orange', 'bg-brand-amber',
  'bg-semantic-success', 'bg-semantic-info', 'bg-semantic-warning', 'bg-neutral-400',
];

const HIGH_PRIORITIES = ['HIGH', 'CRITICAL', 'HIGHEST'];
const MATRIX_PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

/**
 * Filter work items by a widget's config.filter. Superset of the original inline
 * filter (open/status/priority/type) — adds done/mine/overdue/highPriority/blocked
 * so metric scorecards work without bespoke widget types.
 */
export function filterItems(items, filter = {}, ctx = {}) {
  const today = ctx.today ? new Date(ctx.today) : new Date();
  const weekAhead = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  return (items || []).filter(i => {
    if (filter.open && i.status === 'Done') return false;
    if (filter.done && i.status !== 'Done') return false;
    if (filter.mine && i.assigneeId !== ctx.currentUserId) return false;
    if (filter.unassigned && i.assigneeId) return false;
    if (filter.status && i.status !== filter.status) return false;
    if (filter.priority && i.priority !== filter.priority) return false;
    if (filter.type && i.type !== filter.type) return false;
    if (filter.highPriority && !HIGH_PRIORITIES.includes(String(i.priority || '').toUpperCase())) return false;
    if (filter.blocked && i.status !== 'Blocked') return false;
    if (filter.overdue) {
      if (!i.dueDate || i.status === 'Done') return false;
      if (new Date(i.dueDate) >= today) return false;
    }
    if (filter.dueSoon) {
      if (!i.dueDate || i.status === 'Done') return false;
      const due = new Date(i.dueDate);
      if (due < today || due > weekAhead) return false;
    }
    return true;
  });
}

/** Status breakdown as a sorted {label,value} series (for cumulative-flow stacks). */
export function statusBreakdown(items) {
  const counts = {};
  (items || []).forEach(i => { const k = i.status || 'None'; counts[k] = (counts[k] || 0) + 1; });
  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

/** Status × priority count grid. */
export function statusPriorityMatrix(items) {
  const statuses = [...new Set((items || []).map(i => i.status || 'None'))].slice(0, 8);
  const rows = statuses.map(st => {
    const cells = MATRIX_PRIORITIES.map(p =>
      (items || []).filter(i => (i.status || 'None') === st && String(i.priority || '').toUpperCase() === p).length);
    return { label: st, cells, total: cells.reduce((a, b) => a + b, 0) };
  });
  return { cols: MATRIX_PRIORITIES, rows };
}

/** Active-sprint progress — delivered (health) or remaining (burndown) points. */
export function sprintProgress(sprints, mode = 'health') {
  const sprint = (sprints || []).find(s => s.status === 'ACTIVE') || null;
  const total = Number(sprint?.totalPoints ?? sprint?.capacity ?? 0);
  const done = Number(sprint?.donePoints ?? sprint?.done_points ?? 0);
  return mode === 'burndown'
    ? { value: Math.max(total - done, 0), max: total, label: 'Remaining', sprint }
    : { value: done, max: total, label: 'Delivered', sprint };
}

/** Velocity history as {label,value} points for a sparkline. */
export function velocityPoints(velocity) {
  return (velocity || []).map(s => ({
    label: s.name || s.sprintName || '',
    value: Number(s.donePoints ?? s.done_points ?? 0),
  }));
}

/**
 * Count work items grouped by one dimension (status/type/priority), sorted desc.
 * Feeds the PIE and BAR dashboard widgets.
 */
export function aggregateByDimension(items, dimension) {
  const counts = {};
  (items || []).forEach(i => {
    const key = i[dimension] || 'None';
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Apply a report section's filter to the work-item set.
 * Mirrors the dashboard widget filter for consistency.
 */
export function filterReportItems(items, filter = {}) {
  return (items || []).filter(i => {
    if (filter.open && i.status === 'Done') return false;
    if (filter.status && i.status !== filter.status) return false;
    if (filter.priority && i.priority !== filter.priority) return false;
    if (filter.type && i.type !== filter.type) return false;
    return true;
  });
}

/**
 * Palette presets that EXTEND the five built-in widgets. Metric entries reuse the
 * existing SCORECARD type with a richer filter; the rest are new widget types
 * rendered by DashboardWidgetCard. Grouped for the categorized palette (Hick's law).
 */
export const EXTRA_WIDGET_PRESETS = [
  // Metrics — SCORECARD with extended filters
  { category: 'Metrics', type: 'SCORECARD', title: 'Total items',    config: { filter: {} } },
  { category: 'Metrics', type: 'SCORECARD', title: 'Open items',     config: { filter: { open: true } } },
  { category: 'Metrics', type: 'SCORECARD', title: 'Overdue',        config: { filter: { overdue: true } } },
  { category: 'Metrics', type: 'SCORECARD', title: 'Due this week',  config: { filter: { dueSoon: true } } },
  { category: 'Metrics', type: 'SCORECARD', title: 'My open items',  config: { filter: { mine: true, open: true } } },
  { category: 'Metrics', type: 'SCORECARD', title: 'Unassigned',     config: { filter: { unassigned: true, open: true } } },
  { category: 'Metrics', type: 'SCORECARD', title: 'High priority',  config: { filter: { highPriority: true } } },
  { category: 'Metrics', type: 'SCORECARD', title: 'Blocked',        config: { filter: { blocked: true } } },
  { category: 'Metrics', type: 'SCORECARD', title: 'Completed',      config: { filter: { done: true } } },
  { category: 'Metrics', type: 'SCORECARD', title: 'Bugs',           config: { filter: { type: 'Bug' } } },
  { category: 'Metrics', type: 'SCORECARD', title: 'Stories',        config: { filter: { type: 'Story' } } },
  // Distribution — config-driven PIE/BAR/STATUS_BAR/ITEM_LIST over a dimension
  { category: 'Distribution', type: 'PIE',        title: 'Status (pie)',     config: { dimension: 'status' } },
  { category: 'Distribution', type: 'BAR',        title: 'Priority (bar)',   config: { dimension: 'priority' } },
  { category: 'Distribution', type: 'PIE',        title: 'Type (pie)',       config: { dimension: 'type' } },
  { category: 'Distribution', type: 'STATUS_BAR', title: 'Items by status',  config: {} },
  { category: 'Distribution', type: 'ITEM_LIST',  title: 'Recent items',     config: { limit: 6 } },
  // Sprint & trends — dedicated widget types
  { category: 'Sprint',  type: 'SPRINT_HEALTH',   title: 'Sprint health',   config: {} },
  { category: 'Sprint',  type: 'BURNDOWN',        title: 'Sprint burndown', config: { mode: 'burndown' } },
  { category: 'Sprint',  type: 'VELOCITY_LINE',   title: 'Velocity trend',  config: {}, w: 6 },
  { category: 'Sprint',  type: 'CUMULATIVE_FLOW', title: 'Cumulative flow', config: {}, w: 6 },
  // Advanced
  { category: 'Advanced', type: 'MATRIX', title: 'Status × priority', config: {}, w: 6 },
];

export const EXTRA_WIDGET_CATEGORIES = ['Metrics', 'Distribution', 'Sprint', 'Advanced'];
