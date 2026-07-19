import { useState, useEffect } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * useReducedMotion — returns true when the user's OS/browser prefers reduced motion.
 *
 * Listens for real-time changes (e.g. user toggles the OS setting while the app is open).
 * Use this to skip JS-driven animations, collapse motion durations, or swap animated
 * transitions for instant state changes (WCAG 2.1 §2.3.3).
 *
 * @returns {boolean} true when prefers-reduced-motion: reduce is active
 */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const handler = (e) => setReduced(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return reduced;
}
