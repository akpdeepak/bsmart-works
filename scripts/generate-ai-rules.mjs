#!/usr/bin/env node
/**
 * bSmart Works — AI rules generator.
 *
 * CLAUDE.md is the SINGLE SOURCE OF TRUTH. This script derives every other
 * AI-tool rules file from it, so they can never drift:
 *
 *   CLAUDE.md  ──►  .github/copilot-instructions.md   (GitHub Copilot)
 *              ──►  .cursor/rules/bsmart.mdc          (Cursor)
 *              ──►  .windsurfrules                      (Windsurf / Codeium)
 *              ──►  AGENTS.md                           (emerging cross-tool standard)
 *
 * Usage:
 *   node scripts/generate-ai-rules.mjs          # regenerate all derived files
 *   node scripts/generate-ai-rules.mjs --check  # CI mode: fail if any file is stale
 *
 * Never hand-edit the derived files — edit CLAUDE.md and re-run this.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const SOURCE = 'CLAUDE.md';
const body = readFileSync(resolve(root, SOURCE), 'utf8');

const banner = (tool) =>
  `<!-- GENERATED FROM ${SOURCE} — do not edit by hand.\n` +
  `     Edit ${SOURCE} and run: node scripts/generate-ai-rules.mjs\n` +
  `     This file is the ${tool} view of the same rules. -->\n\n`;

const targets = [
  {
    path: '.github/copilot-instructions.md',
    render: () => banner('GitHub Copilot') + body,
  },
  {
    path: '.windsurfrules',
    render: () => banner('Windsurf / Codeium') + body,
  },
  {
    path: 'AGENTS.md',
    render: () => banner('cross-tool AGENTS.md') + body,
  },
  {
    path: '.cursor/rules/bsmart.mdc',
    render: () =>
      `---\n` +
      `description: bSmart Works development rules — generated from ${SOURCE}\n` +
      `globs: ["**/*.java", "**/*.jsx", "**/*.js", "**/*.css", "**/*.sql"]\n` +
      `alwaysApply: true\n` +
      `---\n\n` +
      banner('Cursor') +
      body,
  },
];

let stale = 0;
for (const t of targets) {
  const full = resolve(root, t.path);
  const next = t.render();
  let current = '';
  try { current = readFileSync(full, 'utf8'); } catch { /* missing */ }
  if (current === next) {
    console.log(`  up-to-date  ${t.path}`);
    continue;
  }
  if (check) {
    console.error(`  STALE       ${t.path}  (run: node scripts/generate-ai-rules.mjs)`);
    stale++;
  } else {
    writeFileSync(full, next);
    console.log(`  written     ${t.path}`);
  }
}

if (check && stale > 0) {
  console.error(`\n${stale} AI-rules file(s) out of sync with ${SOURCE}.`);
  process.exit(1);
}
console.log(check ? '\nAll AI-rules files are in sync.' : '\nDone. All AI-rules files regenerated from ' + SOURCE + '.');
