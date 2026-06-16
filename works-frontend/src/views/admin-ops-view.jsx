// Admin Operations Center (iteration 16, Cap Y) — the operational admin surface. Checklists, status
// indicators and action buttons: workspace health, user-lifecycle playbooks/runs, license & seats,
// the AI cost dashboard, the audit-log explorer, integration health (with retry), access review
// (with bulk-deactivate), and on-demand compliance evidence packages. Self-contained — fetches its
// own workspace-scoped, admin-gated data via adminOpsClient → apiClient (CLAUDE.md §3). Tokens only,
// five interactive states, WCAG-AA (RB-30).

import { useState, useEffect, useCallback } from 'react';
import {
  Activity, UserPlus, CreditCard, Sparkles, ScrollText, Plug, UserCheck, FileCheck2,
  RefreshCw, Wand2, Play, Check, X, ShieldAlert, TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/works/button';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { Skeleton } from '@/components/works/atoms/skeleton';
import { Card as AtomCard, CardHeader, CardTitle, CardBody } from '@/components/works/atoms/card';
import { PageLayout } from '@/components/works/templates/page-layout';
import { Tabs, TabList, Tab, TabPanel } from '@/components/works/atoms/tabs';
import { adminOpsClient } from '@/lib/adminOps';
import { formatNumber, smartDate } from '@/lib/format';
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination';

const TABS = [
  { id: 'health', label: 'Health', Icon: Activity },
  { id: 'lifecycle', label: 'User lifecycle', Icon: UserPlus },
  { id: 'seats', label: 'Licenses', Icon: CreditCard },
  { id: 'aicost', label: 'AI cost', Icon: Sparkles },
  { id: 'audit', label: 'Audit log', Icon: ScrollText },
  { id: 'integrations', label: 'Integrations', Icon: Plug },
  { id: 'access', label: 'Access review', Icon: UserCheck },
  { id: 'evidence', label: 'Evidence', Icon: FileCheck2 },
  { id: 'funnel', label: 'Funnel', Icon: TrendingUp },
];

function money(cents) {
  return `$${((Number(cents) || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function bytes(n) {
  const v = Number(n) || 0;
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / 1024 / 1024).toFixed(1)} MB`;
}

function Stat({ label, value, tone = 'neutral' }) {
  const toneClass = tone === 'danger' ? 'text-semantic-danger'
    : tone === 'warning' ? 'text-semantic-warning'
      : tone === 'success' ? 'text-semantic-success' : 'text-brand-navy dark:text-neutral-100';
  return (
    <AtomCard variant="outlined" padding="sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</p>
    </AtomCard>
  );
}

function Card({ title, icon, action, children }) {
  return (
    <AtomCard variant="outlined" padding="sm">
      <CardHeader className="mb-3">
        <CardTitle className="flex items-center gap-2">
          <span className="text-brand-navy dark:text-neutral-300">{icon}</span>{title}
        </CardTitle>
        {action}
      </CardHeader>
      <CardBody>{children}</CardBody>
    </AtomCard>
  );
}

export default function AdminOpsView({ workspaceId, onToast }) {
  const [tab, setTab] = useState('health');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const notify = useCallback((m, t) => onToast?.(m, t), [onToast]);

  // State is only ever set inside async callbacks (never synchronously in the effect body) so the
  // loader can be reused by the effect, the tab switcher and the Retry button alike (RB-30 states).
  const load = useCallback((which, ref) => {
    if (!workspaceId) return;
    const live = () => !ref || ref.alive;
    const fetchers = {
      health: () => adminOpsClient.health(workspaceId),
      lifecycle: async () => ({
        playbooks: await adminOpsClient.playbooks(workspaceId),
        runs: await adminOpsClient.runs(workspaceId),
      }),
      seats: () => adminOpsClient.licenseSeats(workspaceId),
      aicost: () => adminOpsClient.aiCost(workspaceId),
      audit: async () => ({
        log: await adminOpsClient.auditLog(workspaceId, { size: DEFAULT_PAGE_SIZE }),
        eventTypes: await adminOpsClient.auditEventTypes(workspaceId),
        saved: await adminOpsClient.savedQueries(workspaceId),
      }),
      integrations: () => adminOpsClient.integrationHealth(workspaceId),
      access: async () => ({ reviews: await adminOpsClient.accessReviews(workspaceId) }),
      evidence: () => adminOpsClient.evidencePackages(workspaceId),
      funnel: () => adminOpsClient.heartMetrics(workspaceId),
    };
    (fetchers[which] || fetchers.health)()
      .then((result) => { if (live()) { setData((d) => ({ ...d, [which]: result })); setError(null); } })
      .catch((e) => { if (live()) setError(e.message || 'Could not load the Admin Operations Center.'); })
      .finally(() => { if (live()) setLoading(false); });
  }, [workspaceId]);

  useEffect(() => {
    const ref = { alive: true };
    load(tab, ref);
    return () => { ref.alive = false; };
  }, [tab, load]);

  function selectTab(id) { if (id !== tab) { setLoading(true); setError(null); setTab(id); } }
  const refresh = () => { setLoading(true); setError(null); load(tab, { alive: true }); };

  return (
    <PageLayout
      title="Admin Operations Center"
      description="Operate the workspace — users, seats, cost, integrations, access and compliance."
    >

      <Tabs value={tab} onValueChange={selectTab}>
        <TabList aria-label="Admin operations" className="mb-6 overflow-x-auto gap-1">
          {TABS.map(({ id, label, Icon }) => (
            <Tab key={id} value={id}>
              <Icon aria-hidden="true" className="inline-block h-4 w-4 mr-1.5 align-text-bottom" />{label}
            </Tab>
          ))}
        </TabList>

        {/* TabPanels always rendered so Tab's aria-controls resolves to existing IDs (axe valid-attr-value). */}
        <TabPanel value="health">
          {error ? (
            <EmptyState
              icon={ShieldAlert}
              title="Couldn't load this view"
              subtitle={error}
              action={<Button variant="secondary" size="sm" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={refresh}>Try again</Button>}
            />
          ) : loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" aria-busy="true" aria-label="Loading">
              <Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" />
            </div>
          ) : (
            <HealthTab data={data.health} />
          )}
        </TabPanel>
        <TabPanel value="lifecycle">{!error && !loading && <LifecycleTab workspaceId={workspaceId} data={data.lifecycle} onChanged={refresh} notify={notify} />}</TabPanel>
        <TabPanel value="seats">{!error && !loading && <SeatsTab data={data.seats} />}</TabPanel>
        <TabPanel value="aicost">{!error && !loading && <AiCostTab data={data.aicost} />}</TabPanel>
        <TabPanel value="audit">{!error && !loading && <AuditTab workspaceId={workspaceId} data={data.audit} onChanged={refresh} notify={notify} />}</TabPanel>
        <TabPanel value="integrations">{!error && !loading && <IntegrationsTab workspaceId={workspaceId} data={data.integrations} onChanged={refresh} notify={notify} />}</TabPanel>
        <TabPanel value="access">{!error && !loading && <AccessTab workspaceId={workspaceId} data={data.access} onChanged={refresh} notify={notify} />}</TabPanel>
        <TabPanel value="evidence">{!error && !loading && <EvidenceTab workspaceId={workspaceId} data={data.evidence} onChanged={refresh} notify={notify} />}</TabPanel>
        <TabPanel value="funnel">{!error && !loading && <FunnelTab data={data.funnel} />}</TabPanel>
      </Tabs>
    </PageLayout>
  );
}

