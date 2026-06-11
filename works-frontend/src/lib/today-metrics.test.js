import { describe, it, expect } from 'vitest';
import {
  dueBuckets, dailyHours, velocityPairs, timeboxProgress,
  activeMemberCount, utilizationSeries,
} from './today-metrics';

const TODAY = new Date(2026, 5, 11); // 2026-06-11, local time

describe('dueBuckets', () => {
  it('buckets by due pressure and counts undated as later', () => {
    const items = [
      { due_date: '2026-06-01' },                 // overdue
      { due_date: '2026-06-11' },                 // due today
      { due_date: '2026-06-14' },                 // this week
      { due_date: '2026-06-17' },                 // this week (< today+7)
      { due_date: '2026-06-18' },                 // later (= today+7)
      { dueDate: '2026-07-01' },                  // later, camelCase key
      {},                                         // no date → later
    ];
    expect(dueBuckets(items, TODAY)).toEqual({ overdue: 1, dueToday: 1, dueWeek: 2, later: 3 });
  });

  it('handles empty input', () => {
    expect(dueBuckets([], TODAY)).toEqual({ overdue: 0, dueToday: 0, dueWeek: 0, later: 0 });
    expect(dueBuckets(null, TODAY)).toEqual({ overdue: 0, dueToday: 0, dueWeek: 0, later: 0 });
  });
});

describe('dailyHours', () => {
  it('zero-fills the window oldest→today and converts minutes to hours', () => {
    const rows = [
      { work_date: '2026-06-11', minutes: 90 },   // today → 1.5h
      { work_date: '2026-06-09', minutes: 30 },   // 0.5h
      { work_date: '2026-06-01', minutes: 480 },  // outside the 7-day window
    ];
    const out = dailyHours(rows, 7, TODAY);
    expect(out).toHaveLength(7);
    expect(out.map(d => d.value)).toEqual([0, 0, 0, 0, 0.5, 0, 1.5]);
    out.forEach(d => expect(typeof d.label).toBe('string'));
  });

  it('sums multiple rows on the same day and tolerates timestamps', () => {
    const rows = [
      { work_date: '2026-06-10T09:00:00', minutes: 60 },
      { work_date: '2026-06-10', minutes: 30 },
    ];
    const out = dailyHours(rows, 7, TODAY);
    expect(out[5].value).toBe(1.5);
  });
});

describe('velocityPairs', () => {
  it('reverses newest-first rows into chronological {label,a,b} pairs', () => {
    const velocity = [
      { name: 'Sprint 3', total_points: 30, done_points: 12 },
      { name: 'Sprint 2', total_points: 25, done_points: 25 },
    ];
    expect(velocityPairs(velocity)).toEqual([
      { label: 'Sprint 2', a: 25, b: 25 },
      { label: 'Sprint 3', a: 30, b: 12 },
    ]);
  });

  it('falls back to an index label', () => {
    expect(velocityPairs([{ total_points: 5, done_points: 1 }])[0].label).toBe('Sprint 1');
  });
});

describe('timeboxProgress', () => {
  const sprint = {
    start_date: '2026-06-01', end_date: '2026-06-15',
    total_items: 10, done_items: 5,
  };

  it('computes elapsed-vs-scope mid-sprint', () => {
    const tb = timeboxProgress(sprint, TODAY);
    expect(tb).toEqual({ timePct: 71, scopePct: 50, daysLeft: 4, drift: -21 });
  });

  it('clamps elapsed time to the sprint window', () => {
    expect(timeboxProgress(sprint, new Date(2026, 6, 1)).timePct).toBe(100);
    expect(timeboxProgress(sprint, new Date(2026, 4, 1)).timePct).toBe(0);
  });

  it('returns null without dates', () => {
    expect(timeboxProgress({ total_items: 5 }, TODAY)).toBeNull();
    expect(timeboxProgress(null, TODAY)).toBeNull();
  });
});

describe('activeMemberCount', () => {
  it('counts members active inside the window only', () => {
    const members = [
      { last_active: '2026-06-10T12:00:00' },
      { last_active: '2026-06-04T00:00:00' },  // exactly on the 7-day cutoff
      { last_active: '2026-05-01T12:00:00' },  // stale
      { last_active: null },
    ];
    expect(activeMemberCount(members, 7, TODAY)).toBe(2);
  });
});

describe('utilizationSeries', () => {
  it('maps minutes to one-decimal hours and respects the top-N cap', () => {
    const rows = [
      { full_name: 'Asha', logged_minutes: 95 },
      { full_name: 'Ravi', logged_minutes: 0 },
      { id: 'USR-3', logged_minutes: 30 },
    ];
    expect(utilizationSeries(rows, 2)).toEqual([
      { label: 'Asha', value: 1.6 },
      { label: 'Ravi', value: 0 },
    ]);
  });
});
