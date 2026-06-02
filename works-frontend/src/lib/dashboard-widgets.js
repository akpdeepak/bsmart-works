/**
 * Iteration 6 — dashboard widget library (catalog + pure compute).
 *
 * The catalog is a set of presets over a handful of render "engines"; a widget's
 * type names a preset, its stored `config` JSON can override any preset field.
 * `computeWidget` turns a widget + the live data context into a render-ready
 * result ({ kind, ... }) — no JSX here, so it is unit-testable in isolation.
 */

export const WIDGET_CATEGORIES = ['Metrics', 'Breakdowns', 'Trends', 'Sprint', 'Lists'];

// Token-only series colours (CLAUDE.md §4.2 — no raw hex). Cycled for multi-series charts.
export const SERIES_BG = [
  'bg-brand-navy', 'bg-brand-navy-tint', 'bg-brand-orange', 'bg-brand-amber',
  'bg-semantic-success', 'bg-semantic-info', 'bg-semantic-warning', 'bg-neutral-400',
];

export const WIDGET_CATALOG = {
  // ── Metrics (single number) ──
  TOTAL_ITEMS:   { label: 'Total items',    category: 'Metrics', icon: '∑', engine: 'count', filter: {}, w: 3, h: 2 },
  OPEN_ITEMS:    { label: 'Open items',      category: 'Metrics', icon: '📌', engine: 'count', filter: { open: true }, w: 3, h: 2 },
  DONE_ITEMS:    { label: 'Completed',       category: 'Metrics', icon: '✅', engine: 'count', filter: { done: true }, tone: 'success', w: 3, h: 2 },
  OVERDUE_ITEMS: { label: 'Overdue',         category: 'Metrics', icon: '⏰', engine: 'count', filter: { overdue: true }, tone: 'danger', w: 3, h: 2 },
  MY_OPEN_ITEMS: { label: 'My open items',   category: 'Metrics', icon: '👤', engine: 'count', filter: { mine: true, open: true }, w: 3, h: 2 },
  HIGH_PRIORITY: { label: 'High priority',   category: 'Metrics', icon: '⬆', engine: 'count', filter: { highPriority: true }, tone: 'warning', w: 3, h: 2 },
  BLOCKED_ITEMS: { label: 'Blocked',         category: 'Metrics', icon: '🚫', engine: 'count', filter: { blocked: true }, tone: 'danger', w: 3, h: 2 },
  BUG_COUNT:     { label: 'Bugs',            category: 'Metrics', icon: '🐛', engine: 'count', filter: { type: 'Bug' }, w: 3, h: 2 },

  // ── Breakdowns (bar / pie / matrix) ──
  STATUS_BAR:    { label: 'Status (bar)',    category: 'Breakdowns', icon: '📊', engine: 'groupBy', field: 'status',   chart: 'bar', w: 6, h: 3 },
  PRIORITY_BAR:  { label: 'Priority (bar)',  category: 'Breakdowns', icon: '📊', engine: 'groupBy', field: 'priority', chart: 'bar', w: 6, h: 3 },
  TYPE_BAR:      { label: 'Type (bar)',      category: 'Breakdowns', icon: '📊', engine: 'groupBy', field: 'type',     chart: 'bar', w: 6, h: 3 },
  ASSIGNEE_BAR:  { label: 'Assignee (bar)',  category: 'Breakdowns', icon: '📊', engine: 'groupBy', field: 'assignee', chart: 'bar', w: 6, h: 3 },
  STATUS_PIE:    { label: 'Status (pie)',    category: 'Breakdowns', icon: '🥧', engine: 'groupBy', field: 'status',   chart: 'pie', w: 4, h: 3 },
  PRIORITY_PIE:  { label: 'Priority (pie)',  category: 'Breakdowns', icon: '🥧', engine: 'groupBy', field: 'priority', chart: 'pie', w: 4, h: 3 },
  TYPE_PIE:      { label: 'Type (pie)',      category: 'Breakdowns', icon: '🥧', engine: 'groupBy', field: 'type',     chart: 'pie', w: 4, h: 3 },
  STATUS_PRIORITY_MATRIX: { label: 'Status × priority', category: 'Breakdowns', icon: '▦', engine: 'matrix', w: 6, h: 3 },

  // ── Trends (line) ──
  VELOCITY_LINE: { label: 'Velocity trend',  category: 'Trends', icon: '📈', engine: 'trend', source: 'velocity', w: 6, h: 3 },

  // ── Sprint ──
  SPRINT_HEALTH: { label: 'Sprint health',   category: 'Sprint', icon: '❤', engine: 'sprintProgress', mode: 'health', w: 4, h: 2 },
  BURNDOWN:      { label: 'Sprint burndown', category: 'Sprint', icon: '🔥', engine: 'sprintProgress', mode: 'burndown', w: 4, h: 2 },
  CUMULATIVE_FLOW: { label: 'Cumulative flow', category: 'Sprint', icon: '🌊', engine: 'groupBy', field: 'status', chart: 'stacked', w: 6, h: 2 },

  // ── Lists ──
  RECENT_ITEMS:       { label: 'Recent items',         category: 'Lists', icon: '🕀', engine: 'list', filter: {}, sort: 'recent', limit: 6, w: 6, h: 3 },
  MY_ITEMS:           { label: 'My items',             category: 'Lists', icon: '👤', engine: 'list', filter: { mine: true }, limit: 6, w: 6, h: 3 },
  HIGH_PRIORITY_LIST: { label: 'High priority items',  category: 'Lists', icon: '⬆', engine: 'list', filter: { highPriority: true }, limit: 6, w: 6, h: 3 },
};

