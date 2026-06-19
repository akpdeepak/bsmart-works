import { useCallback, useEffect, useState } from 'react';
import {
  Timer, Plus, Play, Pause, Trash2, FlaskConical, Download, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { api } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/works/atoms/badge';
import { SlaCountdownBadge } from '@/components/works/molecules/sla-countdown-badge';
import { absoluteDateTime, formatMinutes } from '@/lib/format';
import { PageLayout } from '@/components/works/templates/page-layout';

// Organism — SLA Engine surface (iteration 8, Cap M). Four tabs: Policies (define + targets +
// escalations + activate/preview), Live clocks (the visible countdowns), Report (met/breached
// rates), and Audit (the append-only event trail + CSV export). All HTTP via the apiClient;
// token classes only; every interactive element labelled; loading/empty/error states explicit
// (RB-30 §6). Writes are gated server-side by manage_sla — the UI hides write controls when
// canManage is false, but the API is the real guard (RB-40 §1, privacy enforced at the API).

const TABS = [
  { id: 'policies', label: 'Policies' },
  { id: 'clocks', label: 'Live clocks' },
  { id: 'report', label: 'Report' },
  { id: 'audit', label: 'Audit' },
];

const METRICS = ['FIRST_RESPONSE', 'RESOLUTION'];

// Shared button styles (token classes only; navy primary keeps orange reserved for the one CTA).
const BTN_PRIMARY = 'inline-flex items-center gap-2 rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-navy/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_GHOST = 'inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800';

export function SlaView({ workspaceId, canManage = false, onToast }) {
  const [tab, setTab] = useState('policies');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [calendars, setCalendars] = useState([]);
  const [clocks, setClocks] = useState([]);
  const [report, setReport] = useState(null);
  const [audit, setAudit] = useState([]);

  const toast = useCallback((msg, type) => onToast?.(msg, type), [onToast]);

  // Loader is await-first: no setState runs synchronously in the effect (react-hooks/set-state-in-effect).
  const load = useCallback(async () => {
    if (!workspaceId) return;
    try {
      if (tab === 'policies') {
        const [p, c] = await Promise.all([
          api.send(`/sla/policies?workspaceId=${workspaceId}`),
          api.send(`/sla/calendars?workspaceId=${workspaceId}`),
        ]);
        setPolicies(Array.isArray(p) ? p : []);
        setCalendars(Array.isArray(c) ? c : []);
      } else if (tab === 'clocks') {
        const d = await api.send(`/sla/instances?workspaceId=${workspaceId}`);
        setClocks(Array.isArray(d) ? d : []);
      } else if (tab === 'report') {
        setReport(await api.send(`/sla/report?workspaceId=${workspaceId}`));
      } else if (tab === 'audit') {
        const d = await api.send(`/sla/audit?workspaceId=${workspaceId}`);
        setAudit(Array.isArray(d) ? d : []);
      }
      setError(null);
    } catch (e) {
      setError(e.message || 'Could not load SLA data.');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, tab]);

  // Fetch the active tab's data on mount and whenever it changes. `load` is await-first; the
  // post-await setState is the documented data-in-effect pattern used across this app.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  // Switch tab — show the skeleton immediately (event handler: setState allowed here).
  function selectTab(id) {
    if (id === tab) return;
    setLoading(true);
    setError(null);
    setTab(id);
  }

  function reload() {
    setLoading(true);
    load();
  }

  return (
    <PageLayout header={null}>
      <header className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-semantic-info-surface">
          <Timer aria-hidden="true" className="h-5 w-5 text-semantic-info" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">SLA Engine</h1>
          <p className="text-sm text-neutral-600">
            Service-level commitments, business-hours aware — tracked, escalated, audited.
          </p>
        </div>
      </header>

      <div role="tablist" aria-label="SLA sections" className="mb-6 flex gap-1 border-b border-neutral-200 dark:border-neutral-700">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => selectTab(t.id)}
            className={cn(
              'border-b-2 px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40',
              tab === t.id
                ? 'border-brand-navy text-brand-navy dark:border-brand-navy-tint dark:text-neutral-50'
                : 'border-transparent text-neutral-600 hover:text-neutral-900 dark:hover:text-neutral-200'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <SkeletonRows />}
      {!loading && error && <ErrorState message={error} onRetry={reload} />}

      {!loading && !error && tab === 'policies' && (
        <PoliciesTab
          workspaceId={workspaceId} canManage={canManage} policies={policies}
          calendars={calendars} onChanged={load} toast={toast}
        />
      )}
      {!loading && !error && tab === 'clocks' && <ClocksTab clocks={clocks} />}
      {!loading && !error && tab === 'report' && <ReportTab report={report} />}
      {!loading && !error && tab === 'audit' && (
        <AuditTab workspaceId={workspaceId} audit={audit} toast={toast} />
      )}
    </PageLayout>
  );
}

// ── Shared states ─────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-16 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-lg border border-semantic-danger-surface bg-semantic-danger-surface/40 p-6 text-center">
      <AlertTriangle aria-hidden="true" className="mx-auto mb-2 h-6 w-6 text-semantic-danger" />
      <p className="text-sm text-neutral-900 dark:text-neutral-100">{message}</p>
      <button type="button" onClick={onRetry} className="mt-3 text-sm font-semibold text-brand-navy hover:underline dark:text-brand-navy-tint">
        Try again
      </button>
    </div>
  );
}

