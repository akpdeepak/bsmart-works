import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CustomerPortal from './CustomerPortal';

describe('CustomerPortal', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows the login screen when there is no portal session', () => {
    render(<CustomerPortal />);
    expect(screen.getByRole('heading', { name: /customer portal/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders the account shell when a session is present', () => {
    localStorage.setItem('bSmartPortalSession', JSON.stringify({
      token: 'fake.jwt.token',
      customer: { id: 'CU-1', displayName: 'Asha' },
      account: { name: 'AMR Utilities', tier: 'PLATINUM', primaryColor: '#0E7C5E' },
    }));
    render(<CustomerPortal />);
    expect(screen.getByText('AMR Utilities')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new request/i })).toBeInTheDocument();
  });
});
