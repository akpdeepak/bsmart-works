import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// The provider best-effort reconciles with /users/me on mount and PUTs the locale on change;
// stub apiClient so neither network call runs in the test.
vi.mock('@/lib/apiClient', () => ({ api: { send: vi.fn(() => Promise.resolve({})) } }));

import { I18nProvider, useI18n } from './i18n';
import { translate, loadLocale } from './locales';
// Non-en catalogs are lazy-loaded chunks now (no monolithic MESSAGES export); import the specific
// per-language tables this suite reads directly, so assertions on exact translated values are unchanged.
import hi from './locales/hi.js';
import ar from './locales/ar.js';
import ja from './locales/ja.js';
import ReportsView from '@/views/reports-view';

const MESSAGES = { hi, ar, ja };

const reportsProps = {
  velocityData: [],
  sprints: [],
  selectedSprintId: null,
  sprintReport: null,
  scopeChanges: [],
  setSelectedSprintId: () => {},
  fetchSprintReport: () => {},
};

// A tiny harness that surfaces the switcher so the test can drive setLocale at runtime.
function LocaleHarness({ children }) {
  const { locale, setLocale, locales } = useI18n();
  return (
    <div>
      <select aria-label="locale" value={locale} onChange={(e) => setLocale(e.target.value)}>
        {locales.map((l) => <option key={l.code} value={l.code}>{l.code}</option>)}
      </select>
      {children}
    </div>
  );
}

describe('i18n foundation', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dir = '';
    document.documentElement.lang = '';
  });

  it('switching locale changes a rendered Insights string (translated locale)', async () => {
    // The Insights catalog (insights.*) is fully translated for every non-en locale (issue 275);
    // English and Hindi differ, so the rendered heading must change when the locale switches.
    await loadLocale('hi'); // register the lazily-loaded Hindi chunk before asserting its values
    expect(translate('en', 'insights.reports.title')).toBe('Sprint Reports');
    expect(MESSAGES.hi['insights.reports.title']).toBeDefined();

    render(
      <I18nProvider>
        <LocaleHarness>
          <ReportsView {...reportsProps} />
        </LocaleHarness>
      </I18nProvider>,
    );

    // Starts in English.
    expect(screen.getByRole('heading', { name: 'Sprint Reports' })).toBeInTheDocument();

    // Switch to Hindi → the heading re-renders with the Hindi translation (async: the provider
    // lazy-loads the chunk then bumps a version to re-render).
    fireEvent.change(screen.getByLabelText('locale'), { target: { value: 'hi' } });
    expect(await screen.findByRole('heading', { name: MESSAGES.hi['insights.reports.title'] })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sprint Reports' })).not.toBeInTheDocument();
  });

  it('Insights catalog is fully translated (non-en, never the en string) for RTL + LTR locales', async () => {
    // A representative slice of the insights.* set — issue 275 translated the whole catalog for all
    // 9 non-en locales. Each must be present and differ from the English source string.
    await loadLocale('ar'); // register the lazily-loaded chunks before translate() resolves them
    await loadLocale('ja');
    const sampleKeys = [
      'insights.reports.subtitle',
      'insights.dashboards.new',
      'insights.reportBuilder.editReport',
      'insights.performance.cycleTimeDistribution',
      'insights.widgetBuilder.dataSource',
    ];
    for (const locale of ['ar', 'ja']) { // ar = RTL, ja = LTR
      for (const key of sampleKeys) {
        const translated = translate(locale, key);
        expect(MESSAGES[locale][key]).toBeDefined();        // not falling back
        expect(translated).toBe(MESSAGES[locale][key]);     // resolves to the locale entry
        expect(translated).not.toBe(translate('en', key));  // genuinely localized, not the en string
        expect(translated.trim()).not.toBe('');             // never blank
      }
    }
    // BQL keyword stays untranslated inside the (translated) BQL subtitle — kept as a product term.
    expect(translate('ja', 'insights.bql.subtitle')).toContain('startOfWeek()');
    expect(translate('ar', 'insights.bql.subtitle')).toContain('IS EMPTY');
  });

  it('sets <html dir="rtl"> for Arabic and ltr otherwise', () => {
    render(
      <I18nProvider>
        <LocaleHarness />
      </I18nProvider>,
    );
    const select = screen.getByLabelText('locale');

    fireEvent.change(select, { target: { value: 'fr' } });
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('fr');

    fireEvent.change(select, { target: { value: 'ar' } });
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
  });

  it('falls back to English when a locale has not externalized a key (never blank, never the key)', () => {
    // The Insights catalog is now fully translated, so the fallback path is proven with a surface
    // that has NOT been externalized to the non-en catalogs yet — `settings.notifications` is
    // English-only. The Hindi catalog has no entry, so translate() must return the English string
    // (graceful degradation), never a blank or the raw key.
    expect(MESSAGES.hi['settings.notifications']).toBeUndefined();
    expect(translate('hi', 'settings.notifications')).toBe(translate('en', 'settings.notifications'));
    expect(translate('hi', 'settings.notifications')).toBe('Notifications');

    // An entirely unknown key falls back to the key itself — never a blank string.
    expect(translate('hi', 'totally.unknown.key')).toBe('totally.unknown.key');
  });
});
