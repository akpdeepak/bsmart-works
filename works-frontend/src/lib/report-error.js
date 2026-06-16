// bSmart Works — shared error reporter (extracted from App.jsx, TD-003 / ONE Function).
//
// A single place to log an error and surface the standard user-facing toast. The live toast
// emitter is registered by the app shell once it has mounted (so module-level callers — including
// components outside the React tree's toast context — can still report). This removes the
// module-global `_emitToast` side-channel that previously lived in App.jsx.
//
// WI-26: also routes through the toast queue so errors appear in the stacking ToastStack
// (in addition to the legacy single-toast emitter, which stays for backwards compatibility
// during the transition period).
import { pushToast } from '@/lib/toast-queue';

let emit = null;

// Registered once by the app shell: `setToastEmitter(showToast)`.
export function setToastEmitter(fn) {
  emit = fn;
}

// Log (best-effort) and show the standard error toast if an emitter is registered.
// Also pushes to the toast queue so errors surface in the ToastStack.
export function reportError(e) {
  if (e) {
    try { console.error('[bSmart]', e); } catch { /* noop */ }
  }
  // Push to the new stacking queue (WI-26). The queue is always available (singleton).
  pushToast({ message: 'Something went wrong. Please try again.', tone: 'danger' });
  // Also fire the legacy emitter for the existing Toast atom in App.jsx (transitional).
  if (emit) emit('Something went wrong. Please try again.', 'error');
}
