// AI Control — the workspace AI settings surface (mockup 09; AI Control Plane, RB-40 §2).
// One policy hierarchy, one budget, one audit trail, one fallback contract — surfaced over the
// existing AiController. Reads need workspace membership; changing policies/budget and reading the
// audit log need `manage_ai` (gated here AND enforced server-side). All HTTP goes through aiClient →
// apiClient (CLAUDE.md §3). Tokens only, five interactive states, WCAG-AA (RB-30). Only controls
// with a real endpoint are interactive; tiering + data-boundary are surfaced as honest read-only
// notes (no faked settings).

import { useState, useEffect, useCallback } from 'react';
import {
  Sparkles, ToggleRight, Gauge, History, RefreshCw, Lock, ShieldCheck, PowerOff, Layers,
} from 'lucide-react';
import { Button } from '@/components/works/button';
import { aiClient } from '@/lib/ai';

const inr = new Intl.NumberFormat('en-IN');
const rupees = (cents) => `₹${inr.format(Math.round((cents || 0) / 100))}`;
const TIER_LABEL = { HAIKU: 'Haiku · fast', SONNET: 'Sonnet · balanced', OPUS: 'Opus · best' };

// Accessible on/off switch. No Toggle atom exists yet — kept local; promote to atoms/ when a second
// caller appears.
function Switch({ checked, disabled, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full',
        'transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-2',
        checked ? 'bg-semantic-success' : 'bg-neutral-300 dark:bg-neutral-600',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-[120ms]',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  );
}

function Card({ title, subtitle, icon, action, children }) {
  return (
    <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-5">
      <header className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-2.5 min-w-0">
          {icon && <span className="text-brand-navy dark:text-neutral-300 mt-0.5" aria-hidden="true">{icon}</span>}
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
            {subtitle && <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function AiSettingsPanel({ workspaceId, can, onToast }) {
  const isAdmin = typeof can === 'function' ? can('manage_ai') : false;
  const notify = useCallback((msg, type) => onToast?.(msg, type), [onToast]);

  const [caps, setCaps] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [budget, setBudget] = useState(null);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingMaster, setSavingMaster] = useState(false);
  const [savingCap, setSavingCap] = useState(null);
  const [capInput, setCapInput] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);
  const [settings, setSettings] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const load = useCallback((ref) => {
    if (!workspaceId) return;
    const live = () => !ref || ref.alive;
    const calls = [aiClient.capabilities(workspaceId), aiClient.policies(workspaceId), aiClient.budget(workspaceId), aiClient.settings(workspaceId)];
    if (isAdmin) calls.push(aiClient.auditLog(workspaceId, 0, 50));
    Promise.all(calls)
      .then(([c, p, b, s, a]) => {
        if (!live()) return;
        setCaps(Array.isArray(c) ? c : []);
        setPolicies(Array.isArray(p) ? p : []);
        setBudget(b || null);
        setSettings(s || null);
        setAudit(a?.items || []);
        setError(null);
      })
      .catch((e) => { if (live()) setError(e.message || 'Could not load AI settings.'); })
      .finally(() => { if (live()) setLoading(false); });
  }, [workspaceId, isAdmin]);

  useEffect(() => {
    const ref = { alive: true };
    load(ref);
    return () => { ref.alive = false; };
  }, [load]);

  const refresh = useCallback(() => { setLoading(true); setError(null); load(); }, [load]);

  // Master AI = the WORKSPACE-scope policy; absent ⇒ on by default (resolve is most-restrictive-wins).
  const wsPolicy = policies.find((p) => String(p.scopeType).toUpperCase() === 'WORKSPACE');
  const masterEnabled = wsPolicy ? wsPolicy.enabled : true;

  const tier = settings?.defaultModelTier || 'SONNET';
  const blockPii = settings?.blockPii ?? true;
  const blockFinancial = settings?.blockFinancial ?? true;

  const saveSettings = useCallback((patch) => {
    const base = settings || { defaultModelTier: 'SONNET', blockPii: true, blockFinancial: true };
    const next = { defaultModelTier: base.defaultModelTier, blockPii: base.blockPii, blockFinancial: base.blockFinancial, ...patch };
    setSettings(next); // optimistic (§4.16)
    setSavingSettings(true);
    aiClient.setSettings(workspaceId, next)
      .then((saved) => { if (saved) setSettings(saved); })
      .catch((e) => { setSettings(base); notify(e.message || 'Could not update AI settings.', 'error'); })
      .finally(() => setSavingSettings(false));
  }, [workspaceId, settings, notify]);

  const toggleMaster = useCallback((next) => {
    setSavingMaster(true);
    aiClient.setPolicy(workspaceId, { scopeType: 'WORKSPACE', capability: null, userId: null, enabled: next })
      .then(() => { notify(next ? 'AI enabled for the workspace.' : 'AI disabled — fallbacks now serve every surface.', 'success'); load(); })
      .catch((e) => notify(e.message || 'Could not update the workspace AI policy.', 'error'))
      .finally(() => setSavingMaster(false));
  }, [workspaceId, notify, load]);

  const toggleCapability = useCallback((cap, next) => {
    const prev = caps;
    setCaps((cs) => cs.map((c) => (c.id === cap.id ? { ...c, enabled: next } : c))); // optimistic (§4.16)
    setSavingCap(cap.id);
    aiClient.setPolicy(workspaceId, { scopeType: 'CAPABILITY', capability: cap.id, userId: null, enabled: next })
      .catch((e) => { setCaps(prev); notify(e.message || `Could not update ${cap.label}.`, 'error'); })
      .finally(() => setSavingCap(null));
  }, [caps, workspaceId, notify]);

  const saveBudget = useCallback((e) => {
    e.preventDefault();
    const rupeesVal = Number(capInput);
    if (!Number.isFinite(rupeesVal) || rupeesVal < 0) { notify('Enter a valid monthly cap.', 'error'); return; }
    setSavingBudget(true);
    aiClient.setBudget(workspaceId, Math.round(rupeesVal * 100))
      .then(() => { notify('Monthly AI budget updated.', 'success'); setCapInput(''); load(); })
      .catch((err) => notify(err.message || 'Could not update the budget.', 'error'))
      .finally(() => setSavingBudget(false));
  }, [capInput, workspaceId, notify, load]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl" aria-busy="true" aria-label="Loading AI settings">
        <div className="h-8 w-48 rounded-md bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
        {[0, 1, 2].map((i) => <div key={i} className="h-40 rounded-lg bg-neutral-100 dark:bg-neutral-800 animate-pulse" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl bg-white dark:bg-neutral-900 border border-semantic-danger/30 rounded-lg p-6 text-center">
        <PowerOff className="h-10 w-10 text-semantic-danger mx-auto mb-3" aria-hidden="true" />
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-1">AI settings unavailable</h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">{error}</p>
        <Button variant="secondary" size="sm" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={refresh}>Retry</Button>
      </div>
    );
  }

  const pct = budget?.percent ?? 0;
  const barTone = budget?.disabled ? 'bg-semantic-danger' : budget?.degraded ? 'bg-semantic-warning' : 'bg-brand-navy';

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">AI Control</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            One policy hierarchy, one budget, one audit trail — for every AI surface in this workspace.
          </p>
        </div>
        <Button variant="secondary" size="sm" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={refresh}>Refresh</Button>
      </div>

      {!isAdmin && (
        <p className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 rounded-md px-3 py-2">
          <Lock className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          You can view the AI configuration. Changing policies or the budget, and seeing the audit log, needs the <span className="font-semibold">manage&nbsp;AI</span> permission.
        </p>
      )}

      {/* Master toggle */}
      <Card
        title="AI features for this workspace"
        subtitle={masterEnabled
          ? 'AI assists appear across Works. Turn off to run fully deterministic — every surface serves its fallback.'
          : 'AI is off. Every surface runs its deterministic fallback and the AI button is hidden.'}
        icon={<Sparkles className="h-5 w-5 text-brand-orange" />}
        action={(
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${masterEnabled ? 'text-semantic-success' : 'text-neutral-600 dark:text-neutral-400'}`}>
              {savingMaster ? 'Saving…' : masterEnabled ? 'Enabled' : 'Disabled'}
            </span>
            <Switch checked={masterEnabled} disabled={!isAdmin || savingMaster} onChange={toggleMaster} label="AI features for this workspace" />
          </div>
        )}
      >
        <p className="text-xs text-neutral-600 dark:text-neutral-400">
          The most restrictive scope wins: off here means off for every capability and every member, regardless of their own settings.
        </p>
      </Card>

      {/* Per-capability */}
      <Card title="AI by capability" subtitle="Keep AI on overall but turn it off for specific capabilities." icon={<ToggleRight className="h-5 w-5" />}>
        {caps.length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">No AI capabilities are registered for this workspace.</p>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {caps.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{c.label}</p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    Default tier: {TIER_LABEL[c.defaultTier] || c.defaultTier || '—'}
                  </p>
                </div>
                <Switch
                  checked={c.enabled}
                  disabled={!isAdmin || !masterEnabled || savingCap === c.id}
                  onChange={(next) => toggleCapability(c, next)}
                  label={c.label}
                />
              </li>
            ))}
          </ul>
        )}
        {!masterEnabled && (
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-3">Master AI is off, so every capability is disabled regardless of its own setting.</p>
        )}
      </Card>

      {/* Budget */}
      <Card
        title="Monthly AI budget"
        subtitle="A hard cap on AI spend. At 80% Works degrades to a cheaper model tier; at 100% AI auto-disables and fallbacks take over."
        icon={<Gauge className="h-5 w-5" />}
      >
        {!budget ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">No budget configured for this workspace.</p>
        ) : (
          <>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {rupees(budget.spentCents)} <span className="font-normal text-neutral-600 dark:text-neutral-400">used of {rupees(budget.capCents)}</span>
              </span>
              <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">{budget.period}</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden"
              role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="AI budget used">
              <div className={`h-full rounded-full transition-all ${barTone}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2">
              {pct}% consumed{budget.disabled ? ' · AI disabled for this month — fallbacks active' : budget.degraded ? ' · degraded to the cheaper tier' : ' · on track'}.
            </p>
            {isAdmin && (
              <form onSubmit={saveBudget} className="flex items-end gap-2 mt-4">
                <div>
                  <label htmlFor="ai-budget-cap" className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">New monthly cap (₹)</label>
                  <input
                    id="ai-budget-cap" type="number" min="0" step="100" inputMode="numeric"
                    value={capInput} onChange={(e) => setCapInput(e.target.value)}
                    placeholder={String(Math.round((budget.capCents || 0) / 100))}
                    className="w-40 text-sm border border-neutral-200 dark:border-neutral-700 rounded-md px-2 py-1.5 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
                  />
                </div>
                <Button type="submit" variant="primary" size="sm" loading={savingBudget}>Update cap</Button>
              </form>
            )}
          </>
        )}
      </Card>

      {/* Default model tier */}
      <Card title="Default model tier" subtitle="Used as the default when a capability doesn't pin its own tier; the budget can still force the cheaper tier at 80% spend." icon={<Layers className="h-5 w-5" />}>
        <div className="flex flex-wrap gap-2">
          {[['HAIKU', 'Haiku · fast'], ['SONNET', 'Sonnet · balanced'], ['OPUS', 'Opus · best']].map(([id, label]) => (
            <button
              key={id} type="button" disabled={!isAdmin || savingSettings} aria-pressed={tier === id}
              onClick={() => saveSettings({ defaultModelTier: id })}
              className={[
                'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors duration-[120ms]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-1',
                tier === id
                  ? 'border-brand-navy bg-brand-navy text-white'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
                (!isAdmin || savingSettings) ? 'cursor-not-allowed opacity-50' : '',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      {/* Data boundary */}
      <Card title="Data boundary" subtitle="Restrict what data may be sent to the AI provider — enforced server-side before any model call (RB-40 §2/§4)." icon={<ShieldCheck className="h-5 w-5" />}>
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
          <li className="flex items-center justify-between gap-4 py-3">
            <p className="min-w-0 text-sm font-medium text-neutral-900 dark:text-neutral-100">Block customer PII from AI</p>
            <Switch checked={blockPii} disabled={!isAdmin || savingSettings} onChange={(next) => saveSettings({ blockPii: next })} label="Block customer PII from AI" />
          </li>
          <li className="flex items-center justify-between gap-4 py-3">
            <p className="min-w-0 text-sm font-medium text-neutral-900 dark:text-neutral-100">Block financial / billing data from AI</p>
            <Switch checked={blockFinancial} disabled={!isAdmin || savingSettings} onChange={(next) => saveSettings({ blockFinancial: next })} label="Block financial / billing data from AI" />
          </li>
        </ul>
      </Card>

      {/* Deterministic fallbacks */}
      <Card
        title="What runs when AI is off"
        subtitle="Every capability has a deterministic fallback, so Works stays fully functional with AI disabled or over budget."
        icon={<ShieldCheck className="h-5 w-5" />}
      >
        {caps.length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">No capabilities to describe.</p>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
            {caps.map((c) => (
              <li key={c.id} className="text-sm text-neutral-700 dark:text-neutral-300">
                <span className="font-medium text-neutral-900 dark:text-neutral-100">{c.label}:</span> {c.fallback}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Audit log (admin only) */}
      {isAdmin && (
        <Card
          title="AI usage audit"
          subtitle="Every invocation is logged — capability, model tier, cost, and whether a cache hit or fallback served it."
          icon={<History className="h-5 w-5" />}
        >
          {audit.length === 0 ? (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">No AI has been invoked in this workspace yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-700">
                    <th scope="col" className="py-2 pr-3">When</th>
                    <th scope="col" className="py-2 pr-3">Capability</th>
                    <th scope="col" className="py-2 pr-3">Tier</th>
                    <th scope="col" className="py-2 pr-3 text-right">Cost</th>
                    <th scope="col" className="py-2">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {audit.map((inv) => (
                    <tr key={inv.id} className="even:bg-neutral-50 dark:even:bg-neutral-800/40">
                      <td className="py-2 pr-3 font-mono text-xs text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                        {inv.createdAt ? new Date(inv.createdAt).toLocaleString() : '—'}
                      </td>
                      <td className="py-2 pr-3 text-neutral-900 dark:text-neutral-100">{inv.capability || '—'}</td>
                      <td className="py-2 pr-3 text-neutral-700 dark:text-neutral-300">{(TIER_LABEL[inv.modelTier] || inv.modelTier || '—').split(' · ')[0]}</td>
                      <td className="py-2 pr-3 text-right font-mono text-xs text-neutral-700 dark:text-neutral-300">{rupees(inv.costCents)}</td>
                      <td className="py-2">
                        {inv.fallbackUsed
                          ? <span className="text-xs font-semibold text-semantic-warning">fallback</span>
                          : inv.cacheHit
                            ? <span className="text-xs font-semibold text-semantic-info">cached</span>
                            : <span className="text-xs text-neutral-600 dark:text-neutral-400">AI</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

export default AiSettingsPanel;
