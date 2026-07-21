#!/usr/bin/env node
/**
 * Frontend initial-payload budget gate (Phase 2, W2-d / EPIC-04 §7.c).
 *
 * EPIC 4 code-split `locales.js`, `BlockEditor` and the knowledge overlays off the eager graph, but
 * nothing asserted the result, so the W2-d claim that "the bundle gate enforces the boundary" was
 * unsupported and the split could silently regress. This is that gate.
 *
 * Mechanism note (EPIC-04 §7.c offered `size-limit` vs Rollup's `chunkSizeWarningLimit`): neither is
 * used. `chunkSizeWarningLimit` only warns and cannot fail a build. `size-limit` would add a
 * dependency tree to the frontend for ~90 lines of logic, and new dependencies go through the
 * RB-10 §9 approval checklist. This follows the repository's existing gate pattern instead —
 * a script registered in `verification-manifest.json`, like `guardrails.sh` and `quality-gates.mjs`
 * — giving the same explicit, reviewable budget with no added supply-chain surface. Budgets and the
 * lazy-module contract live in `scripts/lib/bundle-budget.mjs` and are unit-tested.
 *
 * Requires `works-frontend/dist`; run after `npm run build`.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { BUDGETS_KB, MUST_STAY_LAZY, initialAssets, evaluateBudget } from './lib/bundle-budget.mjs';

const DIST = join(process.cwd(), 'works-frontend', 'dist');
const INDEX = join(DIST, 'index.html');

if (!existsSync(INDEX)) {
  console.error(
    `BLOCK: ${INDEX} not found. Run \`npm run build\` in works-frontend before the bundle budget gate.`,
  );
  process.exit(1);
}

const assets = initialAssets(readFileSync(INDEX, 'utf8')).map((path) => ({
  path,
  contents: readFileSync(join(DIST, path.replace(/^\//, ''))),
}));

const { failures, totals, breakdown } = evaluateBudget(assets, BUDGETS_KB, MUST_STAY_LAZY);

for (const asset of breakdown.sort((a, b) => b.kb - a.kb)) {
  console.log(`  ${String(asset.kb).padStart(7)}KB  ${asset.path}`);
}
console.log(
  `\nInitial payload (gzipped): JS ${totals.js}KB / ${BUDGETS_KB.js}KB · ` +
    `CSS ${totals.css}KB / ${BUDGETS_KB.css}KB`,
);

if (failures.length) {
  console.error(`\nBLOCK: initial payload exceeds its budget:\n- ${failures.join('\n- ')}`);
  console.error(
    '\nEither bring the payload back under budget, or raise the budget in ' +
      'scripts/lib/bundle-budget.mjs with the reason stated in the PR.',
  );
  process.exit(1);
}

console.log(`OK — initial payload within budget; ${MUST_STAY_LAZY.join(', ')} stayed lazy.`);
