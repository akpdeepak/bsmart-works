import { beforeEach, describe, expect, it } from 'vitest';
import { clearViewState, mergeViewState, readViewState, writeViewState } from './view-state';

describe('view-state persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns fallback when no state has been stored', () => {
    expect(readViewState('search', { facet: 'all' })).toEqual({ facet: 'all' });
  });

  it('writes and reads state for a surface', () => {
    writeViewState('search', { facet: 'articles', query: 'runbook' });
    expect(readViewState('search')).toEqual({ facet: 'articles', query: 'runbook' });
  });

  it('merges patches into existing state', () => {
    writeViewState('board', { groupBy: 'assignee', density: 'compact' });
    expect(mergeViewState('board', { groupBy: 'priority' })).toEqual({ groupBy: 'priority', density: 'compact' });
  });

  it('clears a surface state', () => {
    writeViewState('search', { facet: 'articles' });
    clearViewState('search');
    expect(readViewState('search', { facet: 'all' })).toEqual({ facet: 'all' });
  });
});
