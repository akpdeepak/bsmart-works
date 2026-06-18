import { describe, expect, it } from 'vitest';
import { contentGapAnalysis, duplicateCandidates, healthScore, translateArticleText } from './knowledge-roadmap-tools';

describe('knowledge roadmap tools', () => {
  const article = {
    id: 'a1',
    title: 'Deploy runbook',
    status: 'DRAFT',
    content: 'Deploy runbook with owner and rollback procedure.',
  };

  it('finds similar duplicate candidates deterministically', () => {
    const dupes = duplicateCandidates(article, [
      article,
      { id: 'a2', title: 'Rollback runbook', content: 'Rollback deploy runbook owner notes.' },
      { id: 'a3', title: 'Holiday policy', content: 'Leave calendar approvals.' },
    ]);
    expect(dupes[0].article.id).toBe('a2');
    expect(dupes[0].score).toBeGreaterThan(0);
  });

  it('returns gap and health signals without provider calls', () => {
    expect(contentGapAnalysis(article, []).missing).toContain('decision context');
    const health = healthScore(article, [], [{ resolved: false }]);
    expect(health.score).toBeLessThan(100);
    expect(health.reasons).toContain('Open comments');
  });

  it('creates a translation draft wrapper for UAT', () => {
    expect(translateArticleText('Hello', 'Hindi')).toContain('[Hindi translation draft]');
  });
});

