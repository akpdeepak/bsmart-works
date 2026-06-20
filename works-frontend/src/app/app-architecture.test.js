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

  it('keeps the legacy shell behind the app boundary while it is decomposed', () => {
    const source = readSource('app/AppShell.jsx');

    expect(source).toContain('export default function AppShell()');
    expect(source).toContain('pathToView');
    expect(source).toContain('ModeRail');
  });
});
