import { useState, useEffect } from 'react';
import { DENSITY_DEFAULT, DENSITY_STORAGE_KEY, DENSITY_LEVELS } from '@/lib/density';

/**
 * useDensity — global density preference hook (WI-23).
 *
 * Reads the initial level from localStorage; persists changes there and also
 * sets `document.documentElement.dataset.density` so CSS consumers can target
 * the [data-density] attribute directly (see index.css --dp-* custom properties).
 *
 * @returns {{ density: string, setDensity: (level: string) => void }}
 */
export function useDensity() {
  const [density, setDensityState] = useState(() => {
    try {
      const stored = localStorage.getItem(DENSITY_STORAGE_KEY);
      return DENSITY_LEVELS.includes(stored) ? stored : DENSITY_DEFAULT;
    } catch {
      return DENSITY_DEFAULT;
    }
  });

  const setDensity = (level) => {
    if (!DENSITY_LEVELS.includes(level)) return;
    setDensityState(level);
  };

  useEffect(() => {
    try { localStorage.setItem(DENSITY_STORAGE_KEY, density); } catch { /* quota */ }
    document.documentElement.dataset.density = density;
  }, [density]);

  return { density, setDensity };
}
