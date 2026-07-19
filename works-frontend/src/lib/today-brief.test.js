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

  it('brings approval waits and DevSync changes into the developer queue', () => {
    const brief = buildTodayBrief('developer', {
      pendingReviews: [{ id: 'PR-1', title: 'Harden login', repo: 'bsmart/works' }],
      devSyncHighlights: [
        { id: 'PR-1', title: 'Harden login', status: 'OPEN' },
        { id: 'PR-2', title: 'Improve query plan', status: 'MERGED' },
      ],
    }, { now });

    expect(brief.attention).toHaveLength(2);
    expect(brief.attention[0]).toMatchObject({
      title: 'Harden login',
      reason: 'Approval is waiting in bsmart/works.',
      view: 'developer',
    });
    expect(brief.attention[1]).toMatchObject({
      title: 'Improve query plan',
      view: 'developer',
    });
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

  it('puts product-owner approvals ahead of release planning signals', () => {
    const brief = buildTodayBrief('product-owner', {
      approvals: [{ id: 'ART-1', title: 'Incident runbook' }],
      upcomingReleases: [{ id: 'REL-1', name: 'Mobile 2.0', release_date: '2026-06-28' }],
    }, { now });

    expect(brief.attention[0]).toMatchObject({
      title: 'Incident runbook',
      reason: 'Approval is waiting for your review.',
      view: 'knowledge',
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

  it('prioritizes unassigned support escalations for the support-agent role', () => {
    const brief = buildTodayBrief('support-agent', {
      conversations: [
        { id: 'CHAT-1', subject: 'Billing outage', status: 'ESCALATED', assigned_agent_id: null },
        { id: 'CHAT-2', subject: 'Password question', status: 'OPEN', assigned_agent_id: 'USR-2' },
      ],
    }, { now });

    expect(brief.roleLabel).toBe('Support Agent');
    expect(brief.attention[0]).toMatchObject({
      title: 'Billing outage',
      tone: 'danger',
      view: 'supportinbox',
    });
    expect(brief.primaryAction).toEqual({ label: 'Open support inbox', view: 'supportinbox' });
  });

  it('puts breached SLA and recent customer messages into support attention', () => {
    const brief = buildTodayBrief('support-agent', {
      slaRisks: [{ id: 'SLA-1', title: 'Restore billing', state: 'BREACHED', metric: 'RESOLUTION' }],
      importantMessages: [{ id: 'MSG-1', subject: 'Payment still failing' }],
    }, { now });

    expect(brief.attention[0]).toMatchObject({
      title: 'Restore billing',
      reason: 'RESOLUTION SLA is breached.',
      tone: 'danger',
      view: 'sla',
    });
    expect(brief.attention[1]).toMatchObject({
      title: 'Payment still failing',
      view: 'supportinbox',
    });
  });
});
