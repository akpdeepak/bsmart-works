// bSmart Works — shared error reporter (extracted from App.jsx, TD-003 / ONE Function).
//
// A single place to log an error and surface the standard user-facing toast. The live toast
// emitter is registered by the app shell once it has mounted (so module-level callers — including
// components outside the React tree's toast context — can still report). This removes the
// module-global `_emitToast` side-channel that previously lived in App.jsx.

let emit = null;

// Registered once by the app shell: `setToastEmitter(showToast)`.
export function setToastEmitter(fn) {
  emit = fn;
}

// Log (best-effort) and show the standard error toast if an emitter is registered.
export function reportError(e) {
  if (e) {
    try { console.error('[bSmart]', e); } catch { /* noop */ }
  }
  if (emit) emit('Something went wrong. Please try again.', 'error');
}
