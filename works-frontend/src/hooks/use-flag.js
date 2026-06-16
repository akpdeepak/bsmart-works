// WI-11 — useFlag(key) hook.
//
// Returns the live boolean value of a feature flag.
//
// State is initialised from getFlag(key), which checks localStorage then the FLAGS default.
// A 'storage' event listener re-reads the value whenever another tab or the FlagDevtools
// overlay writes to localStorage, so toggling a flag in DevTools propagates live without a
// page reload (same-tab storage events are dispatched manually by FlagDevtools).

import { useState, useEffect } from 'react';
import { getFlag } from '@/lib/flags';

/**
 * Returns the current boolean value for the named feature flag.
 *
 * - In production the value comes from FLAGS (always false until promoted).
 * - In development the FlagDevtools overlay (flag-devtools.jsx) writes to
 *   localStorage and fires a synthetic 'storage' event so this hook updates live.
 *
 * @param {string} key - Flag key, e.g. 'onboarding_wizard'.
 * @returns {boolean}
 */
export function useFlag(key) {
  const [value, setValue] = useState(() => getFlag(key));

  useEffect(() => {
    function handleStorage(e) {
      // Listen for both real cross-tab storage events and the synthetic event
      // dispatched by FlagDevtools for same-tab toggles.
      if (e.key === null || e.key === `flag:${key}`) {
        setValue(getFlag(key));
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [key]);

  return value;
}
