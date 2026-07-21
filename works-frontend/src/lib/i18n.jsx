// bSmart Works — i18n runtime (iteration-20 Cap A: localization). A tiny, dependency-free provider
// (no i18n library — keeps the bundle lean, RB-10) that exposes a `t(key)` translator and the
// current locale. The preference is loaded from / persisted to the server (PUT /users/me/locale via
// apiClient), cached in localStorage for an instant first paint, and applied to <html lang/dir> so
// RTL locales (Arabic) render correctly. A missing translation falls back to English (locales.js).

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/lib/apiClient';
import { translate, loadLocale, RTL_LOCALES, DEFAULT_LOCALE, LOCALES } from '@/lib/locales';

const STORAGE_KEY = 'works.locale';
const I18nContext = createContext(null);

function applyDocumentLocale(locale) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale;
  document.documentElement.dir = RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';
}

function initialLocale() {
  if (typeof localStorage === 'undefined') return DEFAULT_LOCALE;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored && LOCALES.some((l) => l.code === stored) ? stored : DEFAULT_LOCALE;
}

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(initialLocale);
  // Bumped once a lazily-loaded locale chunk arrives, so `t` re-runs against the newly registered table.
  const [version, setVersion] = useState(0);

  // Apply <html lang/dir> whenever the locale changes.
  useEffect(() => { applyDocumentLocale(locale); }, [locale]);

  // Lazy-load the non-default locale chunk, then trigger a re-render so `t` resolves the new strings.
  useEffect(() => {
    if (locale === DEFAULT_LOCALE) return;
    let alive = true;
    loadLocale(locale).then(() => { if (alive) setVersion((v) => v + 1); });
    return () => { alive = false; };
  }, [locale]);

  // On mount, reconcile with the signed-in user's saved preference (best-effort; ignored when
  // unauthenticated, since /users/me requires a token).
  useEffect(() => {
    let alive = true;
    api.send('/users/me')
      .then((me) => { if (alive && me && me.locale) setLocaleState(me.locale); })
      .catch(() => { /* unauthenticated or offline — keep the local/default locale */ });
    return () => { alive = false; };
  }, []);

  const setLocale = useCallback((next) => {
    if (!LOCALES.some((l) => l.code === next)) return;
    setLocaleState(next);
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, next);
    // Persist for the user; non-fatal if it fails (e.g. offline) — the local choice still applies.
    api.send('/users/me/locale', { method: 'PUT', body: { locale: next } }).catch(() => {});
  }, []);

  // `version` is a deliberate dependency: translate() reads a mutable module-level table that a
  // lazy locale load mutates, so bumping `version` must give `t` a fresh identity to re-render.
  const t = useCallback((key) => translate(locale, key), [locale, version]);

  const value = useMemo(() => ({ locale, setLocale, t, locales: LOCALES }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
export function useI18n() {
  const ctx = useContext(I18nContext);
  // A safe default so components work even if rendered outside the provider (e.g. isolated tests).
  if (!ctx) {
    return { locale: DEFAULT_LOCALE, setLocale: () => {}, t: (k) => translate(DEFAULT_LOCALE, k), locales: LOCALES };
  }
  return ctx;
}
