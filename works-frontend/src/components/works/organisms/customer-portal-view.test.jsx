import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomerPortalView } from './customer-portal-view';
import { api } from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({
  api: { send: vi.fn(), raw: vi.fn() },
}));

describe('CustomerPortalView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.send.mockResolvedValue([]);
    api.raw.mockResolvedValue({ ok: false, status: 401, json: async () => ({ message: 'Invalid email or password.' }) });
  });

  it('renders the portal sign-in by default', () => {
    render(<CustomerPortalView subdomain="acme" />);
    expect(screen.getByRole('heading', { name: /Customer Portal/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign in/i })).toBeInTheDocument();
  });

  it('toggles to the registration form', async () => {
    const user = userEvent.setup();
    render(<CustomerPortalView subdomain="acme" />);
    await user.click(screen.getByRole('button', { name: /Create an account/i }));
    expect(screen.getByRole('button', { name: /Create account/i })).toBeInTheDocument();
  });

  it('shows the authenticated portal after a successful sign in', async () => {
    const user = userEvent.setup();
    api.raw.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: 'portal-jwt',
        account: { email: 'jane@acme.test' },
        organization: { name: 'Acme Power' },
      }),
    });
    render(<CustomerPortalView subdomain="acme" />);
    await user.click(screen.getByRole('button', { name: /^Sign in$/i }));
    expect(await screen.findByRole('heading', { name: /Acme Power/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /My requests/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Knowledge base/i })).toBeInTheDocument();
    expect(await screen.findByText(/No requests yet/i)).toBeInTheDocument();
  });

  it('surfaces a sign-in error toast on bad credentials', async () => {
    const user = userEvent.setup();
    const onToast = vi.fn();
    render(<CustomerPortalView subdomain="acme" onToast={onToast} />);
    await user.click(screen.getByRole('button', { name: /^Sign in$/i }));
    expect(onToast).toHaveBeenCalledWith('Invalid email or password.', 'error');
  });
});
