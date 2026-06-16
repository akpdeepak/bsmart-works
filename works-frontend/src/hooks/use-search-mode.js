// use-search-mode.js — hook for the KR-044 AI semantic search mode toggle.
// Kept separate from SearchModeToggle.jsx so the component file stays a
// component-only module (react-refresh/only-export-components rule).

import { useState } from 'react';
import { SEARCH_MODE_KEY } from '@/components/knowledge/SearchModeToggle';

function readStored() {
  try {
    const v = localStorage.getItem(SEARCH_MODE_KEY);
    return v === 'ai' ? 'ai' : 'keyword';
  } catch {
    return 'keyword';
  }
}

/**
 * useSearchMode — manages the persisted keyword|AI search mode.
 * Returns [mode, setMode] where setMode also persists the value to localStorage.
 *
 * @returns {['keyword'|'ai', (m: 'keyword'|'ai') => void]}
 */
export function useSearchMode() {
  const [mode, setMode] = useState(readStored);
  const setAndPersist = (m) => {
    try { localStorage.setItem(SEARCH_MODE_KEY, m); } catch { /* private browsing */ }
    setMode(m);
  };
  return [mode, setAndPersist];
}
