import { useCallback, useEffect, useState } from 'react';
import { Cpu, ShieldCheck, Wallet, BarChart3, ScrollText, LifeBuoy, Download } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/works/atoms/badge';
import { absoluteDateTime } from '@/lib/format';

// Organism — AI Control Plane admin surface (iteration 10, Cap Z; RB-40 §2). Five tabs: Policy
// (mode + per-capability toggles + model tier + data boundary), Budget (cap + spend + 80/100
// thresholds), Usage (tokens/cost/rate), Audit (per-call invocation log + CSV), and Fallbacks (each
// capability's deterministic behavior). All HTTP via apiClient; token classes only; explicit
// loading/empty/error states; write controls hidden unless canManage — the API stays the real guard.

const TABS = [
  { id: 'policy', label: 'Policy', icon: ShieldCheck },
  { id: 'budget', label: 'Budget', icon: Wallet },
  { id: 'usage', label: 'Usage', icon: BarChart3 },
  { id: 'audit', label: 'Audit', icon: ScrollText },
  { id: 'fallbacks', label: 'Fallbacks', icon: LifeBuoy },
];

const MODES = ['ENABLED', 'OPT_IN', 'DISABLED'];
const TIERS = ['HAIKU', 'SONNET', 'OPUS'];
const CAPABILITIES = ['NL_TO_BQL', 'SUMMARIZATION'];

const BTN_PRIMARY = 'inline-flex items-center gap-2 rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-navy/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_GHOST = 'inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800';

export function AiControlPlaneView({ workspaceId, canManage = false, onToast }) {
  const [tab, setTab] = useState('policy');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const toast = useCallback((msg, type) => onToast?.(msg, type), [onToast]);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    try {
      let d;
      if (tab === 'policy') d = await api.send(`/ai/policy?workspaceId=${workspaceId}`);
      else if (tab === 'budget') d = await api.send(`/ai/budget?workspaceId=${workspaceId}`);
      else if (tab === 'usage') d = await api.send(`/ai/usage?workspaceId=${workspaceId}`);
      else if (tab === 'audit') d = await api.send(`/ai/audit?workspaceId=${workspaceId}`);
      else if (tab === 'fallbacks') d = await api.send('/ai/fallbacks');
      setData(d);
      setError(null);
    } catch (e) {
      setError(e.message || 'Could not load AI control plane.');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, tab]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  function selectTab(id) {
    if (id === tab) return;
    setLoading(true);
    setError(null);
    setData(null);
    setTab(id);
  }

  function reload() { setLoading(true); load(); }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <header className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-semantic-info-surface">
          <Cpu aria-hidden="true" className="h-5 w-5 text-semantic-info" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">AI Control Plane</h1>
          <p className="text-sm text-neutral-600">
            One policy, one budget, one audit trail — AI is opt-in, with a deterministic fallback for everything.
          </p>
        </div>
      </header>

      <div role="tablist" aria-label="AI control plane sections" className="mb-6 flex flex-wrap gap-1 border-b border-neutral-200 dark:border-neutral-700">
        {TABS.map((t) => (
          <button
            key={t.id} type="button" role="tab" aria-selected={tab === t.id}
            onClick={() => selectTab(t.id)}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40',
              tab === t.id
                ? 'border-brand-navy text-brand-navy dark:border-brand-navy-tint dark:text-neutral-50'
                : 'border-transparent text-neutral-600 hover:text-neutral-900 dark:hover:text-neutral-200'
            )}
          >
            <t.icon aria-hidden="true" className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {loading && <SkeletonRows />}
      {!loading && error && <ErrorState message={error} onRetry={reload} />}
      {!loading && !error && tab === 'policy' && (
        <PolicyTab workspaceId={workspaceId} canManage={canManage} data={data} onChanged={load} toast={toast} />
      )}
      {!loading && !error && tab === 'budget' && (
        <BudgetTab workspaceId={workspaceId} canManage={canManage} data={data} onChanged={load} toast={toast} />
      )}
      {!loading && !error && tab === 'usage' && <UsageTab data={data} />}
      {!loading && !error && tab === 'audit' && <AuditTab workspaceId={workspaceId} data={data} toast={toast} />}
      {!loading && !error && tab === 'fallbacks' && <FallbacksTab data={data} />}
    </div>
  );
}

// ── Policy ─────────────────────────────────────────────────────────────────────

