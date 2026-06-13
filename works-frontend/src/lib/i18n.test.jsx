import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// The provider best-effort reconciles with /users/me on mount and PUTs the locale on change;
// stub apiClient so neither network call runs in the test.
vi.mock('@/lib/apiClient', () => ({ api: { send: vi.fn(() => Promise.resolve({})) } }));

import { I18nProvider, useI18n } from './i18n';
import { translate, MESSAGES } from './locales';
import ReportsView from '@/views/reports-view';

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

  it('switching locale changes a rendered Insights string (stub locale)', () => {
    // The Reports page title is one of the few keys the non-en catalogs translate as a stub;
    // English and Hindi differ, so the rendered heading must change when the locale switches.
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

    // Switch to Hindi → the heading re-renders with the Hindi stub.
    fireEvent.change(screen.getByLabelText('locale'), { target: { value: 'hi' } });
    expect(screen.getByRole('heading', { name: MESSAGES.hi['insights.reports.title'] })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sprint Reports' })).not.toBeInTheDocument();
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

  it('falls back to English when a locale is missing a key (never blank, never the key)', () => {
    // `insights.reports.subtitle` is English-only (not in the stub catalogs) → en fallback.
    expect(MESSAGES.hi['insights.reports.subtitle']).toBeUndefined();
    expect(translate('hi', 'insights.reports.subtitle')).toBe(translate('en', 'insights.reports.subtitle'));

    render(
      <I18nProvider>
        <LocaleHarness>
          <ReportsView {...reportsProps} />
        </LocaleHarness>
      </I18nProvider>,
    );
    fireEvent.change(screen.getByLabelText('locale'), { target: { value: 'hi' } });
    // The English subtitle still renders under the Hindi locale (graceful fallback).
    expect(screen.getByText('Velocity, delivery, and scope tracking')).toBeInTheDocument();
  });
});
