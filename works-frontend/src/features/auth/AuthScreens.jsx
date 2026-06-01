import React from 'react';
import { api } from '@/lib/apiClient';
import { Button } from '@/components/works/button';
import { Logo } from '@/components/works/logo';
import { Field } from '@/components/works/ui';

export function AuthScreens({
  authMode, setAuthMode, authForm, setAuthForm, authError, setAuthError,
  showPassword, setShowPassword, confirmEmail, setConfirmEmail, confirmPassword, setConfirmPassword,
  forgotMode, setForgotMode, forgotEmail, setForgotEmail, forgotMsg, setForgotMsg,
  verifyPending, setVerifyPending, verifyMsg, setVerifyMsg,
  mfaChallenge, setMfaChallenge, mfaCode, setMfaCode, mfaError,
  handleAuthSubmit, handleVerifyEmail, handleMfaVerify, handleForgotPassword,
}) {
  if (verifyPending) return (
    <div className="flex h-screen bg-neutral-100 dark:bg-neutral-900 items-center justify-center font-sans">
      <div className="bg-white dark:bg-neutral-800 p-8 rounded-xl shadow-xl w-96 border border-neutral-200 dark:border-neutral-700">
        <div className="flex justify-center mb-6"><Logo /></div>
        <div className="w-14 h-14 rounded-full bg-semantic-success/10 flex items-center justify-center text-2xl mx-auto mb-4">📧</div>
        <h2 className="text-xl font-bold text-brand-navy text-center mb-2">Check your email</h2>
        <p className="text-sm text-neutral-500 text-center mb-5">
          We sent a verification link to <strong>{verifyPending.email}</strong>.<br/>
          Click it to activate your account.
        </p>
        {verifyMsg && <p className="text-sm text-semantic-danger text-center mb-3">{verifyMsg}</p>}
        {verifyPending.devToken && (
          <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 mb-4">
            <p className="text-[10px] text-neutral-400 uppercase tracking-wider mb-1">UAT — One-click verify</p>
            <button onClick={() => handleVerifyEmail(verifyPending.devToken)}
              className="w-full py-2 bg-brand-navy text-white rounded-lg text-sm font-semibold hover:bg-brand-navy/90 transition-colors">
              ✓ Verify my email (UAT shortcut)
            </button>
            <p className="text-[10px] text-neutral-400 mt-2 text-center">In production this arrives by email</p>
          </div>
        )}
        <button onClick={() => { setVerifyPending(null); setAuthMode('login'); }}
          className="w-full text-center text-sm text-neutral-400 hover:text-brand-navy transition-colors">
          ← Back to sign in
        </button>
      </div>
    </div>
  );

  if (mfaChallenge) return (
    <div className="flex h-screen bg-neutral-100 dark:bg-neutral-900 items-center justify-center font-sans">
      <div className="bg-white dark:bg-neutral-800 p-8 rounded-xl shadow-xl w-96 border border-neutral-200 dark:border-neutral-700">
        <div className="flex justify-center mb-6"><Logo /></div>
        <div className="w-14 h-14 rounded-full bg-brand-navy/10 flex items-center justify-center text-2xl mx-auto mb-4">🔐</div>
        <h2 className="text-xl font-bold text-brand-navy text-center mb-2">Two-factor authentication</h2>
        <p className="text-sm text-neutral-500 text-center mb-5">Enter the 6-digit code from your authenticator app.</p>
        {mfaError && <p className="text-sm text-semantic-danger text-center mb-3">{mfaError}</p>}
        <input type="text" inputMode="numeric" maxLength={6} placeholder="000000"
          value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/\D/g,''))}
          onKeyDown={e => e.key === 'Enter' && mfaCode.length === 6 && handleMfaVerify()}
          className="input text-center text-2xl tracking-widest mb-4" autoFocus />
        <Button variant="action" fullWidth onClick={handleMfaVerify} disabled={mfaCode.length !== 6}>Verify Code</Button>
        <button onClick={() => { setMfaChallenge(null); setMfaCode(''); }}
          className="w-full mt-3 text-center text-sm text-neutral-400 hover:text-brand-navy transition-colors">
          ← Back to sign in
        </button>
      </div>
    </div>
  );

  if (forgotMode) return (
    <div className="flex h-screen bg-neutral-100 dark:bg-neutral-900 items-center justify-center font-sans">
      <div className="bg-white dark:bg-neutral-800 p-8 rounded-xl shadow-xl w-96 border border-neutral-200 dark:border-neutral-700">
        <div className="flex justify-center mb-6"><Logo /></div>
        <h2 className="text-xl font-bold text-brand-navy text-center mb-4">Reset Password</h2>
        {forgotMsg
          ? <div className="text-semantic-success bg-semantic-success-surface p-3 rounded text-sm text-center mb-4">{forgotMsg}</div>
          : <form onSubmit={handleForgotPassword} className="space-y-4">
              <input type="email" required placeholder="Your email address" value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)} className="input" />
              <Button type="submit" fullWidth>Send Reset Link</Button>
            </form>
        }
        <div className="mt-4 text-center">
          <button onClick={() => { setForgotMode(false); setForgotMsg(''); }}
            className="text-brand-orange text-sm font-bold hover:underline">← Back to Sign In</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-neutral-100 dark:bg-neutral-900 items-center justify-center font-sans">
      <div className="bg-white dark:bg-neutral-800 p-8 rounded-xl shadow-xl w-96 border border-neutral-200 dark:border-neutral-700">
        <div className="flex justify-center mb-8"><Logo /></div>
        <h2 className="text-xl font-bold text-brand-navy text-center mb-6">
          {authMode === 'login' ? 'Sign in to your account' : 'Create your account'}
        </h2>
        {authError && <div className="bg-semantic-danger-surface text-semantic-danger text-sm p-3 rounded-md mb-4 text-center">{authError}</div>}
        <form onSubmit={handleAuthSubmit} className="space-y-4">
          {authMode === 'signup' && (
            <Field label="Full Name">
              <input type="text" required value={authForm.fullName}
                onChange={e => setAuthForm({ ...authForm, fullName: e.target.value })} className="input" autoFocus />
            </Field>
          )}
          <Field label="Email">
            <input type="email" required value={authForm.email}
              onChange={e => setAuthForm({ ...authForm, email: e.target.value })} className="input" />
          </Field>
          {authMode === 'signup' && (
            <Field label="Confirm Email">
              <input type="email" required value={confirmEmail}
                onChange={e => setConfirmEmail(e.target.value)} className="input" placeholder="Re-enter your email" />
            </Field>
          )}
          <Field label="Password">
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} required value={authForm.password}
                onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                className="input pr-10" placeholder={authMode === 'signup' ? 'Min. 8 characters' : ''} />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors text-sm select-none"
                tabIndex={-1}>
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </Field>
          {authMode === 'signup' && (
            <Field label="Confirm Password">
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} required value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="input pr-10" placeholder="Re-enter your password" />
                {confirmPassword && (
                  <span className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-sm ${confirmPassword === authForm.password ? 'text-semantic-success' : 'text-semantic-danger'}`}>
                    {confirmPassword === authForm.password ? '✓' : '✕'}
                  </span>
                )}
              </div>
            </Field>
          )}
          <Button type="submit" variant="action" fullWidth>
            {authMode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>
        {authMode === 'login' && (
          <div className="mt-3 text-center">
            <button onClick={() => setForgotMode(true)} className="text-neutral-400 text-sm hover:underline">Forgot password?</button>
          </div>
        )}
        <div className="mt-4 text-center text-sm text-neutral-600">
          {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); setShowPassword(false); setConfirmEmail(''); setConfirmPassword(''); }}
            className="text-brand-orange font-bold hover:underline">
            {authMode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </div>
      </div>
    </div>
  );
}