function PolicyTab({ workspaceId, canManage, data, onChanged, toast }) {
  const policy = data?.policy || {};
  const boundary = data?.dataBoundary || {};
  const toggles = {};
  (data?.capabilityToggles || []).forEach((t) => { toggles[t.capability] = t.enabled; });

  async function save(path, body, msg) {
    try {
      await api.send(path, { method: 'PUT', body: JSON.stringify({ workspaceId, ...body }) });
      toast(msg, 'success');
      onChanged();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <div className="space-y-6">
      <Card title="Workspace AI policy" hint="The top of the scope hierarchy — most-restrictive-wins.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Mode">
            <select className="input" defaultValue={policy.mode || 'OPT_IN'} disabled={!canManage}
              onChange={(e) => save('/ai/policy', { mode: e.target.value, defaultModelTier: policy.defaultModelTier || 'SONNET' }, 'Policy updated')}>
              {MODES.map((m) => <option key={m} value={m}>{m.replace('_', '-')}</option>)}
            </select>
          </Field>
          <Field label="Default model tier">
            <select className="input" defaultValue={policy.defaultModelTier || 'SONNET'} disabled={!canManage}
              onChange={(e) => save('/ai/policy', { mode: policy.mode || 'OPT_IN', defaultModelTier: e.target.value }, 'Model tier updated')}>
              {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </div>
      </Card>

      <Card title="Per-capability AI" hint="Disable AI for some capabilities while enabling others.">
        <ul className="space-y-2">
          {CAPABILITIES.map((c) => (
            <li key={c} className="flex items-center justify-between rounded-md border border-neutral-200 dark:border-neutral-700 p-3">
              <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{c.replace('_', ' ')}</span>
              <ToggleButton on={toggles[c] !== false} disabled={!canManage}
                onToggle={(next) => save('/ai/policy/capabilities', { capability: c, enabled: next }, 'Capability updated')} />
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Data boundary" hint="What may leave the server to a model — enforced server-side, not in the UI.">
        <div className="space-y-2">
          <CheckRow label="Block PII (emails, phone numbers)" checked={boundary.blockPii !== false} disabled={!canManage}
            onChange={(v) => save('/ai/policy/data-boundary', { blockPii: v, blockFinancial: boundary.blockFinancial !== false }, 'Data boundary updated')} />
          <CheckRow label="Block financial (amounts, account numbers)" checked={boundary.blockFinancial !== false} disabled={!canManage}
            onChange={(v) => save('/ai/policy/data-boundary', { blockPii: boundary.blockPii !== false, blockFinancial: v }, 'Data boundary updated')} />
        </div>
      </Card>
    </div>
  );
}

// ── Budget ─────────────────────────────────────────────────────────────────────

function BudgetTab({ workspaceId, canManage, data, onChanged, toast }) {
  const [cap, setCap] = useState(data?.capAmount ?? '');
  const pct = data?.consumedPercent ?? 0;
  const state = data?.state || 'NORMAL';
  const tone = state === 'DISABLED' ? 'danger' : state === 'DEGRADED' ? 'warning' : 'success';
  const barColor = state === 'DISABLED' ? 'bg-semantic-danger' : state === 'DEGRADED' ? 'bg-semantic-warning' : 'bg-semantic-success';

  async function saveCap(e) {
    e.preventDefault();
    try {
      await api.send('/ai/budget', { method: 'PUT', body: JSON.stringify({ workspaceId, capAmount: String(cap || 0) }) });
      toast('Budget cap set', 'success');
      onChanged();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <div className="space-y-6">
      <Card title={`This month (${data?.periodMonth || ''})`}
        hint="At 80% the plane degrades to the cheap tier; at 100% AI disables and serves deterministic fallbacks.">
        <div className="mb-2 flex items-center gap-2">
          <Badge tone={tone}>{state}</Badge>
          <span className="text-sm text-neutral-600">
            {data?.currency} {Number(data?.spentAmount ?? 0).toLocaleString()} of {data?.currency} {Number(data?.capAmount ?? 0).toLocaleString()} ({pct}%)
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800" role="progressbar"
          aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="AI budget consumed">
          <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
      </Card>

      {canManage && (
        <Card title="Set monthly cap">
          <form onSubmit={saveCap} className="flex items-end gap-3">
            <Field label={`Cap (${data?.currency || 'INR'})`}>
              <input className="input" type="number" min="0" step="100" value={cap}
                onChange={(e) => setCap(e.target.value)} placeholder="50000" />
            </Field>
            <button type="submit" className={BTN_PRIMARY}>Save cap</button>
          </form>
        </Card>
      )}
    </div>
  );
}

// ── Usage ──────────────────────────────────────────────────────────────────────

function UsageTab({ data }) {
  const t = data?.totals || {};
  const cards = [
    { label: 'Calls', value: t.calls ?? 0 },
    { label: 'Tokens in', value: t.tokens_in ?? 0 },
    { label: 'Tokens out', value: t.tokens_out ?? 0 },
    { label: 'Fallback calls', value: t.fallback_calls ?? 0 },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">{c.label}</p>
            <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-50">{Number(c.value).toLocaleString()}</p>
          </div>
        ))}
      </div>
      <UsageTable title="By capability" rows={data?.byCapability} cols={['capability', 'calls', 'tokens', 'cost']} />
      <UsageTable title="By user" rows={data?.byUser} cols={['user_id', 'calls', 'tokens', 'cost']} />
    </div>
  );
}

function UsageTable({ title, rows, cols }) {
  return (
    <div>
      <h3 className="mb-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
      {(rows || []).length === 0 ? (
        <p className="text-sm text-neutral-600">No usage recorded yet.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-700 text-neutral-600">
              {cols.map((c) => <th key={c} className="py-2 font-semibold">{c.replace('_', ' ')}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-neutral-100 dark:border-neutral-800">
                {cols.map((c) => <td key={c} className="py-2 text-neutral-900 dark:text-neutral-100">{String(r[c] ?? '')}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Audit ──────────────────────────────────────────────────────────────────────

function AuditTab({ workspaceId, data, toast }) {
  const rows = Array.isArray(data) ? data : [];
  async function exportCsv() {
    try {
      const res = await api.raw(`/ai/audit/export?workspaceId=${workspaceId}`);
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'ai-audit.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast(err.message, 'error');
    }
  }
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button type="button" className={BTN_GHOST} onClick={exportCsv}>
          <Download aria-hidden="true" className="h-4 w-4" /> Export CSV
        </button>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="No AI activity yet" hint="Every AI call — including deterministic fallbacks — is logged here." />
      ) : (
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
          {rows.map((e, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2 p-3 text-sm">
              <Badge tone="neutral">{e.capability}</Badge>
              <Badge tone={e.fallback_used ? 'warning' : 'info'}>{e.model_tier}</Badge>
              <span className="text-neutral-600">{e.outcome}</span>
              <span className="ml-auto text-xs text-neutral-500">{absoluteDateTime(e.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Fallbacks ────────────────────────────────────────────────────────────────────

function FallbacksTab({ data }) {
  const rows = Array.isArray(data) ? data : [];
  return (
    <ul className="space-y-3">
      {rows.map((f) => (
        <li key={f.capability} className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="font-semibold text-neutral-900 dark:text-neutral-50">{f.label}</span>
            <Badge tone={f.mutates ? 'warning' : 'success'}>{f.mutates ? 'confirm before run' : 'read-only'}</Badge>
          </div>
          <p className="text-sm text-neutral-600">{f.deterministicBehavior}</p>
        </li>
      ))}
    </ul>
  );
}

// ── Shared building blocks ───────────────────────────────────────────────────────

function Card({ title, hint, children }) {
  return (
    <section className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
      <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
      {hint && <p className="mb-3 mt-0.5 text-sm text-neutral-600">{hint}</p>}
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
      {children}
    </label>
  );
}

function ToggleButton({ on, disabled, onToggle }) {
  return (
    <button type="button" disabled={disabled} aria-pressed={on}
      onClick={() => onToggle(!on)}
      className={cn('rounded-full px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        on ? 'bg-semantic-success-surface text-semantic-success' : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200')}>
      {on ? 'On' : 'Off'}
    </button>
  );
}

function CheckRow({ label, checked, disabled, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm text-neutral-900 dark:text-neutral-100">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-neutral-300 text-brand-navy focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40" />
      {label}
    </label>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />)}
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-lg border border-semantic-danger-surface bg-semantic-danger-surface/40 p-6 text-center">
      <p className="text-sm text-neutral-900 dark:text-neutral-100">{message}</p>
      <button type="button" onClick={onRetry} className="mt-3 text-sm font-semibold text-brand-navy hover:underline dark:text-brand-navy-tint">Try again</button>
    </div>
  );
}

function EmptyState({ title, hint }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 p-10 text-center">
      <p className="font-medium text-neutral-900 dark:text-neutral-100">{title}</p>
      <p className="mt-1 text-sm text-neutral-600">{hint}</p>
    </div>
  );
}
