import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const viewsDir = dirname(fileURLToPath(import.meta.url));

// Ratchet, not a ceiling (Phase 2 §0.4). The W2 row "adopt AsyncBoundary on all primary async
// surfaces" is measured here rather than by a hand-counted grep — the count in GH-537 was overstated
// because a raw `grep -rl` also matched the component itself, its test, and a non-view organism.
//
// A view is a "primary async surface" when it either owns loading/error state or receives it as a
// prop. Every such view renders its unresolved states through <AsyncBoundary> so the canonical
// loading, empty and error treatments (RB-30 §6) are consistent instead of hand-rolled per screen.
//
// PENDING is now empty: every async view has been converted. It is kept so a future view that
// legitimately needs staging has somewhere to go, and so the stale-entry check keeps working.
const PENDING = new Set([]);

// Views with no async load to wrap. Justified individually — this list is not a dumping ground.
//
// account-view, dashboard-view, settings3-view — purely presentational, driven entirely by
//   already-resolved props.
// workspace-view — its only `error` occurrences are the `'error'` severity argument passed to
//   showToast; there is no load state at all.
// bql-results-table — not a page: a presentational table whose only `loading` is the
//   `loading={bulkBusy}` prop on a Button.
//
// The last two were briefly listed as PENDING on the strength of a bare /\b(loading|error)\b/
// match. Re-reading them showed the match came from a toast severity string and a Button prop, so
// they were reclassified rather than given a boundary with nothing to wrap.
const NO_ASYNC_STATE = new Set([
  'account-view',
  'dashboard-view',
  'settings3-view',
  'workspace-view',
  'bql-results-table',
]);

// Views whose only `error` state is an inline failure from an explicit user action (a form submit),
// with no async *load* to wrap. AsyncBoundary replaces content with an error panel, which is the
// wrong treatment for "your submission failed, here is your form back".
const ACTION_ERROR_ONLY = new Set([
  'onboarding-wizard',
]);

const viewNames = readdirSync(viewsDir)
  .filter((name) => name.endsWith('.jsx') && !name.endsWith('.test.jsx'))
  .map((name) => name.replace(/\.jsx$/, ''));

const sourceOf = (name) => readFileSync(resolve(viewsDir, `${name}.jsx`), 'utf8');

// Deliberately broad: it over-matches (a `'error'` toast argument trips it) so that a genuinely
// async view can never slip through unclassified. Over-matching costs one line in an exemption list
// with a written reason; under-matching would silently drop a view from the row entirely.
const hasAsyncState = (source) => /\b(loading|isLoading|error)\b/.test(source);
const usesAsyncBoundary = (source) => source.includes('AsyncBoundary');

const isExempt = (name) => NO_ASYNC_STATE.has(name) || ACTION_ERROR_ONLY.has(name);

describe('AsyncBoundary adoption across primary async views', () => {
  it('finds the views directory', () => {
    expect(viewNames.length).toBeGreaterThan(30);
  });

  it('routes every async view through AsyncBoundary', () => {
    const unconverted = viewNames.filter((name) => {
      if (PENDING.has(name) || isExempt(name)) return false;
      const source = sourceOf(name);
      return hasAsyncState(source) && !usesAsyncBoundary(source);
    });

    expect(unconverted, 'async views missing AsyncBoundary — wrap them or add them to PENDING')
      .toEqual([]);
  });

  it('keeps PENDING free of stale entries so the list can only shrink', () => {
    const alreadyConverted = [...PENDING].filter((name) => usesAsyncBoundary(sourceOf(name)));

    expect(alreadyConverted, 'these views now use AsyncBoundary — remove them from PENDING')
      .toEqual([]);
  });

  // Checked by adoption, not by the broad regex — the regex is what mislabelled two of these in the
  // first place. A view claimed to have nothing to wrap must not be wrapping anything; the moment it
  // renders an AsyncBoundary, the claim is stale and the list has to be corrected.
  it('keeps the exemption lists honest — an exempt view may not use AsyncBoundary', () => {
    const contradictions = [...NO_ASYNC_STATE, ...ACTION_ERROR_ONLY]
      .filter((name) => usesAsyncBoundary(sourceOf(name)));

    expect(contradictions, 'these views now render an AsyncBoundary — they are not exempt; remove them')
      .toEqual([]);
  });

  it('keeps ACTION_ERROR_ONLY honest — none of them may grow a load state', () => {
    // `loading`/`isLoading` is the signal that a view now fetches rather than just submits.
    const nowLoads = [...ACTION_ERROR_ONLY]
      .filter((name) => /\b(loading|isLoading)\b/.test(sourceOf(name)));

    expect(nowLoads, 'these views gained a load state — convert them and drop them from ACTION_ERROR_ONLY')
      .toEqual([]);
  });

  it('lists every view in exactly one category', () => {
    const overlaps = viewNames.filter((name) =>
      [PENDING, NO_ASYNC_STATE, ACTION_ERROR_ONLY].filter((set) => set.has(name)).length > 1);

    expect(overlaps, 'a view may appear in at most one exemption/pending list').toEqual([]);
  });

  it('has actually closed the row — no async view is left unwrapped or parked', () => {
    const asyncViews = viewNames.filter((n) => !isExempt(n) && hasAsyncState(sourceOf(n)));
    const adopted = asyncViews.filter((n) => usesAsyncBoundary(sourceOf(n)));

    expect(PENDING.size, 'PENDING must be empty for the W2 AsyncBoundary row to be closed').toBe(0);
    expect(adopted).toHaveLength(asyncViews.length);
    expect(asyncViews.length).toBeGreaterThanOrEqual(30);
  });
});
