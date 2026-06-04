import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResetPasswordScreen } from './reset-password-screen';

const setup = (props = {}) =>
  render(<ResetPasswordScreen token="tok-123" onSubmit={vi.fn()} onBackToSignIn={vi.fn()} {...props} />);

describe('ResetPasswordScreen', () => {
  it('shows the form when a token is present', () => {
    setup();
    expect(screen.getByLabelText('New password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update password/i })).toBeDisabled();
  });

  it('shows a missing-token error when no token is supplied', () => {
    setup({ token: '' });
    expect(screen.getByRole('alert')).toHaveTextContent(/missing its token/i);
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
  });

  it('enables submit only when password is valid and confirmed', async () => {
    const user = userEvent.setup();
    setup();
    const submit = screen.getByRole('button', { name: /update password/i });
    await user.type(screen.getByLabelText('New password'), 'short');
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(submit).toBeDisabled();

    await user.clear(screen.getByLabelText('New password'));
    await user.type(screen.getByLabelText('New password'), 'longenough1');
    await user.type(screen.getByLabelText('Confirm new password'), 'different');
    expect(screen.getByText(/don't match/i)).toBeInTheDocument();
    expect(submit).toBeDisabled();

    await user.clear(screen.getByLabelText('Confirm new password'));
    await user.type(screen.getByLabelText('Confirm new password'), 'longenough1');
    expect(submit).toBeEnabled();
  });

  it('submits the token + new password and shows the success state', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue('Password updated.');
    setup({ onSubmit });
    await user.type(screen.getByLabelText('New password'), 'longenough1');
    await user.type(screen.getByLabelText('Confirm new password'), 'longenough1');
    await user.click(screen.getByRole('button', { name: /update password/i }));
    expect(onSubmit).toHaveBeenCalledWith('tok-123', 'longenough1');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/password updated/i));
  });

  it('surfaces a server error without leaving the form', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error('This reset link is invalid or has expired.'));
    setup({ onSubmit });
    await user.type(screen.getByLabelText('New password'), 'longenough1');
    await user.type(screen.getByLabelText('Confirm new password'), 'longenough1');
    await user.click(screen.getByRole('button', { name: /update password/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/invalid or has expired/i));
  });

  it('calls onBackToSignIn from the back link', async () => {
    const user = userEvent.setup();
    const onBackToSignIn = vi.fn();
    setup({ onBackToSignIn });
    await user.click(screen.getByRole('button', { name: /back to sign in/i }));
    expect(onBackToSignIn).toHaveBeenCalled();
  });
});
