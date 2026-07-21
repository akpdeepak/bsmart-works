
// AuthScreens.jsx — extracted from AppShell (TD-003 Phase 1)
// Owns all authentication state and rendering: login, signup, MFA challenge/enroll,
// forgot-password, email verification, passkey. Zero interaction with the app shell
// once the user is authenticated (calls onLogin to hand off).
import { useState } from 'react';
import {
  Mail, Check, ShieldCheck,
  Eye, EyeOff, ArrowLeft, X,
  Gauge, TrendingUp, Zap, Fingerprint,
} from 'lucide-react';
import { Button } from '@/components/works/button';
import { Logo } from '@/components/works/logo';
import { Field } from '@/components/works/field';
import { ResetPasswordScreen } from '@/components/works/reset-password-screen';
import { securityClient } from '@/lib/security';
import { authenticatePasskey, passkeysSupported } from '@/lib/passkey';

/**
 * @param {Object}   props
 * @param {Object}   props.api         - apiClient instance (lib/apiClient)
 * @param {Function} props.onLogin     - (user, token) => void — called on successful authentication
 * @param {Function} props.showToast   - (message, type) => void
 */
export function AuthScreens({ api, onLogin }) {
  const [authMode, setAuthMode]           = useState('login');
  const [authForm, setAuthForm]           = useState({ email: '', password: '', fullName: '' });
  const [authError, setAuthError]         = useState('');
  const [showPassword, setShowPassword]   = useState(false);
  const [confirmEmail, setConfirmEmail]   = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotMode, setForgotMode]       = useState(false);
  const [forgotEmail, setForgotEmail]     = useState('');
  const [forgotMsg, setForgotMsg]         = useState('');
  const [verifyPending, setVerifyPending] = useState(null); // { email, devToken }
  const [resetToken, setResetToken]       = useState(() => {
    if (!window.location.pathname.includes('reset-password')) return null;
    return new URLSearchParams(window.location.search).get('token') || '';
  });
  const [verifyMsg, setVerifyMsg]         = useState('');
  const [mfaChallenge, setMfaChallenge]   = useState(null); // { userId }
  const [mfaCode, setMfaCode]             = useState('');
  const [mfaError, setMfaError]           = useState('');

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleAuthSubmit = (e) => {
    e.preventDefault(); setAuthError('');
    if (authMode === 'signup') {
      if (authForm.email !== confirmEmail) { setAuthError('Email addresses do not match.'); return; }
      if (authForm.password !== confirmPassword) { setAuthError('Passwords do not match.'); return; }
      if (authForm.password.length < 8) { setAuthError('Password must be at least 8 characters.'); return; }
    }
    api.raw(`/auth${authMode === 'login' ? '/login' : '/signup'}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authForm)
    }).then(async res => {
      const data = await res.json();
      if (!res.ok) {
        if (data.requiresVerification) {
          setVerifyPending({ email: authForm.email, devToken: null });
          setVerifyMsg('Please verify your email before signing in. Check your inbox.');
          return;
        }
        throw new Error(data.message || data.error || 'Authentication failed');
      }
      return data;
    }).then(data => {
      if (!data) return;
      if (data.requiresVerification) {
        setVerifyPending({ email: authForm.email, devToken: data.devToken });
        setVerifyMsg('');
        return;
      }
      if (data.requiresMfa) {
        setMfaChallenge({ userId: data.userId });
        setMfaCode(''); setMfaError('');
        return;
      }
      onLogin(data.user, data.token);
    }).catch(err => setAuthError(err.message));
  };

  const handlePasskeyLogin = () => {
    setAuthError('');
    if (!authForm.email) { setAuthError('Enter your email to sign in with a passkey.'); return; }
    authenticatePasskey({
      email: authForm.email,
      begin: (email) => securityClient.beginAuthenticatePasskey(email),
      finish: (body) => securityClient.finishAuthenticatePasskey(body),
    }).then(data => {
      onLogin(data.user, data.token);
    }).catch(err => setAuthError(err.message || 'Passkey sign-in failed.'));
  };

  const handleVerifyEmail = (token) => {
    api.raw(`/auth/verify?token=${token}`)
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || 'Verification failed');
        return data;
      })
      .then(data => {
        setVerifyPending(null); setVerifyMsg('');
        onLogin(data.user, data.token);
      })
      .catch(err => setVerifyMsg(err.message));
  };

  const handleMfaVerify = () => {
    setMfaError('');
    api.raw(`/auth/mfa/verify`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: mfaChallenge.userId, totp: mfaCode })
    }).then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Invalid code');
      return data;
    }).then(data => {
      setMfaChallenge(null); setMfaCode('');
      onLogin(data.user, data.token);
    }).catch(err => setMfaError(err.message));
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    api.raw(`/auth/forgot-password`, {
      method: 'POST',
      body: JSON.stringify({ email: forgotEmail })
    }).then(r => r.json()).then(d => setForgotMsg(d.message)).catch(() => setForgotMsg('Error. Please try again.'));
  };

  const handleResetPassword = (token, newPassword) =>
    api.send(`/auth/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    }).then(d => d.message);

  const goToSignIn = () => {
    window.history.replaceState({}, '', '/');
    setResetToken(null);
    setForgotMode(false); setForgotMsg('');
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  // Password-reset link (forgot-password flow)
  if (resetToken !== null) {
    return <ResetPasswordScreen token={resetToken} onSubmit={handleResetPassword} onBackToSignIn={goToSignIn} />;
  }

  // Email verification pending screen
  if (verifyPending) return (
    <div className="flex h-screen bg-neutral-50 dark:bg-neutral-900 items-center justify-center font-sans">
      <div className="bg-white dark:bg-neutral-800 p-8 rounded-xl shadow-xl w-96 border border-neutral-200 dark:border-neutral-700">
        <div className="flex justify-center mb-6"><Logo /></div>
        <div className="h-10 w-10 rounded-xl bg-semantic-success-surface flex items-center justify-center mx-auto mb-4"><Mail className="h-5 w-5 text-semantic-success" /></div>
        <h2 className="text-xl font-bold text-brand-navy text-center mb-2">Check your email</h2>
        <p className="text-sm text-neutral-600 text-center mb-5">
          We sent a verification link to <strong>{verifyPending.email}</strong>.<br/>
          Click it to activate your account.
        </p>
        {verifyMsg && <p className="text-sm text-semantic-danger text-center mb-3">{verifyMsg}</p>}
        {/* DEV/UAT only — show token so testers can verify without email */}
        {verifyPending.devToken && (
          <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 mb-4">
            <p className="text-xs text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1">UAT — One-click verify</p>
            <button onClick={() => handleVerifyEmail(verifyPending.devToken)}
              className="w-full py-2 bg-brand-navy text-white rounded-lg text-sm font-semibold hover:bg-brand-navy/90 transition-colors">
              <Check className="inline-block h-4 w-4 mr-1 align-text-bottom" aria-hidden="true" />Verify my email (UAT shortcut)
            </button>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 text-center">In production this arrives by email</p>
          </div>
        )}
        <button onClick={() => { setVerifyPending(null); setAuthMode('login'); }}
          className="w-full text-center text-sm text-neutral-600 dark:text-neutral-400 hover:text-brand-navy transition-colors">
          <ArrowLeft className="inline-block h-4 w-4 mr-1 align-text-bottom" aria-hidden="true" />Back to sign in
        </button>
      </div>
    </div>
  );

  // MFA challenge screen
  if (mfaChallenge) return (
    <div className="flex h-screen bg-neutral-50 dark:bg-neutral-900 items-center justify-center font-sans">
      <div className="bg-white dark:bg-neutral-800 p-8 rounded-xl shadow-xl w-96 border border-neutral-200 dark:border-neutral-700">
        <div className="flex justify-center mb-6"><Logo /></div>
        <div className="h-10 w-10 rounded-xl bg-semantic-info-surface flex items-center justify-center mx-auto mb-4"><ShieldCheck className="h-5 w-5 text-semantic-info" /></div>
        <h2 className="text-xl font-bold text-brand-navy text-center mb-2">Two-factor authentication</h2>
        <p className="text-sm text-neutral-600 text-center mb-5">Enter the 6-digit code from your authenticator app.</p>
        {mfaError && <p className="text-sm text-semantic-danger text-center mb-3">{mfaError}</p>}
        <input type="text" inputMode="numeric" maxLength={6} placeholder="000000"
          value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/\D/g,''))}
          onKeyDown={e => e.key === 'Enter' && mfaCode.length === 6 && handleMfaVerify()}
          className="input text-center text-2xl tracking-widest mb-4" />
        <Button variant="action" fullWidth onClick={handleMfaVerify}
          disabled={mfaCode.length !== 6}>Verify Code</Button>
        <button onClick={() => { setMfaChallenge(null); setMfaCode(''); }}
          className="w-full mt-3 text-center text-sm text-neutral-600 dark:text-neutral-400 hover:text-brand-navy transition-colors">
          <ArrowLeft className="inline-block h-4 w-4 mr-1 align-text-bottom" aria-hidden="true" />Back to sign in
        </button>
      </div>
    </div>
  );

  // Forgot password screen
  if (forgotMode) return (
    <div className="flex h-screen bg-neutral-50 dark:bg-neutral-900 items-center justify-center font-sans">
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
            className="text-brand-orange text-sm font-bold hover:underline"><ArrowLeft className="inline-block h-4 w-4 mr-1 align-text-bottom" aria-hidden="true" />Back to Sign In</button>
        </div>
      </div>
    </div>
  );

  // Main login / signup screen
  return (
    <div className="flex h-screen font-sans">
      {/* Brand canvas (mockup 01) — hero on dark; hidden below lg */}
      <div className="hidden lg:flex lg:flex-1 flex-col justify-between bg-gradient-to-br from-brand-navy to-brand-navy-tint p-12 text-white">
        <Logo variant="reverse" size="lg" />
        <div className="max-w-md">
          <h1 className="mb-4 text-4xl font-bold tracking-tight">Work, in rhythm.</h1>
          <p className="mb-8 text-base text-white/75">
            Plan, deliver, and prove it — with a project workspace built for utilities and engineering teams who run on work, not chaos.
          </p>
          <ul className="space-y-3">
            {[[ShieldCheck, 'Native compliance rules with full audit history'], [Gauge, 'Internal & external SLAs from one engine'], [TrendingUp, 'KPIs at every layer with privacy guardrails'], [Zap, 'No-code workflows, rules, and automations']].map(([Icon, label]) => (
              <li key={label} className="flex items-center gap-3 text-sm text-white/90">
                <Icon aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-brand-amber" />
                {label}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-white/45">A BCITS product · 25 years of utility-grade reliability</p>
      </div>

      {/* Auth form panel */}
      <div className="flex w-full flex-col justify-center overflow-y-auto bg-white px-8 py-12 dark:bg-neutral-900 sm:px-12 lg:w-2/5 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-navy-tint">
            {authMode === 'login' ? 'Sign in' : 'Get started'}
          </p>
          <h2 className="mb-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            {authMode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
            {authMode === 'login' ? 'Pick up where you left off.' : 'Start running your work in rhythm.'}
          </p>
          {authError && <div className="mb-4 rounded-md bg-semantic-danger-surface p-3 text-center text-sm text-semantic-danger">{authError}</div>}
          <form onSubmit={handleAuthSubmit} className="space-y-4">
          {authMode === 'signup' && (
            <Field label="Full Name">
              <input type="text" required value={authForm.fullName}
                onChange={e => setAuthForm({ ...authForm, fullName: e.target.value })} className="input" />
            </Field>
          )}
          <Field label="Email">
            <input type="email" required value={authForm.email}
              onChange={e => setAuthForm({ ...authForm, email: e.target.value })} className="input" />
          </Field>
          {authMode === 'signup' && (
            <Field label="Confirm Email">
              <input type="email" required value={confirmEmail}
                onChange={e => setConfirmEmail(e.target.value)} className="input"
                placeholder="Re-enter your email" />
            </Field>
          )}
          <Field label="Password">
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} required value={authForm.password}
                onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                className="input pr-10" placeholder={authMode === 'signup' ? 'Min. 8 characters' : ''} />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
                tabIndex={-1}>
                {showPassword
                  ? <EyeOff aria-hidden="true" className="h-4 w-4" />
                  : <Eye aria-hidden="true" className="h-4 w-4" />}
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
                    {confirmPassword === authForm.password ? <Check className="h-4 w-4" aria-label="Passwords match" /> : <X className="h-4 w-4" aria-label="Passwords do not match" />}
                  </span>
                )}
              </div>
            </Field>
          )}
          {authMode === 'login' && (
            <div className="-mt-1 flex justify-end">
              <button type="button" onClick={() => setForgotMode(true)} className="text-sm text-brand-navy-tint hover:underline">Forgot password?</button>
            </div>
          )}
          <Button type="submit" variant="primary" fullWidth>
            {authMode === 'login' ? 'Sign in' : 'Create account'}
          </Button>
        </form>
        {authMode === 'login' && passkeysSupported() && (
          <button type="button" onClick={handlePasskeyLogin}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-brand-navy-tint/40 bg-white px-3 py-2 text-sm font-semibold text-brand-navy transition-colors hover:bg-brand-navy/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-2 dark:bg-neutral-900 dark:text-neutral-100">
            <Fingerprint aria-hidden="true" className="h-4 w-4" />
            Sign in with a passkey
          </button>
        )}
        {authMode === 'login' && (
          <div className="mt-5">
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
              <span className="text-xs text-neutral-400">or continue with</span>
              <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {['Google', 'Microsoft'].map((p) => (
                <button key={p} type="button" disabled title="Single sign-on is coming soon"
                  className="cursor-not-allowed rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  {p}
                </button>
              ))}
            </div>
            <button type="button" disabled title="Single sign-on is coming soon"
              className="mt-3 w-full cursor-not-allowed rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
              Sign in with SAML SSO
            </button>
            <p className="mt-2 text-center text-xs text-neutral-400">Single sign-on is coming soon — use your work email for now.</p>
          </div>
        )}
        <div className="mt-6 text-center text-sm text-neutral-600 dark:text-neutral-400">
          {authMode === 'login' ? 'New to Works? ' : 'Already have an account? '}
          <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); setShowPassword(false); setConfirmEmail(''); setConfirmPassword(''); }}
            className="font-bold text-brand-orange hover:underline">
            {authMode === 'login' ? 'Create an account' : 'Log in'}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
