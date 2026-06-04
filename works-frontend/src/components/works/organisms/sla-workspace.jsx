import { useState, useEffect, useCallback } from 'react';
import {
  Clock, Plus, Trash2, Play, Pause, Copy, AlertTriangle,
  CheckCircle2, TimerReset, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/works/button';
import { Badge } from '@/components/works/atoms/badge';
import { api } from '@/lib/apiClient';
import { formatDuration } from '@/lib/format';

// Organism — SLA engine admin surface (iteration 8, Cap M). Self-contained: it fetches
// through the shared apiClient and renders the compliance summary, policies (with targets,
// escalations and bulk apply), templates and business-hours calendars. Tokens only
// (CLAUDE.md §4); one primary action per section; the five states are all handled.

const EMPTY_POLICY = { name: '', description: '', projectId: '', scopeBql: '', pauseStatuses: '' };
const EMPTY_TARGET = { name: '', metric: 'RESOLUTION', targetMinutes: 240, startStatus: '', stopStatus: 'Done' };
const EMPTY_ESC = { thresholdPct: 80, action: 'NOTIFY', notifyTo: '', reassignTo: '' };

function Field({ label, htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-semibold text-neutral-600 space-y-1">
      <span>{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  'w-full rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-900 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-1';

function SummaryStat({ label, value, tone }) {
  const color = tone === 'danger' ? 'text-semantic-danger'
    : tone === 'success' ? 'text-semantic-success'
      : tone === 'warning' ? 'text-semantic-warning' : 'text-brand-navy';
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-neutral-600">{label}</div>
    </div>
  );
}

export function SlaWorkspace({ workspaceId }) {
  const [policies, setPolicies] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [calendars, setCalendars] = useState([]);
  const [report, setReport] = useState(null);
  const [detail, setDetail] = useState(null); // { policy, targets, escalations }
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [policyForm, setPolicyForm] = useState(EMPTY_POLICY);
  const [targetForm, setTargetForm] = useState(EMPTY_TARGET);
  const [escForm, setEscForm] = useState(EMPTY_ESC);

  const loadAll = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError('');
    try {
      const [pol, tpl, cal, rep] = await Promise.all([
        api.send(`/sla/policies?workspaceId=${workspaceId}`),
        api.send('/sla/policies/templates'),
        api.send(`/sla/calendars?workspaceId=${workspaceId}`),
        api.send(`/sla/report?workspaceId=${workspaceId}`),
      ]);
      setPolicies(pol);
      setTemplates(tpl);
      setCalendars(cal);
      setReport(rep);
    } catch (e) {
      setError(e.message || 'Could not load SLA configuration.');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  // Fetch SLA config on mount / workspace change. loadAll sets a loading flag synchronously,
  // which is the intended on-mount data-fetch pattern (not a cascading-render bug).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadAll(); }, [loadAll]);

  const openDetail = useCallback(async (id) => {
    setPreview(null);
    try {
      setDetail(await api.send(`/sla/policies/${id}`));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  async function createPolicy(e) {
    e.preventDefault();
    try {
      const body = { ...policyForm, projectId: policyForm.projectId || null };
      await api.send(`/sla/policies?workspaceId=${workspaceId}`, { method: 'POST', body });
      setPolicyForm(EMPTY_POLICY);
      setShowPolicyForm(false);
      await loadAll();
    } catch (e) { setError(e.message); }
  }

  async function toggleActive(p) {
    try {
      await api.send(`/sla/policies/${p.id}/activate?active=${!p.active}`, { method: 'POST' });
      await loadAll();
      if (detail?.policy?.id === p.id) openDetail(p.id);
    } catch (e) { setError(e.message); }
  }

  async function removePolicy(p) {
    try {
      await api.raw(`/sla/policies/${p.id}`, { method: 'DELETE' });
      if (detail?.policy?.id === p.id) setDetail(null);
      await loadAll();
    } catch (e) { setError(e.message); }
  }

  async function cloneTemplate(t) {
    try {
      const created = await api.send(`/sla/policies/clone?workspaceId=${workspaceId}&templateId=${t.id}`, { method: 'POST' });
      await loadAll();
      openDetail(created.id);
    } catch (e) { setError(e.message); }
  }

  async function addTarget(e) {
    e.preventDefault();
    try {
      await api.send(`/sla/policies/${detail.policy.id}/targets`, {
        method: 'POST',
        body: { ...targetForm, targetMinutes: Number(targetForm.targetMinutes), startStatus: targetForm.startStatus || null },
      });
      setTargetForm(EMPTY_TARGET);
      openDetail(detail.policy.id);
    } catch (e) { setError(e.message); }
  }

  async function addEscalation(e) {
    e.preventDefault();
    try {
      const notify = escForm.notifyTo ? JSON.stringify(escForm.notifyTo.split(',').map((s) => s.trim()).filter(Boolean)) : '[]';
      await api.send(`/sla/policies/${detail.policy.id}/escalations`, {
        method: 'POST',
        body: { ...escForm, thresholdPct: Number(escForm.thresholdPct), notifyTo: notify, reassignTo: escForm.reassignTo || null },
      });
      setEscForm(EMPTY_ESC);
      openDetail(detail.policy.id);
    } catch (e) { setError(e.message); }
  }

  async function deleteTarget(id) {
    try { await api.raw(`/sla/targets/${id}`, { method: 'DELETE' }); openDetail(detail.policy.id); } catch (e) { setError(e.message); }
  }
  async function deleteEscalation(id) {
    try { await api.raw(`/sla/escalations/${id}`, { method: 'DELETE' }); openDetail(detail.policy.id); } catch (e) { setError(e.message); }
  }

  async function runPreview() {
    try { setPreview(await api.send(`/sla/policies/${detail.policy.id}/preview`)); } catch (e) { setError(e.message); }
  }
  async function commitApply() {
    try {
      const res = await api.send(`/sla/policies/${detail.policy.id}/apply`, { method: 'POST' });
      setPreview({ ...preview, applied: res });
      await loadAll();
    } catch (e) { setError(e.message); }
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-neutral-100" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <Clock className="h-6 w-6 text-brand-navy" /> SLA Engine
          </h1>
          <p className="text-sm text-neutral-600">Define service-level commitments, business-hours calendars and escalations.</p>
        </div>
        <Button variant="action" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowPolicyForm((v) => !v)}>
          New policy
        </Button>
      </header>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-semantic-danger-surface bg-semantic-danger-surface p-3 text-sm text-semantic-danger">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Compliance summary (I08-S07) */}
      {report && (
        <section aria-label="SLA compliance summary" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryStat label="Compliance" value={`${report.compliancePercent}%`} tone={report.compliancePercent >= 90 ? 'success' : 'warning'} />
          <SummaryStat label="Met" value={report.met} tone="success" />
          <SummaryStat label="Breached" value={report.breached} tone={report.breached > 0 ? 'danger' : 'neutral'} />
          <SummaryStat label="In flight" value={report.inFlight} />
        </section>
      )}

      {/* New policy form */}
      {showPolicyForm && (
        <form onSubmit={createPolicy} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="text-base font-semibold text-neutral-900">New SLA policy</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" htmlFor="sla-name">
              <input id="sla-name" required className={inputCls} value={policyForm.name}
                onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })} placeholder="P0 incident response" />
            </Field>
            <Field label="Project (blank = all projects)" htmlFor="sla-project">
              <input id="sla-project" className={inputCls} value={policyForm.projectId}
                onChange={(e) => setPolicyForm({ ...policyForm, projectId: e.target.value })} placeholder="PROJ-001" />
            </Field>
            <Field label="Scope (BQL)" htmlFor="sla-scope">
              <input id="sla-scope" className={inputCls} value={policyForm.scopeBql}
                onChange={(e) => setPolicyForm({ ...policyForm, scopeBql: e.target.value })} placeholder="priority = Highest" />
            </Field>
            <Field label="Pause statuses (JSON array)" htmlFor="sla-pause">
              <input id="sla-pause" className={inputCls} value={policyForm.pauseStatuses}
                onChange={(e) => setPolicyForm({ ...policyForm, pauseStatuses: e.target.value })} placeholder='["Waiting on customer"]' />
            </Field>
          </div>
          <Field label="Description" htmlFor="sla-desc">
            <input id="sla-desc" className={inputCls} value={policyForm.description}
              onChange={(e) => setPolicyForm({ ...policyForm, description: e.target.value })} />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" variant="primary">Create policy</Button>
            <Button type="button" variant="ghost" onClick={() => setShowPolicyForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Policies list */}
        <section aria-label="SLA policies" className="space-y-3">
          <h2 className="text-base font-semibold text-neutral-900">Policies</h2>
          {policies.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-6 text-center">
              <TimerReset className="mx-auto h-10 w-10 text-neutral-300" />
              <p className="mt-2 text-sm text-neutral-600">No SLA policies yet. Create one above or clone a starter template below.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {policies.map((p) => (
                <li key={p.id}>
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white p-3">
                    <button type="button" onClick={() => openDetail(p.id)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left">
                      <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-neutral-900">{p.name}</span>
                        {p.description && <span className="block truncate text-xs text-neutral-600">{p.description}</span>}
                      </span>
                    </button>
                    <Badge tone={p.active ? 'success' : 'neutral'}>{p.active ? 'Active' : 'Inactive'}</Badge>
                    <button type="button" aria-label={p.active ? 'Deactivate policy' : 'Activate policy'}
                      onClick={() => toggleActive(p)}
                      className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100">
                      {p.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                    <button type="button" aria-label="Delete policy" onClick={() => removePolicy(p)}
                      className="rounded-md p-1.5 text-semantic-danger hover:bg-semantic-danger-surface">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Templates (I08-S01) */}
          {templates.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Starter templates</h3>
              {templates.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-md border border-neutral-200 bg-white p-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-neutral-900">{t.name}</span>
                    <span className="block truncate text-xs text-neutral-600">{t.description}</span>
                  </span>
                  <Button variant="secondary" size="sm" leftIcon={<Copy className="h-3.5 w-3.5" />} onClick={() => cloneTemplate(t)}>
                    Clone
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Policy detail */}
        <section aria-label="SLA policy detail" className="space-y-3">
          <h2 className="text-base font-semibold text-neutral-900">Policy detail</h2>
          {!detail ? (
            <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-600">
              Select a policy to manage its targets, escalations and bulk application.
            </div>
          ) : (
            <div className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">{detail.policy.name}</h3>
                <p className="text-xs text-neutral-600">{detail.policy.scopeBql ? `Scope: ${detail.policy.scopeBql}` : 'Scope: all items in the workspace'}</p>
              </div>

              {/* Targets (I08-S03) */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Targets</h4>
                {detail.targets.length === 0 && <p className="text-xs text-neutral-600">No targets yet — add a first response or resolution target.</p>}
                {detail.targets.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-md bg-neutral-50 px-2.5 py-1.5">
                    <span className="text-sm text-neutral-900">
                      <span className="font-medium">{t.name}</span>
                      <span className="text-neutral-600"> · {t.metric.replace('_', ' ').toLowerCase()} · {formatDuration(t.targetMinutes * 60)} · stops on {t.stopStatus}</span>
                    </span>
                    <button type="button" aria-label="Remove target" onClick={() => deleteTarget(t.id)} className="text-semantic-danger hover:opacity-80">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <form onSubmit={addTarget} className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-4">
                  <input aria-label="Target name" required className={inputCls} placeholder="Resolve" value={targetForm.name}
                    onChange={(e) => setTargetForm({ ...targetForm, name: e.target.value })} />
                  <select aria-label="Metric" className={inputCls} value={targetForm.metric}
                    onChange={(e) => setTargetForm({ ...targetForm, metric: e.target.value })}>
                    <option value="FIRST_RESPONSE">First response</option>
                    <option value="RESOLUTION">Resolution</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                  <input aria-label="Target minutes" type="number" min="1" className={inputCls} placeholder="Minutes" value={targetForm.targetMinutes}
                    onChange={(e) => setTargetForm({ ...targetForm, targetMinutes: e.target.value })} />
                  <input aria-label="Stop status" className={inputCls} placeholder="Done,Resolved" value={targetForm.stopStatus}
                    onChange={(e) => setTargetForm({ ...targetForm, stopStatus: e.target.value })} />
                  <Button type="submit" variant="secondary" size="sm" className="col-span-2 sm:col-span-4" leftIcon={<Plus className="h-3.5 w-3.5" />}>
                    Add target
                  </Button>
                </form>
              </div>

              {/* Escalations (I08-S06) */}
              <div className="space-y-2 border-t border-neutral-200 pt-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Escalations</h4>
                {detail.escalations.length === 0 && <p className="text-xs text-neutral-600">No escalation steps — add one to alert before a breach.</p>}
                {detail.escalations.map((es) => (
                  <div key={es.id} className="flex items-center justify-between rounded-md bg-neutral-50 px-2.5 py-1.5">
                    <span className="text-sm text-neutral-900">At {es.thresholdPct}% → <span className="font-medium">{es.action.toLowerCase()}</span></span>
                    <button type="button" aria-label="Remove escalation" onClick={() => deleteEscalation(es.id)} className="text-semantic-danger hover:opacity-80">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <form onSubmit={addEscalation} className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-4">
                  <input aria-label="Threshold percent" type="number" min="1" max="100" className={inputCls} placeholder="80" value={escForm.thresholdPct}
                    onChange={(e) => setEscForm({ ...escForm, thresholdPct: e.target.value })} />
                  <select aria-label="Escalation action" className={inputCls} value={escForm.action}
                    onChange={(e) => setEscForm({ ...escForm, action: e.target.value })}>
                    <option value="NOTIFY">Notify</option>
                    <option value="REASSIGN">Reassign</option>
                  </select>
                  <input aria-label="Notify user ids" className={inputCls} placeholder="user ids, comma sep" value={escForm.notifyTo}
                    onChange={(e) => setEscForm({ ...escForm, notifyTo: e.target.value })} />
                  <input aria-label="Reassign to user id" className={inputCls} placeholder="reassign to" value={escForm.reassignTo}
                    onChange={(e) => setEscForm({ ...escForm, reassignTo: e.target.value })} />
                  <Button type="submit" variant="secondary" size="sm" className="col-span-2 sm:col-span-4" leftIcon={<Plus className="h-3.5 w-3.5" />}>
                    Add escalation
                  </Button>
                </form>
              </div>

              {/* Bulk apply (I08-S09) */}
              <div className="space-y-2 border-t border-neutral-200 pt-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Bulk apply</h4>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={runPreview}>Preview matching items</Button>
                  {preview && (
                    <Button variant="action" size="sm" leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={commitApply}>
                      Apply to {preview.count} item{preview.count === 1 ? '' : 's'}
                    </Button>
                  )}
                </div>
                {preview && (
                  <p className="text-xs text-neutral-600">
                    {preview.applied
                      ? `Applied — ${preview.applied.clocksCreated} clock(s) created across ${preview.applied.items} item(s).`
                      : `${preview.count} work item(s) match this policy's scope.`}
                  </p>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Calendars (I08-S02) */}
      <section aria-label="Business-hours calendars" className="space-y-2">
        <h2 className="text-base font-semibold text-neutral-900">Business-hours calendars</h2>
        {calendars.length === 0 ? (
          <p className="text-sm text-neutral-600">No calendars — a default Mon–Fri 09:00–18:00 IST calendar is seeded per workspace.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {calendars.map((c) => (
              <li key={c.id} className="rounded-lg border border-neutral-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-neutral-900">{c.name}</span>
                  {c.isDefault && <Badge tone="brand">Default</Badge>}
                </div>
                <p className="text-xs text-neutral-600">{c.timezone}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
