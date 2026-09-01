import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolve(here, '..');

function readSource(relativePath) {
  return readFileSync(resolve(srcRoot, relativePath), 'utf8');
}

describe('frontend app architecture', () => {
  it('keeps App.jsx as the thin stable entrypoint', () => {
    const source = readSource('App.jsx');
    const lines = source.trim().split(/\r?\n/);

    expect(lines.length).toBeLessThan(25);
    expect(source).toContain("import AppShell from '@/app/AppShell'");
    expect(source).toContain('<AppShell />');
    expect(source).not.toContain('eslint-disable');
    expect(source).not.toContain('useState(');
    expect(source).not.toContain('api.raw(');
  });

  it('keeps global concerns outside the reduced product shell', () => {
    const source = readSource('app/AppShell.jsx');
    const lines = source.trim().split(/\r?\n/);

    expect(source).toContain('export default function AppShell()');
    expect(source).toContain('pathToView');
    expect(source).toContain('ModeRail');
    // Ratchet, not a ceiling (Phase 2 §0.4): pinned at the current size so any growth fails and has
    // to be a conscious decision. Lower this number in the same PR that shrinks the file; the 3000
    // it replaced left 54 lines of slack, so it blocked nothing.
    expect(lines.length).toBeLessThanOrEqual(2450);
    expect(source).toContain("from '@/app/AuthScreens'");
    expect(source).toContain("from '@/app/routes/RouteOutlet'");
    expect(source).toContain("from '@/app/navigation/useShellNavigation'");
    expect(source).toContain("from '@/app/overlays/useShellOverlays'");
    expect(source).toContain("from '@/app/realtime/useRealtimePresence'");
    expect(source).toContain("from '@/app/workspaces/useWorkspaceContext'");
    expect(source).toContain("from '@/hooks/useKnowledgeState'");
    expect(source).toContain("from '@/hooks/useComplianceState'");
    expect(source).toContain("from '@/hooks/usePmState'");
    expect(source).toContain("from '@/hooks/useServiceState'");
    // W2 feature-state extraction (GH-537): the shell composes these, it does not own their state.
    expect(source).toContain("from '@/hooks/useDashboardsState'");
    expect(source).toContain("from '@/hooks/useReportsState'");
    expect(source).toContain("from '@/hooks/useCustomFieldsState'");
    expect(source).toContain("from '@/hooks/useScrumMasterCockpitState'");
    expect(source).toContain("from '@/hooks/useProductOwnerState'");
    // useState ratchet — the feature-state row is measured by how much state lives here,
    // not only by line count. Lower this in the same PR that extracts global context out.
    expect(source.match(/useState/g) || []).toHaveLength(129);
    expect(source).not.toMatch(/^\/\* eslint-disable/m);
    expect(source).not.toContain('connectRealtime(');
    expect(source).not.toContain("'WS-001'");
    expect(source).toContain('!workspaceReady || !activeWorkspaceId || didInitRoute.current');
    expect(source).not.toContain('const [authMode, setAuthMode]');
    expect(readSource('app/providers/AppProviders.jsx')).toContain('QueryClientProvider');
    expect(readSource('app/shortcuts/useGlobalShortcuts.js')).toContain('document.addEventListener');
  });

  it('keeps RouteOutlet lintable — no blanket eslint-disable', () => {
    // W2-c gap (GH-537). RouteOutlet carried a file-level `eslint-disable` over 927 lines, which
    // suppressed no-undef everywhere in it. Behind it, `userPrefs` was handed to <AccountView> but
    // never destructured from `model` — so opening the account route threw a ReferenceError. The
    // blanket disable is what let a crashing route ship, so it must not come back.
    const source = readSource('app/routes/RouteOutlet.jsx');

    expect(source).not.toMatch(/^\/\* eslint-disable \*\/$/m);
    expect(source).toContain('userPrefs');
    expect(source).toContain('saveUserPrefs');
  });

  it('has no dead lazy-views module', () => {
    // app/lazy-views.js was 38 lines with zero references (W2-c gap, GH-537). RouteOutlet does its
    // own lazy importing, so the module was superseded and deleted.
    expect(() => readSource('app/lazy-views.js')).toThrow();
  });
});
