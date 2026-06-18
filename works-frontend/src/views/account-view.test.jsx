import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// I18nProvider (needed by the embedded LanguageSwitcher) persists locale via the apiClient.
vi.mock('@/lib/apiClient', () => ({ api: { send: vi.fn(() => Promise.resolve({})) } }));

import AccountView from './account-view';
import { I18nProvider } from '@/lib/i18n';

const noop = () => {};
const baseProps = {
  currentUser: { id: 'USR-1', fullName: 'Deepak Pandey', email: 'd@bcits.com' },
  notifPrefs: { notifyAssign: true, notifyComment: false, notifyMention: true, emailDigest: false },
  mfaSetup: null,
  mfaSetupCode: '',
  mfaSetupMsg: '',
  setMfaSetup: noop,
  setMfaSetupCode: noop,
  saveNotifPrefs: noop,
  handleMfaEnroll: noop,
  handleMfaConfirm: noop,
};

function renderView(overrides = {}) {
  return render(
    <I18nProvider>
      <AccountView {...baseProps} {...overrides} />
    </I18nProvider>
  );
}

// Personal settings moved here from WorkspaceView (audit finding #29) — this file carries the
// coverage those sections had in workspace-view.test.jsx.
describe('AccountView', () => {
  it('uses the sanctioned dashboard page shell', () => {
    const { container } = renderView();
    expect(container.firstChild).toHaveClass('max-w-7xl', 'px-6', 'py-6');
  });

  it('shows the profile identity and the notification preferences', () => {
    renderView();
    expect(screen.getByRole('heading', { name: 'My Account' })).toBeInTheDocument();
    expect(screen.getByText('Deepak Pandey')).toBeInTheDocument();
    expect(screen.getByText('d@bcits.com')).toBeInTheDocument();
    expect(screen.getByText('Assigned to a work item')).toBeInTheDocument();
    expect(screen.getByText('Daily email digest')).toBeInTheDocument();
  });

  it('saves a toggled notification preference with the rest unchanged', async () => {
    const saveNotifPrefs = vi.fn();
    const user = userEvent.setup();
    renderView({ saveNotifPrefs });
    await user.click(screen.getByRole('checkbox', { name: 'New comment on my items' }));
    expect(saveNotifPrefs).toHaveBeenCalledWith({
      notifyAssign: true, notifyComment: true, notifyMention: true, emailDigest: false,
    });
  });

  it('offers MFA enrollment when not yet set up', async () => {
    const handleMfaEnroll = vi.fn();
    const user = userEvent.setup();
    renderView({ handleMfaEnroll });
    const enroll = screen.getByRole('button', { name: /Set up authenticator app/ });
    await user.click(enroll);
    expect(handleMfaEnroll).toHaveBeenCalledOnce();
  });

  it('walks the MFA confirm step once enrollment starts, gating Activate on a 6-digit code', () => {
    renderView({ mfaSetup: { otpAuthUri: 'otpauth://totp/x', secret: 'ABC123SECRET' } });
    expect(screen.getByAltText('TOTP QR Code')).toBeInTheDocument();
    expect(screen.getByText('ABC123SECRET')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Activate MFA' })).toBeDisabled();
  });

  it('enables Activate with a complete code and confirms', async () => {
    const handleMfaConfirm = vi.fn();
    const user = userEvent.setup();
    renderView({
      mfaSetup: { otpAuthUri: 'otpauth://totp/x', secret: 'ABC123SECRET' },
      mfaSetupCode: '123456',
      handleMfaConfirm,
    });
    const activate = screen.getByRole('button', { name: 'Activate MFA' });
    expect(activate).toBeEnabled();
    await user.click(activate);
    expect(handleMfaConfirm).toHaveBeenCalledOnce();
  });

  it('offers the language switcher', () => {
    renderView();
    expect(screen.getByLabelText('Language')).toBeInTheDocument();
  });
});
