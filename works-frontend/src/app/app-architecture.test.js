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
    expect(lines.length).toBeLessThanOrEqual(2360);
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
    // useState ratchet — the feature-state row is measured by how much state the shell still owns,
    // not only by line count. Lower this in the same PR that extracts another cluster.
    expect(source.match(/useState/g) || []).toHaveLength(129);
    expect(source).not.toMatch(/^\/\* eslint-disable/m);
    expect(source).not.toContain('connectRealtime(');
    expect(source).not.toContain("'WS-001'");
    expect(source).toContain('!workspaceReady || !activeWorkspaceId || didInitRoute.current');
    expect(source).not.toContain('const [authMode, setAuthMode]');
    expect(readSource('app/providers/AppProviders.jsx')).toContain('QueryClientProvider');
    expect(readSource('app/shortcuts/useGlobalShortcuts.js')).toContain('document.addEventListener');
  });
});
