import {
  VIEW_PATHS,
  viewToPath,
  pathToView,
  parseEntityRoute,
  routeQueryState,
  mergeRouteQueryState,
} from './routes';
import { navDestinations } from './nav-model';

describe('routes', () => {
  it('round-trips every view through its path', () => {
    for (const view of Object.keys(VIEW_PATHS)) {
      expect(pathToView(viewToPath(view))).toBe(view);
    }
  });

  it('maps known views to canonical paths', () => {
    expect(viewToPath('dashboard')).toBe('/');
    expect(viewToPath('board')).toBe('/board');
    expect(viewToPath('reportbuilder')).toBe('/report-builder');
    expect(viewToPath('settings3')).toBe('/settings/workflows');
    expect(viewToPath('aicontrol')).toBe('/settings/ai-control');
    expect(viewToPath('workspace')).toBe('/settings');
  });

  it('gives every command-palette destination a stable deep link', () => {
    for (const destination of navDestinations()) {
      expect(VIEW_PATHS[destination.id], destination.id).toBeTruthy();
    }
  });

  it('returns null for an unknown view so the URL is left untouched', () => {
    expect(viewToPath('some-transient-subview')).toBeNull();
    expect(viewToPath(undefined)).toBeNull();
  });

  it('resolves paths to views, tolerating trailing slash and case', () => {
    expect(pathToView('/')).toBe('dashboard');
    expect(pathToView('/board')).toBe('board');
    expect(pathToView('/board/')).toBe('board');
    expect(pathToView('/BOARD')).toBe('board');
    expect(pathToView('/settings')).toBe('workspace');
    expect(pathToView('/settings/workflows')).toBe('settings3');
  });

  it('returns null for unknown or empty paths', () => {
    expect(pathToView('/nope')).toBeNull();
    expect(pathToView('')).toBeNull();
    expect(pathToView(undefined)).toBeNull();
  });

  it('does not collapse the two settings paths onto each other', () => {
    expect(pathToView('/settings')).not.toBe(pathToView('/settings/workflows'));
  });
});

describe('parseEntityRoute', () => {
  it('parses /items/:id and returns the correct entity object', () => {
    expect(parseEntityRoute('/items/WI-123')).toEqual({ kind: 'work-item', id: 'WI-123' });
    expect(parseEntityRoute('/items/42')).toEqual({ kind: 'work-item', id: '42' });
  });

  it('is case-insensitive and tolerates a trailing slash', () => {
    expect(parseEntityRoute('/Items/WI-1')).toEqual({ kind: 'work-item', id: 'WI-1' });
    expect(parseEntityRoute('/items/WI-1/')).toEqual({ kind: 'work-item', id: 'WI-1' });
  });

  it('returns null for top-level view paths', () => {
    expect(parseEntityRoute('/board')).toBeNull();
    expect(parseEntityRoute('/sla')).toBeNull();
    expect(parseEntityRoute('/')).toBeNull();
  });

  it('returns null for empty or undefined input', () => {
    expect(parseEntityRoute('')).toBeNull();
    expect(parseEntityRoute(undefined)).toBeNull();
    expect(parseEntityRoute(null)).toBeNull();
  });

  it('does not match paths with extra segments', () => {
    // /items/WI-1/sub would be a sub-path — not a single entity link
    expect(parseEntityRoute('/items/WI-1/comments')).toBeNull();
  });
});

describe('route query state', () => {
  it('reads query params into a plain object', () => {
    expect(routeQueryState('?groupBy=assignee&tab=activity')).toEqual({
      groupBy: 'assignee',
      tab: 'activity',
    });
  });

  it('merges query params without losing existing state', () => {
    expect(mergeRouteQueryState('/board', '?tab=activity', { groupBy: 'assignee' })).toBe('/board?tab=activity&groupBy=assignee');
  });

  it('removes default and empty state from the URL', () => {
    expect(mergeRouteQueryState('/board', '?groupBy=assignee&tab=activity', { groupBy: 'none' }, { groupBy: 'none' })).toBe('/board?tab=activity');
    expect(mergeRouteQueryState('/board', '?q=login', { q: '' })).toBe('/board');
  });
});
