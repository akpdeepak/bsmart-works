// bSmart Works — UI string catalogue (iteration-20 Cap A: Localization, 10+ languages).
// One flat key namespace shared by every locale; English is the source-of-truth fallback. New keys
// are added to `en` first; a missing translation falls back to English (never a blank string), so a
// partially-translated locale degrades gracefully rather than breaking the UI. RTL locales (ar) are
// declared in RTL_LOCALES below so the shell can flip direction.
//
// Only English ships in the main JS bundle (static import below); the other 9 locales live in
// per-language chunks under ./locales/<code>.js and are lazy-loaded on demand via loadLocale().

import en from './locales/en.js';

export const LOCALES = [
  { code: 'en', label: 'English',    native: 'English' },
  { code: 'hi', label: 'Hindi',      native: 'हिन्दी' },
  { code: 'es', label: 'Spanish',    native: 'Español' },
  { code: 'fr', label: 'French',     native: 'Français' },
  { code: 'de', label: 'German',     native: 'Deutsch' },
  { code: 'pt', label: 'Portuguese', native: 'Português' },
  { code: 'ja', label: 'Japanese',   native: '日本語' },
  { code: 'zh', label: 'Mandarin',   native: '中文' },
  { code: 'ar', label: 'Arabic',     native: 'العربية' },
  { code: 'ko', label: 'Korean',     native: '한국어' },
];

export const RTL_LOCALES = new Set(['ar']);

export const DEFAULT_LOCALE = 'en';

// The loaded message tables. English is always present (static import) — the guaranteed fallback and
// the table used for the first paint. Non-en tables are populated by loadLocale() when their chunk
// arrives.
const TABLES = { en };

// Lazy-load a locale's message table. English is already resolved; any other code dynamically imports
// its ./locales/<code>.js chunk and registers it. If the chunk fails to load (offline, etc.) the table
// stays absent and translate() keeps falling back to English.
export async function loadLocale(code) {
  if (code === DEFAULT_LOCALE || TABLES[code]) return;
  try {
    TABLES[code] = (await import(`./locales/${code}.js`)).default;
  } catch {
    /* keep the English fallback if a locale chunk fails to load */
  }
}

// Resolve a key for a locale, falling back to English then the key itself.
export function translate(locale, key) {
  return TABLES[locale]?.[key] ?? TABLES.en[key] ?? key;
}