function HealthTab({ data }) {
  if (!data) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Stat label="Members" value={formatNumber(data.members)} />
      <Stat label="Projects" value={formatNumber(data.projects)} />
      <Stat label="Work items" value={formatNumber(data.workItems)} />
      <Stat label="Storage" value={bytes(data.storageBytes)} />
      <Stat label="Events today" value={formatNumber(data.eventsToday)} />
      <Stat label="Integrations down" value={formatNumber(data.integrationsDown)} tone={Number(data.integrationsDown) > 0 ? 'danger' : 'success'} />
      <Stat label="Failed webhooks" value={formatNumber(data.failedWebhookDeliveries)} tone={Number(data.failedWebhookDeliveries) > 0 ? 'warning' : 'success'} />
      <Stat label="AI budget" value={`${data.aiBudgetPercent}%`} tone={data.aiBudgetState === 'DISABLED' ? 'danger' : data.aiBudgetState === 'DEGRADED' ? 'warning' : 'success'} />
    </div>
  );
}

function LifecycleTab({ workspaceId, data, onChanged, notify }) {
  const [activeRun, setActiveRun] = useState(null);
  const [form, setForm] = useState({ playbookId: '', subjectName: '', subjectEmail: '' });
  const [busy, setBusy] = useState(false);
  const playbooks = data?.playbooks || [];
  const runs = data?.runs || [];

  async function start() {
    if (!form.playbookId || !form.subjectName) { notify('Pick a playbook and enter a name', 'error'); return; }
    setBusy(true);
    try {
      const run = await adminOpsClient.startRun(workspaceId, form);
      setActiveRun(run);
      setForm({ playbookId: '', subjectName: '', subjectEmail: '' });
      onChanged();
      notify('Run started', 'success');
    } catch (e) { notify(e.message || 'Could not start the run', 'error'); }
    finally { setBusy(false); }
  }

  async function openRun(id) {
    try { setActiveRun(await adminOpsClient.run(id)); }
    catch (e) { notify(e.message || 'Could not open run', 'error'); }
  }

  async function complete(stepId, skip) {
    try {
      const updated = await adminOpsClient.completeStep(activeRun.run.id, stepId, { skip });
      setActiveRun(updated);
      onChanged();
    } catch (e) { notify(e.message || 'Could not update step', 'error'); }
  }

  return (
    <div className="space-y-6">
      <Card title="Start a lifecycle run" icon={<Play className="h-4 w-4" />}>
        <div className="flex flex-col md:flex-row gap-2">
          <select
            aria-label="Playbook"
            value={form.playbookId}
            onChange={(e) => setForm((f) => ({ ...f, playbookId: e.target.value }))}
            className="h-9 rounded-md border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 text-sm text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
          >
            <option value="">Select playbook…</option>
            {playbooks.map((p) => <option key={p.playbook.id} value={p.playbook.id}>{p.playbook.name} ({p.playbook.kind})</option>)}
          </select>
          <input
            aria-label="Subject name" placeholder="Subject name"
            value={form.subjectName}
            onChange={(e) => setForm((f) => ({ ...f, subjectName: e.target.value }))}
            className="h-9 flex-1 rounded-md border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 text-sm text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
          />
          <input
            aria-label="Subject email" placeholder="Email (optional)"
            value={form.subjectEmail}
            onChange={(e) => setForm((f) => ({ ...f, subjectEmail: e.target.value }))}
            className="h-9 flex-1 rounded-md border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 text-sm text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
          />
          <Button loading={busy} onClick={start}>Start</Button>
        </div>
      </Card>

      {activeRun && (
        <Card title={`${activeRun.run.subjectName} · ${activeRun.run.kind} · ${activeRun.run.status}`} icon={<UserPlus className="h-4 w-4" />}>
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {(activeRun.steps || []).map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                <span className={s.status === 'DONE' ? 'text-neutral-500 line-through' : 'text-neutral-900 dark:text-neutral-100'}>
                  {s.title} <span className="text-xs text-neutral-500">· {s.actionType}</span>
                </span>
                {s.status === 'PENDING' ? (
                  <span className="flex gap-1">
                    <Button size="sm" variant="secondary" leftIcon={<Check className="h-3.5 w-3.5" />} onClick={() => complete(s.id, false)}>Done</Button>
                    <Button size="sm" variant="ghost" leftIcon={<X className="h-3.5 w-3.5" />} onClick={() => complete(s.id, true)}>Skip</Button>
                  </span>
                ) : (
                  <span className="text-xs font-bold text-neutral-500">{s.status}</span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Recent runs" icon={<Activity className="h-4 w-4" />}>
        {runs.length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">No runs yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {runs.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                <button type="button" onClick={() => openRun(r.id)} className="text-brand-navy-tint hover:underline text-left">
                  {r.subjectName}
                </button>
                <span className="text-neutral-600 dark:text-neutral-400">{r.kind} · {r.status} · {smartDate(r.startedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function SeatsTab({ data }) {
  if (!data) return null;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Plan" value={data.planName} />
        <Stat label="Active / total" value={`${data.activeSeats} / ${data.totalSeats}`} tone={data.availableSeats <= 0 ? 'danger' : 'neutral'} />
        <Stat label="Available" value={formatNumber(data.availableSeats)} tone={data.availableSeats <= 0 ? 'danger' : 'success'} />
        <Stat label="Utilization" value={`${data.utilizationPercent}%`} />
      </div>
      <Card title="Cost & renewal" icon={<CreditCard className="h-4 w-4" />}>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-neutral-600 dark:text-neutral-400">Cost per seat</dt><dd className="font-medium text-neutral-900 dark:text-neutral-100">{money(data.costPerSeatCents)}</dd></div>
          <div><dt className="text-neutral-600 dark:text-neutral-400">Monthly cost</dt><dd className="font-medium text-neutral-900 dark:text-neutral-100">{money(data.monthlyCostCents)}</dd></div>
          <div><dt className="text-neutral-600 dark:text-neutral-400">Renewal</dt><dd className={`font-medium ${data.renewalAlert ? 'text-semantic-warning' : 'text-neutral-900 dark:text-neutral-100'}`}>{data.renewalDate || '—'}{data.renewalAlert ? ' · due soon' : ''}</dd></div>
          <div><dt className="text-neutral-600 dark:text-neutral-400">Growth projection</dt><dd className="font-medium text-neutral-900 dark:text-neutral-100">{data.growthProjection} seats</dd></div>
        </dl>
      </Card>
    </div>
  );
}

function AiCostTab({ data }) {
  if (!data) return null;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Period" value={data.period} />
        <Stat label="Spent / cap" value={`${money(data.spentCents)} / ${money(data.capCents)}`} />
        <Stat label="Used" value={`${data.percent}%`} tone={data.disabled ? 'danger' : data.degraded ? 'warning' : 'success'} />
      </div>
      {data.alert && <p className="rounded-md bg-semantic-warning/10 text-semantic-warning text-sm px-3 py-2">{data.alert}</p>}
      <Card title="Cost by capability" icon={<Sparkles className="h-4 w-4" />}>
        {(data.byCapability || []).length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">No AI usage this period.</p>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {data.byCapability.map((c) => (
              <li key={c.capability} className="flex items-center justify-between py-2 text-sm">
                <span className="text-neutral-900 dark:text-neutral-100">{c.capability}</span>
                <span className="text-neutral-600 dark:text-neutral-400">{c.calls} calls · {c.cache_hits} cached · {c.fallbacks} fallback · {money(c.cost_cents)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Cost by user" icon={<UserCheck className="h-4 w-4" />}>
        {(data.byUser || []).length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">No AI usage this period.</p>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {data.byUser.map((u, i) => (
              <li key={i} className="flex items-center justify-between py-2 text-sm">
                <span className="text-neutral-900 dark:text-neutral-100">{u.full_name || u.user_id || 'Unknown'}</span>
                <span className="text-neutral-600 dark:text-neutral-400">{u.calls} calls · {money(u.cost_cents)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function AuditTab({ workspaceId, data, onChanged, notify }) {
  const [filters, setFilters] = useState({ eventType: '', actorId: '', search: '' });
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const log = rows || data?.log;
  const eventTypes = data?.eventTypes || [];
  const saved = data?.saved || [];

  async function run() {
    setBusy(true);
    try { setRows(await adminOpsClient.auditLog(workspaceId, { ...filters, size: DEFAULT_PAGE_SIZE })); }
    catch (e) { notify(e.message || 'Query failed', 'error'); }
    finally { setBusy(false); }
  }
  async function save() {
    const name = filters.eventType || filters.search || 'Saved query';
    try { await adminOpsClient.saveQuery({ workspaceId, name, ...filters }); onChanged(); notify('Query saved', 'success'); }
    catch (e) { notify(e.message || 'Could not save', 'error'); }
  }

  return (
    <div className="space-y-6">
      <Card title="Filter audit events" icon={<ScrollText className="h-4 w-4" />} action={<Button size="sm" variant="secondary" onClick={save}>Save query</Button>}>
        <div className="flex flex-col md:flex-row gap-2">
          <select
            aria-label="Event type" value={filters.eventType}
            onChange={(e) => setFilters((f) => ({ ...f, eventType: e.target.value }))}
            className="h-9 rounded-md border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 text-sm text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
          >
            <option value="">All event types</option>
            {eventTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            aria-label="Search" placeholder="Search payload…" value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            className="h-9 flex-1 rounded-md border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 text-sm text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
          />
          <Button loading={busy} onClick={run}>Search</Button>
        </div>
        {saved.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {saved.map((q) => (
              <button
                key={q.id} type="button"
                onClick={() => { setFilters({ eventType: q.eventType || '', actorId: q.actorId || '', search: q.searchText || '' }); }}
                className="rounded-md bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              >
                {q.name}
              </button>
            ))}
          </div>
        )}
      </Card>
      <Card title={`Events${log ? ` (${log.total})` : ''}`} icon={<Activity className="h-4 w-4" />}>
        {!log || (log.events || []).length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">No matching events.</p>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {log.events.map((e) => (
              <li key={e.id} className="py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-brand-navy dark:text-neutral-200">{e.event_type}</span>
                  <span className="text-xs text-neutral-600 dark:text-neutral-400">{smartDate(e.occurred_at)}</span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">{e.actor_name || e.actor_id || 'system'} · {e.aggregate_id}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function IntegrationsTab({ workspaceId, data, onChanged, notify }) {
  async function retry(id) {
    try { await adminOpsClient.retryDelivery(workspaceId, id); onChanged(); notify('Delivery retried', 'success'); }
    catch (e) { notify(e.message || 'Retry failed', 'error'); }
  }
  if (!data) return null;
  const conns = data.connections || [];
  const failed = data.failedDeliveries || [];
  return (
    <div className="space-y-6">
      <Card title="Connections" icon={<Plug className="h-4 w-4" />}>
        {conns.length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">No integrations connected.</p>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {conns.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-neutral-900 dark:text-neutral-100">{c.provider} · {c.name}</span>
                <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${c.status === 'CONNECTED' ? 'bg-semantic-success text-white' : 'bg-semantic-danger text-white'}`}>{c.status}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Failed webhook deliveries" icon={<RefreshCw className="h-4 w-4" />}>
        {failed.length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">No failed deliveries — all healthy.</p>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {failed.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-neutral-900 dark:text-neutral-100">{d.event_type} <span className="text-xs text-neutral-500">· {d.attempts}/{d.max_attempts} · {d.last_error || `HTTP ${d.response_code}`}</span></span>
                <Button size="sm" variant="secondary" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => retry(d.id)}>Retry</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function AccessTab({ workspaceId, data, onChanged, notify }) {
  const [active, setActive] = useState(null);
  const [busy, setBusy] = useState(false);
  const reviews = data?.reviews || [];

  async function start() {
    setBusy(true);
    try { setActive(await adminOpsClient.startAccessReview(workspaceId, 90)); onChanged(); }
    catch (e) { notify(e.message || 'Could not start review', 'error'); }
    finally { setBusy(false); }
  }
  async function deactivate(userId) {
    try {
      await adminOpsClient.deactivateMember(active.review.id, userId);
      setActive((a) => ({ ...a, members: a.members.map((m) => (m.id === userId ? { ...m, is_active: false } : m)) }));
      notify('User deactivated', 'success');
    } catch (e) { notify(e.message || 'Could not deactivate', 'error'); }
  }
  async function complete() {
    try { await adminOpsClient.completeAccessReview(active.review.id, 'Reviewed via Admin Ops'); setActive(null); onChanged(); notify('Review completed', 'success'); }
    catch (e) { notify(e.message || 'Could not complete', 'error'); }
  }

  return (
    <div className="space-y-6">
      <Card
        title="Access review"
        icon={<UserCheck className="h-4 w-4" />}
        action={<Button size="sm" loading={busy} leftIcon={<Play className="h-4 w-4" />} onClick={start}>Start review</Button>}
      >
        {!active ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Start a review to surface members inactive over 90 days and bulk-deactivate them.</p>
        ) : (
          <>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">{active.inactiveCount} of {active.members.length} members are inactive.</p>
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {active.members.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-neutral-900 dark:text-neutral-100">
                    {m.full_name} <span className="text-xs text-neutral-500">· last active {m.last_activity ? smartDate(m.last_activity) : 'never'}</span>
                  </span>
                  {m.inactive && m.is_active ? (
                    <Button size="sm" variant="danger" onClick={() => deactivate(m.id)}>Deactivate</Button>
                  ) : (
                    <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${m.is_active ? 'bg-semantic-success text-white' : 'bg-neutral-300 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200'}`}>{m.is_active ? 'Active' : 'Inactive'}</span>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-3"><Button size="sm" variant="secondary" leftIcon={<Check className="h-4 w-4" />} onClick={complete}>Complete review</Button></div>
          </>
        )}
      </Card>
      <Card title="Past reviews" icon={<Activity className="h-4 w-4" />}>
        {reviews.length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">No reviews yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {reviews.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-neutral-900 dark:text-neutral-100">{smartDate(r.startedAt)} · {r.status}</span>
                <span className="text-neutral-600 dark:text-neutral-400">{r.reviewedCount} reviewed · {r.deactivatedCount} deactivated</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function FunnelTab({ data }) {
  if (!data) return null;
  const { totalWorkspaces = 0, funnelSteps = [], rates = {}, engagement = {} } = data;

  function pct(ratio) { return `${Math.round((ratio || 0) * 100)}%`; }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="First value (7d)" value={pct(rates.firstValueRate7d)} tone="success" />
        <Stat label="Template adopted" value={pct(rates.templateAdoptionRate)} />
        <Stat label="Teammate invited" value={pct(rates.teammateInviteRate)} />
        <Stat label="Day-2 return" value={pct(rates.day2ReturnRate)} />
      </div>

      <Card title="Activation funnel" icon={<TrendingUp className="h-4 w-4" />}>
        <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-4">
          {formatNumber(totalWorkspaces)} total workspace{totalWorkspaces !== 1 ? 's' : ''}
        </p>
        {funnelSteps.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No funnel data yet"
            subtitle="Funnel events appear once workspaces progress through the activation steps."
          />
        ) : (
          <ol className="space-y-4">
            {funnelSteps.map((step) => {
              const pctNum = Math.round((step.rate || 0) * 100);
              return (
                <li key={step.step}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">
                      <span className="text-xs font-mono text-neutral-400 mr-2">#{step.step}</span>
                      {step.name}
                    </span>
                    <span className="text-neutral-600 dark:text-neutral-400 tabular-nums">
                      {formatNumber(step.count)} ws · {pctNum}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-navy dark:bg-brand-navy-tint transition-all duration-base"
                      style={{ width: `${pctNum}%` }}
                      role="progressbar"
                      aria-valuenow={pctNum}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={step.name}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Stat label="Actions (7 days)" value={formatNumber(engagement.meaningfulActions7d)} />
        <Stat label="Actions (30 days)" value={formatNumber(engagement.meaningfulActions30d)} />
      </div>
    </div>
  );
}

function EvidenceTab({ workspaceId, data, onChanged, notify }) {
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);
  const packages = data || [];

  async function generate(framework) {
    setBusy(true);
    try { const p = await adminOpsClient.generateEvidence(workspaceId, framework); setSelected(p); onChanged(); notify('Evidence package generated', 'success'); }
    catch (e) { notify(e.message || 'Could not generate', 'error'); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <Card
        title="Generate evidence package"
        icon={<FileCheck2 className="h-4 w-4" />}
        action={
          <span className="flex gap-2">
            <Button size="sm" variant="action" loading={busy} leftIcon={<Wand2 className="h-4 w-4" />} onClick={() => generate('SOC2')}>SOC 2</Button>
            <Button size="sm" variant="secondary" loading={busy} onClick={() => generate('ISO27001')}>ISO 27001</Button>
          </span>
        }
      >
        {selected ? (
          <pre className="whitespace-pre-wrap text-sm text-neutral-800 dark:text-neutral-200 font-sans bg-neutral-50 dark:bg-neutral-800 rounded-md p-3 max-w-3xl">{selected.content}</pre>
        ) : (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Assemble an audit-ready SOC 2 / ISO 27001 bundle from current controls and activity.</p>
        )}
      </Card>
      <Card title="Generated packages" icon={<Activity className="h-4 w-4" />}>
        {packages.length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">No packages generated yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {packages.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <button type="button" onClick={() => setSelected(p)} className="text-brand-navy-tint hover:underline text-left">
                  {p.framework} · {p.period}
                </button>
                <span className="text-neutral-600 dark:text-neutral-400">{smartDate(p.generatedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
