// WI-11 — client-side feature-flag registry.
//
// FLAGS holds the production defaults for every flag (all false until enabled).
// getFlag(key) resolves the effective value:
//   1. localStorage 'flag:<key>' wins — lets devs toggle flags in DevTools without a redeploy.
//   2. Falls back to FLAGS[key] (false when the key is unknown, so callers always get a boolean).
//
// FlagDevtools (organisms/flag-devtools.jsx) uses getFlag + dispatchEvent('storage') to let
// toggles in the dev overlay propagate live to every mounted useFlag(key) hook.

/** Production defaults — all false until the feature is ready to roll out. */
export const FLAGS = {
  /** WI-12 — first-run onboarding wizard. */
  onboarding_wizard: false,
  /** WI-13 — inline quick-add entry point inside list rows. */
  inline_quick_add: false,
  /** WI-14 — global keyboard navigation shortcuts. */
  keyboard_shortcuts: false,
  /** WI-16 — optimistic mutations (update UI before the server round-trip). */
  optimistic_ui: false,
};

/**
 * Returns the effective boolean value for a flag.
 *
 * Checks localStorage first so developers can override any flag in DevTools
 * without touching the codebase:
 *   localStorage.setItem('flag:onboarding_wizard', 'true')
 *
 * Falls back to the FLAGS default. Returns false for unknown keys so callers
 * always receive a boolean regardless of typos.
 *
 * @param {string} key - Flag key (must match a key in FLAGS).
 * @returns {boolean}
 */
export function getFlag(key) {
  try {
    const stored = localStorage.getItem(`flag:${key}`);
    if (stored !== null) return stored === 'true';
  } catch {
    // localStorage may be unavailable in sandboxed environments; fall through.
  }
  return FLAGS[key] ?? false;
}
