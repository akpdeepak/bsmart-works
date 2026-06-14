import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// The provider best-effort reconciles with /users/me on mount and PUTs the locale on change;
// stub apiClient so neither network call runs in the test.
vi.mock('@/lib/apiClient', () => ({ api: { send: vi.fn(() => Promise.resolve({})) } }));

import { I18nProvider, useI18n } from './i18n';
import { translate, MESSAGES } from './locales';
import BoardView from '@/views/board-view';
import ProjectsView from '@/views/projects-view';

const noop = () => {};

const boardProps = {
  workItems: [],
  loading: false,
  density: 'comfortable',
  wipLimits: {},
  setDensity: noop,
  setIsCreateOpen: noop,
  setNewItem: noop,
  setSelectedItem: noop,
  handleDragStart: noop,
  handleDragOver: noop,
  handleDrop: noop,
  handleDelete: noop,
  toggleStar: noop,
  setWipLimit: noop,
  can: () => false,
  userName: () => '',
};

const teamsProps = {
  projects: [],
  workItems: [],
  setIsProjectOpen: noop,
  handleArchiveProject: noop,
  userName: () => 'Someone',
};

// Harness that exposes a locale switcher so a test can drive setLocale at runtime (mirrors
// i18n.test.jsx). The Deliver surfaces read strings via useI18n() and re-render on change.
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

describe('i18n — Deliver surfaces + navigation shell (issue #275)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dir = '';
    document.documentElement.lang = '';
  });

  it('renders the Board heading in the active non-en locale (Arabic, RTL) and back', () => {
    // en and ar differ for the Board title, so the heading must change when the locale switches.
    expect(translate('en', 'deliver.board.title')).toBe('Board');
    expect(MESSAGES.ar['deliver.board.title']).toBeDefined();
    expect(MESSAGES.ar['deliver.board.title']).not.toBe('Board');

    render(
      <I18nProvider>
        <LocaleHarness>
          <BoardView {...boardProps} />
        </LocaleHarness>
      </I18nProvider>,
    );

    // Starts in English.
    expect(screen.getByRole('heading', { name: 'Board' })).toBeInTheDocument();
    expect(screen.getByText('TO DO')).toBeInTheDocument();

    // Switch to Arabic → heading + column header re-render localized; RTL is applied.
    fireEvent.change(screen.getByLabelText('locale'), { target: { value: 'ar' } });
    expect(screen.getByRole('heading', { name: MESSAGES.ar['deliver.board.title'] })).toBeInTheDocument();
    expect(screen.getByText(MESSAGES.ar['deliver.board.colTodo'])).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Board' })).not.toBeInTheDocument();
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('renders the Teams empty state in Japanese', () => {
    expect(MESSAGES.ja['deliver.teams.emptyTitle']).toBeDefined();
    expect(MESSAGES.ja['deliver.teams.emptyTitle']).not.toBe(translate('en', 'deliver.teams.emptyTitle'));

    render(
      <I18nProvider>
        <LocaleHarness>
          <ProjectsView {...teamsProps} />
        </LocaleHarness>
      </I18nProvider>,
    );

    expect(screen.getByText('No teams yet')).toBeInTheDocument(); // en default
    fireEvent.change(screen.getByLabelText('locale'), { target: { value: 'ja' } });
    expect(screen.getByText(MESSAGES.ja['deliver.teams.emptyTitle'])).toBeInTheDocument();
    expect(screen.queryByText('No teams yet')).not.toBeInTheDocument();
  });

  it('deliver.* + nav.* are fully translated (non-en, never the en string) for RTL + LTR locales', () => {
    const sampleKeys = [
      'deliver.board.title',
      'deliver.backlog.emptyTitle',
      'deliver.myWorks.subtitle',
      'deliver.sprint.emptySubtitle',
      'deliver.releases.selectTitle',
      'deliver.teams.emptySubtitle',
      'nav.releases',
      'nav.section.planTrack',
      'nav.mode.deliver',
    ];
    for (const locale of ['ar', 'ja']) { // ar = RTL, ja = LTR
      for (const key of sampleKeys) {
        const translated = translate(locale, key);
        expect(MESSAGES[locale][key]).toBeDefined();        // not falling back
        expect(translated).toBe(MESSAGES[locale][key]);     // resolves to the locale entry
        expect(translated).not.toBe(translate('en', key));  // genuinely localized
        expect(translated.trim()).not.toBe('');             // never blank
      }
    }
  });

  it('deliver.filter / bulk / watch controls are translated across all 9 non-en locales', () => {
    const sampleKeys = [
      'deliver.filter.assignee',
      'deliver.filter.sortBy',
      'deliver.filter.noMatches',
      'deliver.bulk.apply',
      'deliver.bulk.action.assignee',
      'deliver.watch.watch',
      'deliver.watch.watching',
    ];
    for (const locale of ['hi', 'es', 'fr', 'de', 'pt', 'ja', 'zh', 'ar', 'ko']) {
      for (const key of sampleKeys) {
        const translated = translate(locale, key);
        expect(MESSAGES[locale][key]).toBeDefined();        // present, not falling back
        expect(translated).not.toBe(translate('en', key));  // genuinely localized
        expect(translated.trim()).not.toBe('');             // never blank
      }
    }
  });

  it('Sprint Cockpit shell + retro labels are translated across all 9 non-en locales', () => {
    // Keys whose translations genuinely differ from English in every locale (proper nouns like
    // "Scrum master"/"Retro" are intentionally kept verbatim in some locales, so they're excluded).
    const sampleKeys = [
      'deliver.cockpit.title',
      'deliver.cockpit.roleDesc.default',
      'deliver.cockpit.mode.run',
      'deliver.cockpit.tab.health',
      'deliver.cockpit.tab.variance',
      'deliver.cockpit.retro.START',
      'deliver.cockpit.raise',
    ];
    for (const locale of ['hi', 'es', 'fr', 'de', 'pt', 'ja', 'zh', 'ar', 'ko']) {
      for (const key of sampleKeys) {
        const translated = translate(locale, key);
        expect(MESSAGES[locale][key]).toBeDefined();
        expect(translated).not.toBe(translate('en', key));
        expect(translated.trim()).not.toBe('');
      }
    }
  });

  it('falls back to English when a Deliver-adjacent key is not externalized to a locale (never blank)', () => {
    // `sprint.goal` was never translated to the non-en catalogs (it pre-dates this increment and is
    // out of the externalized Deliver set), so the fallback path resolves to the English string.
    expect(MESSAGES.hi['sprint.goal']).toBeUndefined();
    expect(translate('hi', 'sprint.goal')).toBe(translate('en', 'sprint.goal'));
    expect(translate('hi', 'sprint.goal')).toBe('Sprint goal');

    // An entirely unknown deliver key falls back to the key itself — never a blank string.
    expect(translate('ar', 'deliver.board.doesNotExist')).toBe('deliver.board.doesNotExist');
  });
});
