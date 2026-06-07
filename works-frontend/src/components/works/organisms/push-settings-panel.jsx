import * as React from 'react';
import { BellRing, MoonStar } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/works/atoms/skeleton';

// Organism (iteration 18, Cap S — push notifications). Per-user delivery preferences: a master push
// toggle, per-event-type toggles, a quiet-hours window, snooze, and the "P0 overrides quiet hours"
// on-call safety valve. Reads/writes /push/preferences via the apiClient. Tokens only, labelled
// controls (WCAG-AA), honest empty/loading/error states.
const EVENT_TYPES = [
  ['notifyAssign', 'Assigned to me'],
  ['notifyMention', 'Mentions'],
  ['notifyComment', 'Comments'],
  ['notifyStatusChange', 'Status changes'],
  ['notifySlaBreach', 'SLA breaches'],
  ['notifyAutomation', 'Automation runs'],
];

export function PushSettingsPanel({ onSaved }) {
  const [prefs, setPrefs] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    api
      .send('/push/preferences')
      .then((d) => setPrefs(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  function set(key, value) {
    setPrefs((p) => ({ ...p, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const saved = await api.send('/push/preferences', { method: 'PUT', body: prefs });
      setPrefs(saved);
      onSaved?.(saved);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  function snooze(hours) {
    set('snoozeUntil', hours == null ? null : new Date(Date.now() + hours * 3600_000).toISOString());
  }

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (error && !prefs) {
    return <p className="text-sm text-semantic-danger">Couldn’t load notification preferences. Try again later.</p>;
  }

  const snoozed = prefs.snoozeUntil && new Date(prefs.snoozeUntil) > new Date();

  return (
    <div className="space-y-6">
      <Toggle
        id="push-enabled"
        Icon={BellRing}
        label="Push notifications"
        hint="Get real-time alerts on this device."
        checked={prefs.pushEnabled}
        onChange={(v) => set('pushEnabled', v)}
      />

      <fieldset disabled={!prefs.pushEnabled} className={cn(!prefs.pushEnabled && 'opacity-50')}>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-600">
          Notify me about
        </legend>
        <div className="space-y-2">
          {EVENT_TYPES.map(([key, label]) => (
            <Toggle key={key} id={`pt-${key}`} label={label} checked={prefs[key]} onChange={(v) => set(key, v)} />
          ))}
        </div>
      </fieldset>

      <fieldset disabled={!prefs.pushEnabled} className={cn('space-y-3', !prefs.pushEnabled && 'opacity-50')}>
        <legend className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-600">
          <MoonStar aria-hidden="true" className="h-3.5 w-3.5" /> Quiet hours
        </legend>
        <Toggle
          id="quiet-enabled"
          label="Mute non-critical pushes during set hours"
          checked={prefs.quietHoursEnabled}
          onChange={(v) => set('quietHoursEnabled', v)}
        />
        {prefs.quietHoursEnabled && (
          <div className="flex items-center gap-3 text-sm">
            <HourInput id="quiet-start" label="From" value={prefs.quietHoursStart} onChange={(v) => set('quietHoursStart', v)} />
            <HourInput id="quiet-end" label="To" value={prefs.quietHoursEnd} onChange={(v) => set('quietHoursEnd', v)} />
          </div>
        )}
        <Toggle
          id="p0-override"
          label="Always alert me for P0 / critical events (overrides quiet hours)"
          checked={prefs.p0OverrideQuiet}
          onChange={(v) => set('p0OverrideQuiet', v)}
        />
      </fieldset>

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Snooze</p>
        <div className="flex flex-wrap gap-2">
          <SnoozeBtn label="1 hour" onClick={() => snooze(1)} />
          <SnoozeBtn label="Until tomorrow" onClick={() => snooze(8)} />
          <SnoozeBtn label="Off" active={!snoozed} onClick={() => snooze(null)} />
        </div>
        {snoozed && (
          <p className="text-xs text-neutral-500">Snoozed until {new Date(prefs.snoozeUntil).toLocaleString()}.</p>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-md bg-brand-navy px-4 py-2 text-sm font-medium text-white transition-colors duration-fast hover:bg-brand-navy-tint focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-2 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save preferences'}
        </button>
      </div>
    </div>
  );
}

function Toggle({ id, label, hint, checked, onChange, Icon }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="flex items-start gap-2 text-sm">
        {Icon && <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 text-neutral-500" />}
        <span>
          <label htmlFor={id} className="cursor-pointer text-neutral-900 dark:text-neutral-100">{label}</label>
          {hint && <span className="block text-xs text-neutral-500">{hint}</span>}
        </span>
      </span>
      <input
        id={id}
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-brand-navy focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-2"
      />
    </div>
  );
}

function HourInput({ id, label, value, onChange }) {
  return (
    <span className="flex items-center gap-1 text-neutral-700 dark:text-neutral-300">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        min="0"
        max="23"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-16 rounded-sm border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-600 dark:bg-neutral-800"
      />
      <span className="text-xs text-neutral-500">:00</span>
    </span>
  );
}

function SnoozeBtn({ label, onClick, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-fast active:translate-y-px',
        'focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-2',
        active
          ? 'bg-brand-navy text-white'
          : 'border border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800',
      )}
    >
      {label}
    </button>
  );
}
