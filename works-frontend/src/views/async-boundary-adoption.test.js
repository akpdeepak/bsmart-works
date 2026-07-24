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
// prop. Every such view must render its content through <AsyncBoundary> so the canonical loading,
// empty and error states (RB-30 §6) are consistent instead of hand-rolled per screen.
//
// Views that have not been converted yet are listed in PENDING. The list may only shrink: a view
// that adopts AsyncBoundary while still listed fails the stale-entry check, which forces the list
// to be trimmed in the same PR that does the conversion.
const PENDING = new Set([
  'backlog-view',
  'board-view',
  'bql-results-table',
  'bql-view',
  'dashboards-view',
  'knowledge-view',
  'po-workspace-view',
  'reportbuilder-view',
  'scrum-master-cockpit-view',
  'search-view',
  'sprint-view',
  'workspace-view',
]);

// Views with no async state at all — purely presentational, driven entirely by already-resolved
// props. They have nothing for AsyncBoundary to wrap, so they are out of scope by definition rather
// than pending conversion.
const NO_ASYNC_STATE = new Set([
  'account-view',
  'dashboard-view',
  'settings3-view',
]);

// Views whose only `error` state is an inline failure from an explicit user action (a form submit),
// with no async *load* to wrap. AsyncBoundary replaces content with an error panel, which is the
// wrong treatment for "your submission failed, here is your form back" — so these are out of scope
// rather than pending. They are listed separately from NO_ASYNC_STATE so the distinction stays
// visible: these DO have an error state, it just is not a boundary.
const ACTION_ERROR_ONLY = new Set([
  'onboarding-wizard',
]);

const viewNames = readdirSync(viewsDir)
  .filter((name) => name.endsWith('.jsx') && !name.endsWith('.test.jsx'))
  .map((name) => name.replace(/\.jsx$/, ''));

const sourceOf = (name) => readFileSync(resolve(viewsDir, `${name}.jsx`), 'utf8');

const hasAsyncState = (source) => /\b(loading|isLoading|error)\b/.test(source);
const usesAsyncBoundary = (source) => source.includes('AsyncBoundary');

describe('AsyncBoundary adoption across primary async views', () => {
  it('finds the views directory', () => {
    expect(viewNames.length).toBeGreaterThan(30);
  });

  it('routes every converted async view through AsyncBoundary', () => {
    const unconverted = viewNames.filter((name) => {
      if (PENDING.has(name) || NO_ASYNC_STATE.has(name) || ACTION_ERROR_ONLY.has(name)) return false;
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

  it('keeps NO_ASYNC_STATE honest — a view that grows async state must leave the list', () => {
    const nowAsync = [...NO_ASYNC_STATE].filter((name) => hasAsyncState(sourceOf(name)));

    expect(nowAsync, 'these views gained async state — convert them and drop them from NO_ASYNC_STATE')
      .toEqual([]);
  });

  it('keeps ACTION_ERROR_ONLY honest — none of them may grow a load state', () => {
    // `loading`/`isLoading` is the signal that a view now fetches rather than just submits. If one
    // appears, the exemption no longer applies and the view has to be converted.
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
});
