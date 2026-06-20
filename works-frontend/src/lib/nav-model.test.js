import { describe, it, expect } from 'vitest';
import {
  TIER, MODES, LENSES, SETUP_DESTINATIONS,
  tierForSurface, canSeeSurface, allowed, navDestinations, visibleModes, visibleSurfaces,
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

  it('keeps the rail to the six approved product modes', () => {
    expect(MODES.map((m) => m.label)).toEqual(['Home', 'Deliver', 'Insight', 'Service', 'Know', 'Extend']);
    expect(MODES.map((m) => m.id)).toEqual(['today', 'deliver', 'insight', 'service', 'know', 'extend']);
  });

  it('does not expose setup as a rail mode for a plain Member', () => {
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

  it('firstSurfaceOf returns the first visible surface within a rail mode', () => {
    expect(firstSurfaceOf('extend', TIER.ADMIN)).toBe('automations');
    expect(firstSurfaceOf('deliver', TIER.VIEWER)).toBe('board');
  });

  it('higher tiers are a superset of lower tiers', () => {
    const member = new Set(visibleModes(TIER.MEMBER).map((m) => m.id));
    const admin = new Set(visibleModes(TIER.ADMIN).map((m) => m.id));
    for (const id of member) expect(admin.has(id)).toBe(true);
  });
});

describe('nav-model — visibility resolver + palette', () => {
  it('a server surface list overrides the tier fallback', () => {
    // Even a low tier sees exactly the server-provided surfaces (server is authoritative).
    const vis = { tier: TIER.VIEWER, surfaces: ['adminops', 'security', 'board'] };
    expect(allowed('adminops', vis)).toBe(true);
    expect(allowed('security', vis)).toBe(true);
    expect(allowed('myworks', vis)).toBe(false); // not in the server list
  });

  it('falls back to the tier when no surface list is present', () => {
    expect(allowed('security', { tier: TIER.ADMIN })).toBe(false);
    expect(allowed('security', TIER.OWNER)).toBe(true);
    expect(allowed('board', TIER.VIEWER)).toBe(true);
  });

  it('visibleModes honours an explicit server surface list', () => {
    const vis = { surfaces: ['dashboard'] }; // only Home/Today
    const ids = visibleModes(vis).map((m) => m.id);
    expect(ids).toEqual(['today']);
  });

  it('navDestinations covers every mode surface + satellites, each with an icon', () => {
    const dests = navDestinations();
    const ids = dests.map((d) => d.id);
    for (const m of MODES) for (const s of m.surfaces) expect(ids).toContain(s.id);
    for (const s of SETUP_DESTINATIONS) expect(ids).toContain(s.id);
    expect(ids).toContain('adminops'); // a satellite
    expect(ids).toContain('bql');
    expect(dests.every((d) => typeof d.Icon === 'function' || typeof d.Icon === 'object')).toBe(true);
  });

  it('groups setup destinations under More instead of the rail', () => {
    const setupIds = SETUP_DESTINATIONS.map((s) => s.id);
    const dests = navDestinations().filter((d) => setupIds.includes(d.id));

    expect(dests).toHaveLength(SETUP_DESTINATIONS.length);
    expect(dests.every((d) => d.group === 'More' && d.groupKey === 'nav.more')).toBe(true);
  });
});

describe('nav-model — orientation + role mapping', () => {
  it('resolves the owning mode for satellite views', () => {
    expect(modeForView('leadership')).toBe('insight');
    expect(modeForView('developer')).toBe('today');
    expect(modeForView('bql')).toBe('insight');
    expect(modeForView('settings3')).toBe('extend');
    expect(modeForView('adminops')).toBe('extend');
  });

  it('labels satellite views for the orientation row', () => {
    expect(labelForView('bql')).toBe('BQL Query');
    expect(labelForView('leadership')).toBe('Leadership');
    expect(labelForView('settings3')).toBe('Workflows & Fields');
    expect(labelForView('board')).toBe('Board');
  });

  it('every lens maps to a real cockpit view, primary set, and a preview tier', () => {
    for (const l of LENSES) {
      expect(typeof l.view).toBe('string');
      expect(l.previewTier).toBeGreaterThanOrEqual(TIER.MEMBER);
      expect(l.previewTier).toBeLessThanOrEqual(TIER.OWNER);
      expect(primarySurfacesFor(l.id).length).toBeGreaterThan(0);
      expect(isPrimaryForRole(l.id, l.view)).toBe(true);
    }
  });
});
