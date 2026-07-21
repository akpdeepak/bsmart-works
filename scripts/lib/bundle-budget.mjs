import { gzipSync } from 'node:zlib';

/**
 * Initial-payload budgets for the frontend, in gzipped KB.
 *
 * These bound what a first paint costs — the entry chunk plus everything `index.html` preloads.
 * Lazy route/feature chunks are deliberately excluded: EPIC 4 code-split `BlockEditor`,
 * `knowledge-view` and the per-language syntax-highlighter payloads precisely so they would not be
 * paid for on load, and a total-bytes budget would punish that split instead of protecting it.
 *
 * Ratchet rule (Phase 2 §0.4): when a change lands that lowers a measured value, lower the budget
 * with it. A budget parked far above the measurement enforces nothing.
 */
export const BUDGETS_KB = {
  js: 260,
  css: 20,
};

/**
 * Modules that must never be reachable from the initial payload. This is the executable half of the
 * W2-d claim that the code-split "boundary" is enforced — without it, an accidental static import
 * silently pulls a lazy monolith back into the entry chunk and only the byte budget would notice.
 */
export const MUST_STAY_LAZY = ['BlockEditor', 'knowledge-view', 'html2canvas'];

const KB = 1024;

/** Asset paths referenced directly by index.html — the entry plus its preloaded static imports. */
export function initialAssets(indexHtml) {
  const matches = indexHtml.matchAll(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/g);
  return [...new Set([...matches].map((match) => match[1]))];
}

export function gzippedKb(contents) {
  return gzipSync(contents).length / KB;
}

const round = (value) => Math.round(value * 10) / 10;

/**
 * @param assets {Array<{path: string, contents: Buffer|string}>} the initial payload
 * @returns {{failures: string[], totals: {js: number, css: number}, breakdown: object[]}}
 */
export function evaluateBudget(assets, budgets = BUDGETS_KB, mustStayLazy = MUST_STAY_LAZY) {
  const breakdown = assets.map((asset) => ({
    path: asset.path,
    kind: asset.path.endsWith('.css') ? 'css' : 'js',
    kb: round(gzippedKb(asset.contents)),
  }));

  const totals = {
    js: round(breakdown.filter((a) => a.kind === 'js').reduce((sum, a) => sum + a.kb, 0)),
    css: round(breakdown.filter((a) => a.kind === 'css').reduce((sum, a) => sum + a.kb, 0)),
  };

  const failures = [];
  for (const kind of ['js', 'css']) {
    if (totals[kind] > budgets[kind]) {
      failures.push(
        `initial ${kind.toUpperCase()} is ${totals[kind]}KB gzipped, over the ${budgets[kind]}KB budget ` +
          `(+${round(totals[kind] - budgets[kind])}KB)`,
      );
    }
  }

  for (const name of mustStayLazy) {
    const leaked = breakdown.find((asset) => asset.path.includes(name));
    if (leaked) {
      failures.push(`${name} must stay lazy but is in the initial payload (${leaked.path})`);
    }
  }

  return { failures, totals, breakdown };
}
