import { Languages } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

// Language switcher (iteration-20 Cap A). A labelled <select> over the 10 shipped locales; choosing
// one updates the live UI, flips direction for RTL, and persists the preference for the user
// (handled in I18nProvider). Token classes only; the control is fully keyboard-operable and labelled.
export function LanguageSwitcher({ className }) {
  const { locale, setLocale, locales, t } = useI18n();
  return (
    <label className={`flex items-center gap-2 text-sm ${className || ''}`}>
      <Languages className="h-4 w-4 text-neutral-500" aria-hidden="true" />
      <span className="sr-only">{t('common.language')}</span>
      <select
        aria-label={t('common.language')}
        value={locale}
        onChange={(e) => setLocale(e.target.value)}
        className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
      >
        {locales.map((l) => (
          <option key={l.code} value={l.code}>{l.native}</option>
        ))}
      </select>
    </label>
  );
}
