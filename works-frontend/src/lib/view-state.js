const PREFIX = 'bsmart:view-state:';

const storageAvailable = () => typeof window !== 'undefined' && Boolean(window.localStorage);

export function readViewState(surface, fallback = {}) {
  if (!storageAvailable() || !surface) return fallback;
  try {
    const raw = window.localStorage.getItem(`${PREFIX}${surface}`);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export function writeViewState(surface, nextState) {
  if (!storageAvailable() || !surface) return nextState;
  const safeState = nextState && typeof nextState === 'object' ? nextState : {};
  window.localStorage.setItem(`${PREFIX}${surface}`, JSON.stringify(safeState));
  return safeState;
}

export function mergeViewState(surface, patch, fallback = {}) {
  const next = { ...readViewState(surface, fallback), ...patch };
  return writeViewState(surface, next);
}

export function clearViewState(surface) {
  if (!storageAvailable() || !surface) return;
  window.localStorage.removeItem(`${PREFIX}${surface}`);
}
