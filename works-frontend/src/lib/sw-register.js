// Service-worker registration (iteration 18, Cap S — PWA). Called once from main.jsx. Guarded so it
// only runs in a real browser with SW support and a production build (the dev server and tests skip
// it). Failures are swallowed — a missing SW must never break app startup.
export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  // Vite sets import.meta.env.PROD in production builds; avoid registering against the dev server.
  if (import.meta.env && import.meta.env.DEV) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* registration is best-effort */
    });
  });
}