function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 p-10 text-center">
      <Icon aria-hidden="true" className="mx-auto mb-3 h-10 w-10 text-neutral-300" />
      <p className="font-medium text-neutral-900 dark:text-neutral-100">{title}</p>
      <p className="mt-1 text-sm text-neutral-600">{hint}</p>
    </div>
  );
}

// ── Policies ───────────────────────────────────────────────────────────────────

function PoliciesTab({ workspaceId, canManage, policies, calendars, onChanged, toast }) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: '', description: '', scopeBql: '', calendarId: '' });
  const [expanded, setExpanded] = useState(null);

  async function createPolicy(e) {
    e.preventDefault();
    if (!draft.name.trim()) return;
    try {
      await api.send('/sla/policies', {
        method: 'POST',
        body: JSON.stringify({
          workspaceId, name: draft.name.trim(), description: draft.description,
          scopeBql: draft.scopeBql, calendarId: draft.calendarId || null,
        }),
      });
      toast('Policy created', 'success');
      setCreating(false);
      setDraft({ name: '', description: '', scopeBql: '', calendarId: '' });
      onChanged();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function setActive(p, active) {
    try {
      await api.send(`/sla/policies/${p.id}/${active ? 'activate' : 'deactivate'}`, { method: 'POST' });
      toast(active ? 'Policy activated' : 'Policy deactivated', 'success');
      onChanged();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function preview(p) {
    try {
      const r = await api.send(`/sla/policies/${p.id}/preview`, { method: 'POST' });
      toast(r.valid ? `Covers ${r.scoped} item(s) right now` : `Invalid: ${r.error}`, r.valid ? 'success' : 'error');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function remove(p) {
    try {
      await api.send(`/sla/policies/${p.id}`, { method: 'DELETE' });
      toast('Policy deleted', 'success');
      onChanged();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div>
          {creating ? (
            <form onSubmit={createPolicy} className="space-y-3 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
              <Field label="Policy name">
                <input
                  className="input" value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="P0 incident resolution"
                />
              </Field>
              <Field label="Description">
                <input className="input" value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="Resolve P0 incidents within 4 business hours" />
              </Field>
              <Field label="Scope (BQL) — which items this policy covers">
                <input className="input font-mono" value={draft.scopeBql}
                  onChange={(e) => setDraft({ ...draft, scopeBql: e.target.value })}
                  placeholder='priority = "P0" AND type = "Bug"' />
              </Field>
              <Field label="Business-hours calendar">
                <select className="input" value={draft.calendarId}
                  onChange={(e) => setDraft({ ...draft, calendarId: e.target.value })}>
                  <option value="">24×7 (every minute counts)</option>
                  {calendars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <div className="flex gap-2">
                <button type="submit" className={BTN_PRIMARY}>Create policy</button>
                <button type="button" className={BTN_GHOST} onClick={() => setCreating(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <button type="button" className={BTN_PRIMARY} onClick={() => setCreating(true)}>
              <Plus aria-hidden="true" className="h-4 w-4" /> New policy
            </button>
          )}
        </div>
      )}

      {policies.length === 0 ? (
        <EmptyState icon={Timer} title="No SLA policies yet"
          hint={canManage ? 'Create a policy to start tracking commitments against your work.'
            : 'An admin has not defined any SLA policies for this workspace yet.'} />
      ) : (
        <ul className="space-y-2">
          {policies.map((p) => (
            <li key={p.id} className="rounded-lg border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold text-neutral-900 dark:text-neutral-50">{p.name}</span>
                    <Badge tone={p.active ? 'success' : 'neutral'}>{p.active ? 'Active' : 'Inactive'}</Badge>
                    {p.customerTier && <Badge tone="info">{p.customerTier}</Badge>}
                  </div>
                  {p.description && <p className="truncate text-sm text-neutral-600">{p.description}</p>}
                  {p.scopeBql && <p className="truncate font-mono text-xs text-neutral-500">{p.scopeBql}</p>}
                </div>
                {canManage && (
                  <div className="flex shrink-0 items-center gap-1">
                    <IconButton label="Preview scope" onClick={() => preview(p)}><FlaskConical className="h-4 w-4" /></IconButton>
                    {p.active
                      ? <IconButton label="Deactivate" onClick={() => setActive(p, false)}><Pause className="h-4 w-4" /></IconButton>
                      : <IconButton label="Activate" onClick={() => setActive(p, true)}><Play className="h-4 w-4" /></IconButton>}
                    <button type="button" className={BTN_GHOST} onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                      {expanded === p.id ? 'Close' : 'Targets'}
                    </button>
                    <IconButton label="Delete policy" onClick={() => remove(p)}><Trash2 className="h-4 w-4" /></IconButton>
                  </div>
                )}
              </div>
              {expanded === p.id && (
                <TargetsEditor policy={p} toast={toast} onSaved={onChanged} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TargetsEditor({ policy, toast }) {
  const [targets, setTargets] = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api.send(`/sla/policies/${policy.id}`);
      setTargets(Array.isArray(d.targets) ? d.targets : []);
      setEscalations(Array.isArray(d.escalations) ? d.escalations : []);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoaded(true);
    }
  }, [policy.id, toast]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  function addTarget() {
    setTargets([...targets, { metric: 'RESOLUTION', targetMinutes: 240, startStatus: '', stopStatus: 'Done', pauseStatuses: '[]' }]);
  }

  function updateTarget(i, patch) {
    setTargets(targets.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  }

  async function saveTargets() {
    try {
      const payload = targets.map((t) => ({
        metric: t.metric,
        targetMinutes: Number(t.targetMinutes) || 0,
        startStatus: t.startStatus || null,
        stopStatus: t.stopStatus || null,
        pauseStatuses: pausesToJson(t.pauseStatuses),
      }));
      await api.send(`/sla/policies/${policy.id}/targets`, { method: 'PUT', body: JSON.stringify(payload) });
      toast('Targets saved', 'success');
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function addBreachEscalation() {
    const next = [...escalations, { thresholdPercent: 80, onBreach: false, action: 'NOTIFY', actionTarget: '[{"type":"ITEM_OWNER"}]' }];
    try {
      await api.send(`/sla/policies/${policy.id}/escalations`, { method: 'PUT', body: JSON.stringify(next) });
      toast('Escalation added', 'success');
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  if (!loaded) return <div className="border-t border-neutral-200 dark:border-neutral-700 p-4"><SkeletonRows /></div>;

  return (
    <div className="space-y-4 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40 p-4">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Targets</h3>
          <button type="button" className={BTN_GHOST} onClick={addTarget}><Plus aria-hidden="true" className="h-4 w-4" /> Add target</button>
        </div>
        {targets.length === 0 ? (
          <p className="text-sm text-neutral-600">No targets yet. A policy needs at least one target before it can be activated.</p>
        ) : (
          <div className="space-y-2">
            {targets.map((t, i) => (
              <div key={t.id || i} className="grid grid-cols-1 gap-2 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3 sm:grid-cols-5">
                <Field label="Metric" compact>
                  <select className="input" value={t.metric} onChange={(e) => updateTarget(i, { metric: e.target.value })}>
                    {METRICS.map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
                  </select>
                </Field>
                <Field label="Target (min)" compact>
                  <input className="input" type="number" min="1" value={t.targetMinutes}
                    onChange={(e) => updateTarget(i, { targetMinutes: e.target.value })} />
                </Field>
                <Field label="Start status" compact>
                  <input className="input" value={t.startStatus || ''} placeholder="(in scope)"
                    onChange={(e) => updateTarget(i, { startStatus: e.target.value })} />
                </Field>
                <Field label="Stop status" compact>
                  <input className="input" value={t.stopStatus || ''} placeholder="Done"
                    onChange={(e) => updateTarget(i, { stopStatus: e.target.value })} />
                </Field>
                <Field label="Pause on (comma)" compact>
                  <input className="input" value={pausesToText(t.pauseStatuses)} placeholder="Waiting on customer"
                    onChange={(e) => updateTarget(i, { pauseStatuses: e.target.value })} />
                </Field>
              </div>
            ))}
            <button type="button" className={BTN_PRIMARY} onClick={saveTargets}>Save targets</button>
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Escalations</h3>
          <button type="button" className={BTN_GHOST} onClick={addBreachEscalation}>
            <Plus aria-hidden="true" className="h-4 w-4" /> Notify owner at 80%
          </button>
        </div>
        {escalations.length === 0 ? (
          <p className="text-sm text-neutral-600">No escalation steps. Add one to alert before a breach, not after.</p>
        ) : (
          <ul className="space-y-1 text-sm text-neutral-700 dark:text-neutral-300">
            {escalations.map((e, i) => (
              <li key={e.id || i} className="flex items-center gap-2">
                <Badge tone="warning">{e.onBreach ? 'On breach' : `${e.thresholdPercent}% consumed`}</Badge>
                <span>{e.action}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Live clocks ──────────────────────────────────────────────────────────────

function ClocksTab({ clocks }) {
  if (clocks.length === 0) {
    return <EmptyState icon={Timer} title="No live SLA clocks"
      hint="Clocks start automatically as items come into the scope of an active policy." />;
  }
  return (
    <ul className="space-y-2">
      {clocks.map((c) => (
        <li key={c.id} className="flex items-center gap-3 rounded-lg border border-neutral-200 dark:border-neutral-700 p-3">
          <SlaCountdownBadge metric={c.metric} state={c.state} band={c.band} remainingMinutes={c.remainingMinutes} />
          <span className="font-mono text-sm text-neutral-700 dark:text-neutral-300">{c.workItemId}</span>
          <span className="ml-auto text-xs text-neutral-500">
            {c.dueAt ? `Due ${absoluteDateTime(c.dueAt)}` : `${formatMinutes(c.elapsedMinutes)} elapsed`}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ── Report ───────────────────────────────────────────────────────────────────

function ReportTab({ report }) {
  if (!report) return <EmptyState icon={CheckCircle2} title="No SLA data yet" hint="Activate a policy to start measuring." />;
  const s = report.summary || {};
  const cards = [
    { label: 'Met', value: s.met ?? 0, tone: 'success' },
    { label: 'Breached', value: s.breached ?? 0, tone: 'danger' },
    { label: 'Running', value: s.running ?? 0, tone: 'info' },
    { label: 'Breach rate', value: `${s.breachRatePercent ?? 0}%`, tone: 'warning' },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">{c.label}</p>
            <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-50">{c.value}</p>
          </div>
        ))}
      </div>
      <div>
        <h3 className="mb-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">By policy</h3>
        {(report.byPolicy || []).length === 0 ? (
          <p className="text-sm text-neutral-600">No policies to report on.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-700 text-neutral-600">
                <th className="py-2 font-semibold">Policy</th>
                <th className="py-2 font-semibold">Met</th>
                <th className="py-2 font-semibold">Breached</th>
                <th className="py-2 font-semibold">Active</th>
              </tr>
            </thead>
            <tbody>
              {report.byPolicy.map((row) => (
                <tr key={row.id} className="border-b border-neutral-100 dark:border-neutral-800">
                  <td className="py-2 text-neutral-900 dark:text-neutral-100">{row.name}</td>
                  <td className="py-2">{row.met}</td>
                  <td className="py-2">{row.breached}</td>
                  <td className="py-2">{row.active}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Audit ────────────────────────────────────────────────────────────────────

function AuditTab({ workspaceId, audit, toast }) {
  async function exportCsv() {
    try {
      const res = await api.raw(`/sla/audit/export?workspaceId=${workspaceId}`);
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sla-audit.csv';
      a.click();
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
      {audit.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="No SLA activity yet"
          hint="Starts, pauses, breaches and escalations will appear here as clocks run." />
      ) : (
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
          {audit.map((e, i) => (
            <li key={i} className="flex items-center gap-3 p-3 text-sm">
              <Badge tone="neutral">{String(e.event_type).replace('SLA_', '')}</Badge>
              <span className="font-mono text-xs text-neutral-500">{e.aggregate_id}</span>
              <span className="ml-auto text-xs text-neutral-500">{absoluteDateTime(e.occurred_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Small shared building blocks ────────────────────────────────────────────────

function Field({ label, children, compact }) {
  return (
    <label className="block">
      <span className={cn('mb-1 block font-medium text-neutral-700 dark:text-neutral-300', compact ? 'text-xs' : 'text-sm')}>
        {label}
      </span>
      {children}
    </label>
  );
}

function IconButton({ label, onClick, children }) {
  return (
    <button
      type="button" aria-label={label} title={label} onClick={onClick}
      className="rounded-md p-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 dark:hover:bg-neutral-800"
    >
      {children}
    </button>
  );
}

function pausesToText(value) {
  try {
    const arr = JSON.parse(value || '[]');
    return Array.isArray(arr) ? arr.join(', ') : '';
  } catch {
    return typeof value === 'string' ? value : '';
  }
}

function pausesToJson(value) {
  if (value == null) return '[]';
  if (value.trim().startsWith('[')) return value; // already JSON
  const arr = value.split(',').map((s) => s.trim()).filter(Boolean);
  return JSON.stringify(arr);
}