// Backward-compatible aliases for the three starter types shipped in the designer PR.
const LEGACY = {
  SCORECARD: WIDGET_CATALOG.OPEN_ITEMS,
  STATUS_BAR: WIDGET_CATALOG.STATUS_BAR,
  ITEM_LIST: WIDGET_CATALOG.RECENT_ITEMS,
};

const HIGH_PRIORITIES = ['HIGH', 'CRITICAL', 'HIGHEST'];
const MATRIX_PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export function widgetSpec(type) {
  return WIDGET_CATALOG[type] || LEGACY[type] || { label: type || 'Widget', engine: 'count', filter: {} };
}

export function applyFilter(items, filter = {}, ctx = {}) {
  const today = ctx.today ? new Date(ctx.today) : new Date();
  return (items || []).filter(i => {
    if (filter.open && i.status === 'Done') return false;
    if (filter.done && i.status !== 'Done') return false;
    if (filter.mine && i.assigneeId !== ctx.currentUserId) return false;
    if (filter.type && i.type !== filter.type) return false;
    if (filter.status && i.status !== filter.status) return false;
    if (filter.priority && i.priority !== filter.priority) return false;
    if (filter.highPriority && !HIGH_PRIORITIES.includes(String(i.priority || '').toUpperCase())) return false;
    if (filter.blocked && i.status !== 'Blocked') return false;
    if (filter.overdue) {
      if (!i.dueDate || i.status === 'Done') return false;
      if (new Date(i.dueDate) >= today) return false;
    }
    return true;
  });
}

function labelFor(field, item, ctx) {
  if (field === 'assignee') {
    const id = item.assigneeId;
    if (!id) return 'Unassigned';
    const u = (ctx.users || []).find(x => x.id === id);
    return u ? (u.fullName || u.name || u.email || id) : id;
  }
  return item[field] || 'None';
}

export function groupBy(items, field, ctx = {}, limit = 8) {
  const counts = {};
  items.forEach(i => {
    const key = labelFor(field, i, ctx);
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export function computeWidget(widget, ctx = {}) {
  const spec = widgetSpec(widget.widgetType);
  let stored;
  try { stored = JSON.parse(widget.config || '{}'); } catch { stored = {}; }
  const cfg = { ...spec, ...stored };
  const items = ctx.workItems || [];

  switch (cfg.engine) {
    case 'count':
      return { kind: 'number', value: applyFilter(items, cfg.filter, ctx).length, tone: cfg.tone };

    case 'list': {
      let r = applyFilter(items, cfg.filter, ctx);
      if (cfg.sort === 'recent') {
        r = [...r].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      }
      return { kind: 'list', items: r.slice(0, cfg.limit || 6) };
    }

    case 'groupBy': {
      const series = groupBy(applyFilter(items, cfg.filter, ctx), cfg.field, ctx);
      const kind = cfg.chart === 'pie' ? 'pie' : cfg.chart === 'stacked' ? 'stacked' : 'bars';
      return { kind, series };
    }

    case 'trend': {
      const points = (ctx.velocity || []).map(s => ({
        label: s.name || s.sprintName || '',
        value: Number(s.donePoints ?? s.done_points ?? 0),
      }));
      return { kind: 'line', points };
    }

    case 'sprintProgress': {
      const sprint = (ctx.sprints || []).find(s => s.status === 'ACTIVE') || null;
      const total = Number(sprint?.totalPoints ?? sprint?.capacity ?? 0);
      const done = Number(sprint?.donePoints ?? sprint?.done_points ?? 0);
      return cfg.mode === 'burndown'
        ? { kind: 'progress', value: Math.max(total - done, 0), max: total, label: 'Remaining', sprint }
        : { kind: 'progress', value: done, max: total, label: 'Delivered', sprint };
    }

    case 'matrix': {
      const statuses = [...new Set(items.map(i => i.status || 'None'))].slice(0, 8);
      const rows = statuses.map(st => {
        const cells = MATRIX_PRIORITIES.map(p =>
          items.filter(i => (i.status || 'None') === st && String(i.priority || '').toUpperCase() === p).length);
        return { label: st, cells, total: cells.reduce((a, b) => a + b, 0) };
      });
      return { kind: 'matrix', cols: MATRIX_PRIORITIES, rows };
    }

    default:
      return { kind: 'number', value: 0 };
  }
}
