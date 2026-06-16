/**
 * Built-in per-role Today layouts + the mapping between a layout (what TodayCanvas renders) and the
 * DashboardWidget DTOs the /today-layouts API persists. A layout is an ordered list of widget
 * instances { id, type, span, spanSm, config }; saving a personal/workspace layout replaces the
 * built-in default (slice 4+). Renderers for each `type` live in dashboard-view's role registries.
 *
 * spanSm has no DB column, so it rides inside the persisted widget config as `_spanSm`.
 */

// Base layouts (the conditional widgets — PO ungroomed, Exec overdue — are appended by
// builtinTodayLayout when the role's data has them). Spans are on a 12-col grid; every row sums to 12.
export const BUILTIN_TODAY_LAYOUTS = {
  developer: [
    { id: 'd-stat-open', type: 'stat', span: 3, spanSm: 6, config: { k: 'open' } },
    { id: 'd-stat-sprint', type: 'stat', span: 3, spanSm: 6, config: { k: 'sprint' } },
    { id: 'd-stat-hours', type: 'stat', span: 3, spanSm: 6, config: { k: 'hours' } },
    { id: 'd-stat-blockers', type: 'stat', span: 3, spanSm: 6, config: { k: 'blockers' } },
    { id: 'd-due-radar', type: 'due-radar', span: 4 },
    { id: 'd-queue-mix', type: 'queue-mix', span: 4 },
    { id: 'd-my-week', type: 'my-week', span: 4 },
    { id: 'd-focus-queue', type: 'focus-queue', span: 8 },
    { id: 'd-sprint-ring', type: 'sprint-ring', span: 4 },
    { id: 'd-blockers', type: 'blockers', span: 6 },
    { id: 'd-timelogs', type: 'time-logs', span: 6 },
  ],
  'scrum-master': [
    { id: 'sm-stat-health', type: 'stat', span: 3, spanSm: 6, config: { k: 'health' } },
    { id: 'sm-stat-risk', type: 'stat', span: 3, spanSm: 6, config: { k: 'risk' } },
    { id: 'sm-stat-scope', type: 'stat', span: 3, spanSm: 6, config: { k: 'scope' } },
    { id: 'sm-stat-velocity', type: 'stat', span: 3, spanSm: 6, config: { k: 'velocity' } },
    { id: 'sm-at-a-glance', type: 'at-a-glance', span: 12 },
    { id: 'sm-high-risk', type: 'high-risk', span: 8 },
    { id: 'sm-sprint-health', type: 'sprint-health', span: 4 },
    { id: 'sm-velocity', type: 'velocity', span: 6 },
    { id: 'sm-capacity', type: 'capacity', span: 6 },
  ],
  'product-owner': [
    { id: 'po-stat-ungroomed', type: 'stat', span: 3, spanSm: 6, config: { k: 'ungroomed' } },
    { id: 'po-stat-releases', type: 'stat', span: 3, spanSm: 6, config: { k: 'releases' } },
    { id: 'po-stat-features', type: 'stat', span: 3, spanSm: 6, config: { k: 'features' } },
    { id: 'po-stat-backlog', type: 'stat', span: 3, spanSm: 6, config: { k: 'backlog' } },
    { id: 'po-at-a-glance', type: 'at-a-glance', span: 12 },
    { id: 'po-upcoming', type: 'upcoming-releases', span: 8 },
    { id: 'po-backlog-health', type: 'backlog-health', span: 4 },
    { id: 'po-composition', type: 'backlog-composition', span: 6 },
    { id: 'po-feature-completion', type: 'feature-completion', span: 6 },
    { id: 'po-activation-funnel', type: 'activation-funnel', span: 6 },
    { id: 'po-engagement', type: 'engagement-score', span: 6 },
  ],
  executive: [
    { id: 'ex-stat-health', type: 'stat', span: 3, spanSm: 6, config: { k: 'health' } },
    { id: 'ex-stat-overdue', type: 'stat', span: 3, spanSm: 6, config: { k: 'overdue' } },
    { id: 'ex-stat-risks', type: 'stat', span: 3, spanSm: 6, config: { k: 'risks' } },
    { id: 'ex-stat-util', type: 'stat', span: 3, spanSm: 6, config: { k: 'util' } },
    { id: 'ex-at-a-glance', type: 'at-a-glance', span: 12 },
    { id: 'ex-portfolio', type: 'project-portfolio', span: 12 },
    { id: 'ex-raid', type: 'raid-pulse', span: 4 },
    { id: 'ex-release', type: 'release-schedule', span: 4 },
    { id: 'ex-util', type: 'team-utilization', span: 4 },
    { id: 'ex-heart', type: 'heart-dashboard', span: 12 },
  ],
  admin: [
    { id: 'ad-stat-members', type: 'stat', span: 3, spanSm: 6, config: { k: 'members' } },
    { id: 'ad-stat-mfa', type: 'stat', span: 3, spanSm: 6, config: { k: 'mfa' } },
    { id: 'ad-stat-events', type: 'stat', span: 3, spanSm: 6, config: { k: 'events' } },
    { id: 'ad-stat-audit', type: 'stat', span: 3, spanSm: 6, config: { k: 'audit' } },
    { id: 'ad-activity', type: 'activity', span: 8 },
    { id: 'ad-security-roles', type: 'security-roles', span: 4 },
    { id: 'ad-audit-log', type: 'audit-log', span: 12 },
  ],
};

// The built-in default for a role, with data-conditional widgets appended (matching the original
// in-component behaviour): PO's ungroomed table and Exec's overdue-actions table only when present.
export function builtinTodayLayout(role, data) {
  const base = BUILTIN_TODAY_LAYOUTS[role] || BUILTIN_TODAY_LAYOUTS.developer;
  if (role === 'product-owner' && (data?.ungroomedItems?.length > 0)) {
    return [...base, { id: 'po-ungroomed', type: 'ungroomed', span: 12 }];
  }
  if (role === 'executive' && (data?.overdueActions?.length > 0)) {
    return [...base, { id: 'ex-overdue', type: 'overdue-actions', span: 12 }];
  }
  return base;
}

// Spans the resize control cycles through (and the only ones TodayCanvas maps to real classes).
export const ALLOWED_SPANS = [3, 4, 6, 8, 12];

// Next span in the cycle (used by the resize control), wrapping back to the smallest.
export function nextSpan(span) {
  const idx = ALLOWED_SPANS.indexOf(span);
  return ALLOWED_SPANS[(idx + 1) % ALLOWED_SPANS.length];
}

// Layout → persisted DashboardWidget DTOs (replace semantics; position = array order).
export function layoutToWidgets(layout) {
  return (layout || []).map((w, i) => ({
    widgetType: w.type,
    title: w.title ?? null,
    config: JSON.stringify({ ...(w.config || {}), _spanSm: w.spanSm ?? null }),
    gridW: w.span || 12,
    gridH: 2,
    position: i,
  }));
}

// Persisted DashboardWidget rows → layout (sorted by position; spanSm lifted back out of config).
export function widgetsToLayout(widgets) {
  return [...(widgets || [])]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((w, i) => {
      let parsed;
      try { parsed = JSON.parse(w.config || '{}'); } catch { parsed = {}; }
      const { _spanSm, ...config } = parsed;
      return {
        id: w.id != null ? `w${w.id}` : `w${i}`,
        type: w.widgetType,
        span: w.gridW || 12,
        spanSm: _spanSm ?? undefined,
        config,
      };
    });
}
