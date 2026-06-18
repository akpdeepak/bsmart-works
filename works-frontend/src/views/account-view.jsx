import { KeyRound } from 'lucide-react';
import { PageLayout } from '@/components/works/templates/page-layout';
import { Button } from '@/components/works/button';
import { Avatar } from '@/components/works/atoms/avatar';
import { LanguageSwitcher } from '@/components/works/organisms/language-switcher';

// Personal account surface — MFA enrollment, notification prefs, language. Tier VIEWER (1) so
// every workspace member can reach it via the user menu, unlike the admin-only workspace view.
export default function AccountView({
  currentUser, notifPrefs, mfaSetup, mfaSetupCode, mfaSetupMsg,
  setMfaSetup, setMfaSetupCode, saveNotifPrefs, handleMfaEnroll, handleMfaConfirm,
}) {
  return (
    <PageLayout title="My Account" description="Personal settings and security">

      {/* Profile */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 mb-6">
        <h2 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Profile</h2>
        <div className="flex items-center gap-4">
          <Avatar name={currentUser?.fullName} size={12} />
          <div>
            <p className="font-medium text-neutral-900 dark:text-neutral-100">{currentUser?.fullName}</p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{currentUser?.email}</p>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 mb-6">
        <h2 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Notification Preferences</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">Control what notifies you</p>
        {[
          { key: 'notifyAssign',  label: 'Assigned to a work item' },
          { key: 'notifyComment', label: 'New comment on my items' },
          { key: 'notifyMention', label: '@mentioned in a comment' },
          { key: 'emailDigest',   label: 'Daily email digest' },
        ].map(pref => (
          <label key={pref.key} className="flex items-center justify-between py-2.5 border-b border-neutral-100 dark:border-neutral-700 last:border-0 cursor-pointer">
            <span className="text-sm text-neutral-700 dark:text-neutral-300">{pref.label}</span>
            <input type="checkbox" checked={notifPrefs?.[pref.key] ?? false}
              onChange={e => saveNotifPrefs({ ...notifPrefs, [pref.key]: e.target.checked })}
              className="w-4 h-4 accent-brand-navy" />
          </label>
        ))}
      </div>

      {/* Two-Factor Authentication */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 mb-6">
        <h2 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Two-Factor Authentication (TOTP)</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
          Secure your account with an authenticator app (Google Authenticator, Authy, etc.)
        </p>
        {!mfaSetup ? (
          <Button variant="secondary" onClick={handleMfaEnroll}>
            <KeyRound className="inline-block h-4 w-4 mr-1.5 align-text-bottom" aria-hidden="true" />
            Set up authenticator app
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
              <p className="text-xs font-semibold text-neutral-600 mb-2">1. Scan this QR code with your authenticator app</p>
              <div className="bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded p-3 text-center mb-3">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(mfaSetup.otpAuthUri)}&size=160x160`}
                  alt="TOTP QR Code" className="mx-auto w-40 h-40" />
              </div>
              <p className="text-xs text-neutral-600 mb-1">Or enter this secret manually:</p>
              <code className="text-xs bg-neutral-100 dark:bg-neutral-700 dark:text-neutral-200 px-2 py-1 rounded font-mono break-all">{mfaSetup.secret}</code>
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-600 mb-2">2. Enter the 6-digit code to confirm</p>
              <div className="flex gap-2">
                <input type="text" inputMode="numeric" maxLength={6} placeholder="000000"
                  value={mfaSetupCode} onChange={e => setMfaSetupCode(e.target.value.replace(/\D/g, ''))}
                  className="input w-32 text-center tracking-widest text-lg font-mono" />
                <Button variant="action" onClick={handleMfaConfirm} disabled={mfaSetupCode.length !== 6}>
                  Activate MFA
                </Button>
                <Button variant="secondary" onClick={() => { setMfaSetup(null); setMfaSetupCode(''); }}>
                  Cancel
                </Button>
              </div>
              {mfaSetupMsg && <p className="text-xs text-semantic-danger mt-2">{mfaSetupMsg}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Language & Region */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
        <h2 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Language &amp; Region</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">Choose your preferred display language</p>
        <LanguageSwitcher />
      </div>
    </PageLayout>
  );
}
