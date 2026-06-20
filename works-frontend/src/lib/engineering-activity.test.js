import { describe, expect, it } from 'vitest';
import { buildEngineeringActivity, formatEngineeringEventType } from './engineering-activity';

describe('engineering activity', () => {
  it('groups raw events without ranking developers', () => {
    const activity = buildEngineeringActivity({
      todaysWork: [{ id: 'WRK-1', title: 'Auth refactor', status: 'In Progress' }],
      reviewQueue: [{ id: 'PR-1', number: 101, title: 'JWT filter', repo: 'bcits/works', status: 'OPEN' }],
      blockers: [],
      recentActivity: [
        { aggregateId: 'WRK-1', eventType: 'CI_FAILED', message: 'WRK-1 CI failed on backend tests' },
        { aggregateId: 'repo-main', eventType: 'COMMIT_PUSHED', message: 'tidy imports' },
      ],
    });

    expect(activity.summary).toBe('Engineering flow needs attention: 1 CI signal need attention.');
    expect(activity.citations).toEqual([
      'Developer Workspace home',
      '1 review request',
      '2 raw activity events',
      '1 active work item',
    ]);
    expect(activity.linkedWork[0]).toMatchObject({ id: 'WRK-1', evidenceCount: 1 });
    expect(activity.unlinkedEvents).toHaveLength(1);
    expect(JSON.stringify(activity).toLowerCase()).not.toContain('leaderboard');
    expect(JSON.stringify(activity).toLowerCase()).not.toContain('lines of code');
  });

  it('summarizes release readiness from review, merge, CI, and deployment events', () => {
    const activity = buildEngineeringActivity({
      reviewQueue: [{ id: 'PR-2', number: 102, title: 'Payment API', repo: 'bcits/works' }],
      recentActivity: [
        { aggregateId: 'WRK-2', eventType: 'PR_MERGED', message: 'WRK-2 merged' },
        { aggregateId: 'WRK-2', eventType: 'DEPLOYED', message: 'WRK-2 deployed to staging' },
      ],
    });

    expect(activity.releaseReadiness).toEqual({
      failedCi: 0,
      merged: 1,
      deployed: 1,
      pendingReview: 1,
      status: 'Review pending',
    });
  });

  it('formats provider event names for display', () => {
    expect(formatEngineeringEventType('PR_OPENED')).toBe('PR opened');
    expect(formatEngineeringEventType('SECURITY_ALERT')).toBe('Security alert');
  });
});
