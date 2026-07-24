import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// The account route is the only surface that reads the signed-in user's saved preferences.
// Everything else the outlet renders is stubbed so this stays a routing/prop-wiring test.
vi.mock('@/app/routes/lazy', () => ({}), { virtual: true });

import { RouteOutlet } from './RouteOutlet';

/**
 * Regression test for GH-537.
 *
 * RouteOutlet carried a file-level `/* eslint-disable *\/`, which suppressed `no-undef` across all
 * 927 lines. Behind it, `userPrefs` was passed to <AccountView> but never destructured from `model`
 * — and it could not have been, because AppShell bound the state as `const [, setUserPrefs]`,
 * discarding the value. Rendering the account route therefore threw a ReferenceError, and the user's
 * saved theme and timezone could never be displayed.
 *
 * This pins the wiring end to end: the outlet must read userPrefs off the model and hand it to the
 * account view.
 */
const baseModel = {
  view: 'account',
  currentUser: { id: 'u1', fullName: 'Ada Lovelace', email: 'ada@example.com' },
  userPrefs: { theme: 'dark', timezone: 'Europe/London', locale: 'en', notificationsEnabled: true },
  saveUserPrefs: vi.fn(),
  notifPrefs: {},
  mfaSetup: null,
  mfaSetupCode: '',
  mfaSetupMsg: '',
  setMfaSetup: vi.fn(),
  setMfaSetupCode: vi.fn(),
  saveNotifPrefs: vi.fn(),
  handleMfaEnroll: vi.fn(),
  handleMfaConfirm: vi.fn(),
};

describe('RouteOutlet — account route preference wiring', () => {
  it('renders the account route without throwing on an undeclared binding', () => {
    expect(() => render(<RouteOutlet model={baseModel} />)).not.toThrow();
  });

  it('passes the saved preferences through to the account view', async () => {
    render(<RouteOutlet model={baseModel} />);

    // The timezone select is driven directly by userPrefs.timezone. Asserted on the select's value
    // rather than its label, because the option for 'Europe/London' reads "London" — and because a
    // missing prop silently falls back to 'UTC', which is exactly the failure this test catches.
    // Scoped by the Timezone label — the account view also renders the language switcher, so
    // there is more than one combobox on the page.
    const timezoneLabel = await screen.findByText('Timezone');
    const timezone = timezoneLabel.parentElement.querySelector('select');
    expect(timezone).toHaveValue('Europe/London');
  });
});
