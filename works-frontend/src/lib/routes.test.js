import { VIEW_PATHS, viewToPath, pathToView } from './routes';

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
    expect(viewToPath('workspace')).toBe('/settings');
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
