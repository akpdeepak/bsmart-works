import { describe, it, expect } from 'vitest';
import {
  TIER, MODES, LENSES,
  tierForSurface, canSeeSurface, visibleModes, visibleSurfaces,
  firstSurfaceOf, modeForView, labelForView, isPrimaryForRole, primarySurfacesFor,
} from './nav-model';

describe('nav-model — tier-based visibility', () => {
  it('Owner (5) sees every surface in every mode', () => {
    for (const m of MODES) {
      const visible = visibleSurfaces(m.id, TIER.OWNER);
      expect(visible).toHaveLength(m.surfaces.length);
    }
    expect(visibleModes(TIER.OWNER)).toHaveLength(MODES.length);
  });

  it('hides Owner-only surfaces (Security) from Admin', () => {
    expect(tierForSurface('security')).toBe(TIER.OWNER);
    expect(canSeeSurface('security', TIER.ADMIN)).toBe(false);
    expect(canSeeSurface('security', TIER.OWNER)).toBe(true);
  });

  it('hides admin/governance modes from a plain Member', () => {
    const modeIds = visibleModes(TIER.MEMBER).map((m) => m.id);
    expect(modeIds).toContain('today');
    expect(modeIds).toContain('deliver');
    // Set up has only admin/owner surfaces (+ Trash at LEAD) — invisible to a Member.
    expect(modeIds).not.toContain('setup');
  });

  it('a Viewer sees read surfaces but not member/admin ones', () => {
    expect(canSeeSurface('dashboard', TIER.VIEWER)).toBe(true);
    expect(canSeeSurface('board', TIER.VIEWER)).toBe(true);
    expect(canSeeSurface('myworks', TIER.VIEWER)).toBe(false); // MEMBER+
    expect(canSeeSurface('workspace', TIER.VIEWER)).toBe(false); // ADMIN+
  });

  it('firstSurfaceOf returns the first surface the tier may actually see', () => {
    // Set up's first surface is Settings (ADMIN); a LEAD only sees Trash within it.
    expect(firstSurfaceOf('setup', TIER.ADMIN)).toBe('workspace');
    expect(firstSurfaceOf('setup', TIER.LEAD)).toBe('trash');
  });

  it('higher tiers are a superset of lower tiers', () => {
    const member = new Set(visibleModes(TIER.MEMBER).map((m) => m.id));
    const admin = new Set(visibleModes(TIER.ADMIN).map((m) => m.id));
    for (const id of member) expect(admin.has(id)).toBe(true);
  });
});

describe('nav-model — orientation + role mapping', () => {
  it('resolves the owning mode for satellite views', () => {
    expect(modeForView('leadership')).toBe('insight');
    expect(modeForView('developer')).toBe('today');
    expect(modeForView('bql')).toBe('insight');
  });

  it('labels satellite views for the orientation row', () => {
    expect(labelForView('bql')).toBe('BQL Query');
    expect(labelForView('leadership')).toBe('Leadership');
    expect(labelForView('board')).toBe('Board');
  });

  it('every lens maps to a real cockpit view and primary surface set', () => {
    for (const l of LENSES) {
      expect(typeof l.view).toBe('string');
      expect(primarySurfacesFor(l.id).length).toBeGreaterThan(0);
      expect(isPrimaryForRole(l.id, l.view)).toBe(true);
    }
  });
});
