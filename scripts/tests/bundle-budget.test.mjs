import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { initialAssets, evaluateBudget, gzippedKb } from '../lib/bundle-budget.mjs';

const INDEX_HTML = `<!doctype html><html><head>
<script type="module" crossorigin src="/assets/index-abc.js"></script>
<link rel="modulepreload" crossorigin href="/assets/vendor-react-def.js">
<link rel="modulepreload" crossorigin href="/assets/vendor-react-def.js">
<link rel="stylesheet" crossorigin href="/assets/index-ghi.css">
</head><body><div id="root"></div></body></html>`;

/** Incompressible filler, so a "big" fixture is still big after gzip. */
const noisyPayload = (kb) => randomBytes(kb * 1024);

test('initialAssets collects the entry and its preloads, deduplicated', () => {
  assert.deepEqual(initialAssets(INDEX_HTML), [
    '/assets/index-abc.js',
    '/assets/vendor-react-def.js',
    '/assets/index-ghi.css',
  ]);
});

test('initialAssets ignores lazy chunks that index.html does not reference', () => {
  assert.ok(!initialAssets(INDEX_HTML).some((path) => path.includes('BlockEditor')));
});

test('a payload inside budget passes', () => {
  const { failures, totals } = evaluateBudget(
    [
      { path: '/assets/index-abc.js', contents: 'a'.repeat(50_000) },
      { path: '/assets/index-ghi.css', contents: 'b'.repeat(5_000) },
    ],
    { js: 260, css: 20 },
  );

  assert.deepEqual(failures, []);
  assert.ok(totals.js < 260);
});

test('an oversized JS payload fails with the overage named', () => {
  const { failures } = evaluateBudget(
    [{ path: '/assets/index-abc.js', contents: noisyPayload(400) }],
    { js: 260, css: 20 },
  );

  assert.equal(failures.length, 1);
  assert.match(failures[0], /initial JS is [\d.]+KB gzipped, over the 260KB budget/);
});

test('an oversized CSS payload fails independently of JS', () => {
  const { failures } = evaluateBudget(
    [{ path: '/assets/index-ghi.css', contents: noisyPayload(60) }],
    { js: 260, css: 20 },
  );

  assert.equal(failures.length, 1);
  assert.match(failures[0], /initial CSS is/);
});

test('a lazy-by-contract module leaking into the initial payload fails even when small', () => {
  const { failures } = evaluateBudget(
    [{ path: '/assets/BlockEditor-xyz.js', contents: 'tiny' }],
    { js: 260, css: 20 },
    ['BlockEditor'],
  );

  assert.equal(failures.length, 1);
  assert.match(failures[0], /BlockEditor must stay lazy but is in the initial payload/);
});

test('gzippedKb measures compressed, not raw, size', () => {
  // 100KB of one repeated byte compresses to almost nothing; a raw-size gate would misreport it.
  assert.ok(gzippedKb('a'.repeat(100 * 1024)) < 1);
});
