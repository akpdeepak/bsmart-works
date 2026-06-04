import { useState } from 'react';
import { Logo } from '@/components/works/logo';
import { Button } from '@/components/works/button';

/**
 * Set-a-new-password screen for the forgot-password flow. Reached via the emailed
 * /reset-password?token=… link. Self-contained and prop-driven so it is unit-testable:
 *   - token            the reset token from the URL
 *   - onSubmit(token, newPassword) → Promise<string message>  (App wires this to the API)
 *   - onBackToSignIn() returns to the login screen
 */
export function ResetPasswordScreen({ token, onSubmit, onBackToSignIn }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const missingToken = !token;
  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = !submitting && password.length >= 8 && confirm === password;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(''); setSubmitting(true);
    try {
      const message = await onSubmit(token, password);
      setSuccess(message || 'Password updated. You can now sign in with your new password.');
    } catch (err) {
      setError(err.message || 'Could not reset your password. Please request a new link.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-neutral-900 items-center justify-center font-sans">
      <div className="bg-white dark:bg-neutral-800 p-8 rounded-xl shadow-xl w-96 border border-neutral-200 dark:border-neutral-700">
        <div className="flex justify-center mb-6"><Logo /></div>
        <h2 className="text-xl font-bold text-brand-navy text-center mb-4">Choose a new password</h2>

        {missingToken ? (
          <div className="text-semantic-danger bg-semantic-danger-surface p-3 rounded text-sm text-center" role="alert">
            This reset link is missing its token. Please use the link from your email, or request a new one.
          </div>
        ) : success ? (
          <div className="text-semantic-success bg-semantic-success-surface p-3 rounded text-sm text-center" role="status">
            {success}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <div className="bg-semantic-danger-surface text-semantic-danger text-sm p-3 rounded-md text-center" role="alert">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="reset-new-password" className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1">
                New password
              </label>
              <input id="reset-new-password" type="password" autoComplete="new-password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
                aria-invalid={tooShort} placeholder="Min. 8 characters" className="input" />
              {tooShort && <p className="text-xs text-semantic-danger mt-1">Password must be at least 8 characters.</p>}
            </div>
            <div>
              <label htmlFor="reset-confirm-password" className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1">
                Confirm new password
              </label>
              <input id="reset-confirm-password" type="password" autoComplete="new-password" required
                value={confirm} onChange={(e) => setConfirm(e.target.value)}
                aria-invalid={mismatch} placeholder="Re-enter your password" className="input" />
              {mismatch && <p className="text-xs text-semantic-danger mt-1">Passwords don't match.</p>}
            </div>
            <Button type="submit" variant="action" fullWidth disabled={!canSubmit}>
              {submitting ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        )}

        <button onClick={onBackToSignIn}
          className="w-full mt-4 text-center text-sm text-neutral-600 hover:text-brand-navy transition-colors">
          ← Back to sign in
        </button>
      </div>
    </div>
  );
}
