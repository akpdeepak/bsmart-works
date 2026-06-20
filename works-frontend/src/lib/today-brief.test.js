import { describe, it, expect } from 'vitest';
import { buildTodayBrief } from './today-brief';

const now = new Date('2026-06-20T09:00:00+05:30');

describe('buildTodayBrief', () => {
  it('caps developer attention at five and prioritizes blockers, overdue, then high priority', () => {
    const brief = buildTodayBrief('developer', {
      blockers: [
        { id: 'BLK-1', title: 'API contract blocked', blocking_title: 'Missing gateway decision' },
      ],
      myOpenItems: [
        { id: 'WRK-1', title: 'Fix overdue bug', due_date: '2026-06-18', priority: 'LOW' },
        { id: 'WRK-2', title: 'Finish login guard', priority: 'HIGH' },
        { id: 'WRK-3', title: 'Polish worklog UI', priority: 'HIGH' },
        { id: 'WRK-4', title: 'Refine filters', priority: 'HIGH' },
        { id: 'WRK-5', title: 'Add empty state', priority: 'HIGH' },
        { id: 'WRK-6', title: 'Tune copy', priority: 'HIGH' },
      ],
    }, { now });

    expect(brief.attention).toHaveLength(5);
    expect(brief.attention.map((item) => item.title)).toEqual([
      'API contract blocked',
      'Fix overdue bug',
      'Finish login guard',
      'Polish worklog UI',
      'Refine filters',
    ]);
    expect(brief.confidence).toMatch(/need attention/i);
  });

  it('returns a calm empty state when the developer has no attention signals', () => {
    const brief = buildTodayBrief('developer', {
      blockers: [],
      myOpenItems: [{ id: 'WRK-1', title: 'Low pressure item', priority: 'LOW' }],
    }, { now });

    expect(brief.attention).toEqual([]);
    expect(brief.quietWin).toMatch(/No urgent personal queue/i);
    expect(brief.primaryAction).toEqual({ label: 'Plan my day', view: 'myworks' });
  });

  it('summarizes product-owner release and grooming pressure', () => {
    const brief = buildTodayBrief('product-owner', {
      upcomingReleases: [
        { id: 'REL-1', name: 'Mobile 2.0', release_date: '2026-06-28' },
      ],
      ungroomedItems: [
        { id: 'WRK-8', title: 'Clarify onboarding story', priority: 'MEDIUM' },
      ],
    }, { now });

    expect(brief.roleLabel).toBe('Product Owner');
    expect(brief.attention[0]).toMatchObject({
      title: 'Mobile 2.0',
      reason: 'Release is due within 14 days.',
      view: 'releases',
    });
    expect(brief.attention[1]).toMatchObject({
      title: 'Clarify onboarding story',
      view: 'backlog',
    });
  });

  it('highlights admin security posture before audit follow-up', () => {
    const brief = buildTodayBrief('admin', {
      mfaStats: { total: 10, mfa_enabled: 6 },
      recentAuditLog: [{ id: 'AUD-1', target_name: 'Priya Rao' }],
      totalEventsWeek: 8,
    }, { now });

    expect(brief.attention[0]).toMatchObject({
      title: 'MFA adoption below target',
      tone: 'danger',
      view: 'workspace',
    });
    expect(brief.attention[1]).toMatchObject({
      title: 'Priya Rao',
      view: 'security',
    });
  });
});
