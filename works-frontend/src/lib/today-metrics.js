/**
 * Today-surface helpers — the pure aggregations (no JSX) behind the per-role
 * infographics on the Home → Today dashboard, unit-testable like
 * dashboard-metrics.js. Every time-sensitive helper takes `today` so tests can
 * pin the clock.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function dateOnly(value) {
  const d = new Date(value);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Bucket open items by due pressure: overdue / due today / due this week /
 * later-or-unscheduled. Accepts both snake_case (API rows) and camelCase keys.
 */
export function dueBuckets(items, today = new Date()) {
  const t0 = dateOnly(today);
  const weekEnd = new Date(t0.getTime() + 7 * DAY_MS);
  const buckets = { overdue: 0, dueToday: 0, dueWeek: 0, later: 0 };
  (items || []).forEach(i => {
    const raw = i.due_date || i.dueDate;
    if (!raw) { buckets.later += 1; return; }
    const due = dateOnly(raw);
    if (due < t0) buckets.overdue += 1;
    else if (due.getTime() === t0.getTime()) buckets.dueToday += 1;
    else if (due < weekEnd) buckets.dueWeek += 1;
    else buckets.later += 1;
  });
  return buckets;
}

/**
 * Zero-filled daily hours for the last `days` days (oldest → today) from the
 * API's per-day minute rows [{ work_date, minutes }]. Hours are rounded to one
 * decimal; days with no log render as 0 so the rhythm of the week stays honest.
 */
export function dailyHours(rows, days = 7, today = new Date()) {
  const t0 = dateOnly(today);
  const byDay = {};
  (rows || []).forEach(r => {
    const key = String(r.work_date ?? r.day ?? '').slice(0, 10);
    byDay[key] = (byDay[key] || 0) + Number(r.minutes ?? r.total_minutes ?? 0);
  });
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(t0.getTime() - i * DAY_MS);
    const key = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-');
    out.push({
      label: d.toLocaleDateString(undefined, { weekday: 'short' }),
      value: Math.round(((byDay[key] || 0) / 60) * 10) / 10,
    });
  }
  return out;
}

/**
 * Chronological committed-vs-delivered pairs for PairedBars from the SM
 * velocityTrend rows (the API returns newest-first).
 */
export function velocityPairs(velocity) {
  return [...(velocity || [])].reverse().map((s, i) => ({
    label: s.name || `Sprint ${i + 1}`,
    a: Number(s.total_points ?? 0),
    b: Number(s.done_points ?? 0),
  }));
}

/**
 * Sprint timebox vs scope: % of the sprint window elapsed vs % of items done,
 * plus days left and the drift between the two (positive = ahead of the clock).
 * Returns null when the sprint carries no dates.
 */
export function timeboxProgress(sprint, today = new Date()) {
  if (!sprint || !sprint.start_date || !sprint.end_date) return null;
  const start = dateOnly(sprint.start_date);
  const end = dateOnly(sprint.end_date);
  const t0 = dateOnly(today);
  const span = Math.max(1, Math.round((end - start) / DAY_MS));
  const elapsed = Math.min(span, Math.max(0, Math.round((t0 - start) / DAY_MS)));
  const timePct = Math.round((elapsed * 100) / span);
  const total = Number(sprint.total_items || 0);
  const done = Number(sprint.done_items || 0);
  const scopePct = total > 0 ? Math.round((done * 100) / total) : 0;
  return { timePct, scopePct, daysLeft: Math.max(0, span - elapsed), drift: scopePct - timePct };
}

/** Members whose last_active falls inside the trailing `days` window. */
export function activeMemberCount(members, days = 7, today = new Date()) {
  const cutoff = dateOnly(today).getTime() - days * DAY_MS;
  return (members || []).filter(
    m => m.last_active && new Date(m.last_active).getTime() >= cutoff,
  ).length;
}

/** Top-N [{label,value}] hours series from rows carrying logged_minutes. */
export function utilizationSeries(rows, top = 8) {
  return (rows || []).slice(0, top).map(r => ({
    label: r.full_name || r.id || '—',
    value: Math.round(((Number(r.logged_minutes) || 0) / 60) * 10) / 10,
  }));
}
