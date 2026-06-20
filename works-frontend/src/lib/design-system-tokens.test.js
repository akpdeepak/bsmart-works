import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolve(here, '..');
const frontendRoot = resolve(srcRoot, '..');

function read(relativePath) {
  return readFileSync(resolve(frontendRoot, relativePath), 'utf8');
}

describe('design system layout tokens', () => {
  it('defines adaptive workspace and reading width utilities', () => {
    const css = read('src/index.css');
    const tailwindConfig = read('tailwind.config.js');

    expect(css).toContain('--width-workspace:');
    expect(css).toContain('@utility max-w-workspace');
    expect(css).toContain('@utility max-w-reading');
    expect(tailwindConfig).toContain('workspace:');
    expect(tailwindConfig).toContain('clamp(80rem, 94vw, 104rem)');
  });

  it('keeps PageLayout on sanctioned width tokens only', () => {
    const pageLayout = read('src/components/works/templates/page-layout.jsx');
    const eslintConfig = read('eslint.config.js');

    expect(pageLayout).toContain("dashboard: 'max-w-workspace'");
    expect(pageLayout).toContain("reading: 'max-w-reading'");
    expect(pageLayout).not.toContain('max-w-7xl');
    expect(eslintConfig).toContain("'max-w-workspace', 'max-w-reading'");
    expect(eslintConfig).not.toContain("'max-w-7xl', 'max-w-reading'");
  });
});
