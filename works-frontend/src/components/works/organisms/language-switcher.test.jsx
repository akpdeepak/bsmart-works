import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/apiClient', () => ({ api: { send: vi.fn(() => Promise.resolve({})) } }));

import { LanguageSwitcher } from './language-switcher';
import { I18nProvider } from '@/lib/i18n';
import { translate } from '@/lib/locales';

describe('LanguageSwitcher', () => {
  it('lists all 10 shipped locales and switches language', () => {
    render(<I18nProvider><LanguageSwitcher /></I18nProvider>);
    const select = screen.getByLabelText('Language');
    expect(select.querySelectorAll('option')).toHaveLength(10);

    fireEvent.change(select, { target: { value: 'hi' } });
    expect(select.value).toBe('hi');
    // <html> direction stays ltr for Hindi…
    expect(document.documentElement.dir).toBe('ltr');

    // …and flips to rtl for Arabic.
    fireEvent.change(select, { target: { value: 'ar' } });
    expect(document.documentElement.dir).toBe('rtl');
  });
});

describe('translate', () => {
  it('returns the locale string and falls back to English for missing keys', () => {
    expect(translate('es', 'nav.home')).toBe('Inicio');
    expect(translate('hi', 'nav.board')).toBe('बोर्ड');
    // unknown key → returns the key itself, never blank
    expect(translate('fr', 'nav.unknownKey')).toBe('nav.unknownKey');
    // missing locale → English fallback
    expect(translate('xx', 'common.save')).toBe('Save');
  });
});
