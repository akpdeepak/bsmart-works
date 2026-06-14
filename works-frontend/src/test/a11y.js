// bSmart Works — automated accessibility test helper (issue 276, RB-30 §6, WCAG 2.1→2.2 AA).
//
// A thin wrapper over axe-core (the official rules engine — already in the tree via
// @storybook/addon-a11y, promoted to a direct devDependency so it is version-pinned for tests).
// We call `axe.run` directly rather than pulling in a wrapper lib (vitest-axe / jest-axe) so the
// dependency surface stays minimal (RB-10 §12) and there is exactly one axe-core version.
//
// WHAT THIS CATCHES (automatable, ~30–40% of WCAG): missing names/labels, button/link text, ARIA
// misuse, role validity, heading order, image alt, list/table structure, duplicate ids, and the
// rule subset jsdom can evaluate without layout. WHAT IT CANNOT: real-browser colour contrast
// (jsdom has no layout/computed colour), keyboard traversal order, focus-visible appearance,
// reflow/zoom, target-size geometry, and screen-reader narration — those stay in the manual audit
// (docs/A11Y.md).
//
// Usage:
//   import { expectNoA11yViolations } from '@/test/a11y';
//   const { container } = render(<Thing />);
//   await expectNoA11yViolations(container);

import axe from 'axe-core';
import { expect } from 'vitest';

// jsdom has no layout engine, so geometry/contrast-dependent rules can't be evaluated reliably and
// would either error or false-pass. We disable exactly those and let the real-browser checks
// (Storybook addon-a11y / Playwright + manual audit) own them — see docs/A11Y.md.
const JSDOM_UNRELIABLE_RULES = {
  'color-contrast': { enabled: false }, // needs computed colour + layout (real browser only)
  'target-size': { enabled: false }, // WCAG 2.2 — needs geometry; audited manually / in-browser
};

/**
 * Run axe against a rendered container and fail the test on any serious/critical violation.
 * By default we gate on serious+critical (the actionable signal); pass `{ impacts }` to widen.
 *
 * @param {Element} container - the DOM node returned by RTL `render()`.
 * @param {object} [options]
 * @param {string[]} [options.impacts] - impact levels that fail the test (default serious+critical).
 * @param {object} [options.rules] - extra axe rule overrides merged over the jsdom defaults.
 */
export async function expectNoA11yViolations(container, options = {}) {
  const { impacts = ['serious', 'critical'], rules = {} } = options;
  if (!container) throw new Error('expectNoA11yViolations: a rendered container is required');

  const results = await axe.run(container, {
    // WCAG 2.1 AA + 2.2 AA + best-practice rule tags. Geometry/contrast rules are turned off above.
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
    rules: { ...JSDOM_UNRELIABLE_RULES, ...rules },
    // We pass a live DOM node; axe doesn't need to serialise element references back out.
    elementRef: false,
  });

  const blocking = results.violations.filter((v) => impacts.includes(v.impact));
  if (blocking.length > 0) {
    const report = blocking
      .map((v) => {
        const nodes = v.nodes
          .map((n) => `      - ${n.target.join(' ')}\n        ${(n.failureSummary || '').replace(/\n/g, '\n        ')}`)
          .join('\n');
        return `  [${v.impact}] ${v.id}: ${v.help}\n    ${v.helpUrl}\n${nodes}`;
      })
      .join('\n\n');
    // Surface a readable, actionable failure rather than a bare boolean.
    expect.fail(`${blocking.length} accessibility violation(s) (impacts: ${impacts.join(', ')}):\n\n${report}`);
  }
}
