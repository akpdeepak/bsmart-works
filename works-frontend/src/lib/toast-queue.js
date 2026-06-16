// Toast queue manager — lightweight pub-sub singleton (no Zustand/Redux).
// Supports stacking: up to MAX_VISIBLE toasts shown simultaneously; additional
// toasts are queued and promoted as visible toasts are dismissed.

export const MAX_VISIBLE = 3;
let listeners = [];
let queue = [];    // pending toasts not yet visible
let visible = [];  // currently shown toasts (up to MAX_VISIBLE)
let nextId = 1;

// Push a toast. Returns the assigned id.
// tone: 'info' | 'success' | 'warning' | 'danger'
// action: optional { label: string, onClick: () => void }
export function pushToast({ message, tone = 'info', duration = 4000, action } = {}) {
  const toast = { id: nextId++, message, tone, duration, action, createdAt: Date.now() };
  if (visible.length < MAX_VISIBLE) {
    visible = [...visible, toast];
  } else {
    queue = [...queue, toast];
  }
  notify();
  return toast.id;
}

// Dismiss a visible toast by id. Promotes the next queued toast if any.
export function dismissToast(id) {
  visible = visible.filter(t => t.id !== id);
  if (queue.length > 0) {
    visible = [...visible, queue[0]];
    queue = queue.slice(1);
  }
  notify();
}

// Subscribe to state changes. Callback receives { visible, queue } immediately on subscribe.
// Returns an unsubscribe function.
export function subscribeToasts(fn) {
  listeners = [...listeners, fn];
  fn({ visible, queue }); // immediate snapshot
  return () => {
    listeners = listeners.filter(l => l !== fn);
  };
}

// Reset state (for tests only — keeps module singleton clean between test runs).
export function _resetToastQueue() {
  listeners = [];
  queue = [];
  visible = [];
  nextId = 1;
}

function notify() {
  listeners.forEach(l => l({ visible, queue }));
}
