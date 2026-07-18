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
    expect(lines.length).toBeLessThan(3900);
    expect(source).toContain("from '@/app/AuthScreens'");
    expect(source).toContain("from '@/app/routes'");
    expect(source).toContain("from '@/hooks/useKnowledgeState'");
    expect(source).toContain("from '@/hooks/useComplianceState'");
    expect(source).toContain("from '@/hooks/usePmState'");
    expect(source).toContain("from '@/hooks/useServiceState'");
    expect(source).not.toContain('const [authMode, setAuthMode]');
    expect(readSource('app/providers/AppProviders.jsx')).toContain('QueryClientProvider');
    expect(readSource('app/shortcuts/useGlobalShortcuts.js')).toContain('document.addEventListener');
  });
});
