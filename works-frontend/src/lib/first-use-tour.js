const PREFIX = 'bsmart:first-use-tour:';

const canStore = () => typeof window !== 'undefined' && Boolean(window.localStorage);

export function isTourCompleted(tourId) {
  if (!canStore() || !tourId) return false;
  return window.localStorage.getItem(`${PREFIX}${tourId}`) === 'done';
}

export function completeTour(tourId) {
  if (!canStore() || !tourId) return;
  window.localStorage.setItem(`${PREFIX}${tourId}`, 'done');
}

export function resetTour(tourId) {
  if (!canStore() || !tourId) return;
  window.localStorage.removeItem(`${PREFIX}${tourId}`);
}
