import { useCallback, useEffect, useState } from 'react';
import {
  Headset, Plus, Trash2, UserPlus, AlertTriangle, Star, Link2, BookOpen,
} from 'lucide-react';
import { api } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/works/atoms/badge';
import { SlaCountdownBadge } from '@/components/works/molecules/sla-countdown-badge';
import { absoluteDateTime } from '@/lib/format';

// Organism — internal Service Management surface (iteration 9, Cap N + Cap M). Five tabs: Queues
// (agent work — All open / Mine / Unassigned / High priority, with assign + status + CSAT view +
// link), Request types (admin CRUD of the portal catalogue + form schema), Customers (org admin +
// tier + branding), CSAT (trend rollup), and Portal KB (publish/unpublish internal articles). All
// HTTP via the apiClient; token classes only; every interactive element labelled; loading/empty/
// error states explicit (RB-30 §6). Writes are gated server-side by manage_service — the UI hides
// write controls when canManage is false, but the API is the real guard (RB-40 §1).

const TABS = [
  { id: 'queues', label: 'Queues' },
  { id: 'types', label: 'Request types' },
  { id: 'customers', label: 'Customers' },
  { id: 'csat', label: 'CSAT' },
  { id: 'kb', label: 'Portal KB' },
];

const QUEUES = [
  { id: 'all', label: 'All open' },
  { id: 'mine', label: 'Mine' },
  { id: 'unassigned', label: 'Unassigned' },
  { id: 'high', label: 'High priority' },
];

const STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'];
const CATEGORIES = ['INCIDENT', 'CHANGE_REQUEST', 'SERVICE_REQUEST', 'CUSTOM'];
const TIERS = ['PLATINUM', 'GOLD', 'SILVER'];

// Shared button styles (token classes only; navy primary keeps orange reserved for the one CTA).
const BTN_PRIMARY = 'inline-flex items-center gap-2 rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-navy/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_GHOST = 'inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800';

export function ServiceManagementView({ workspaceId, canManage = false, onToast }) {
  const [tab, setTab] = useState('queues');
  const [queue, setQueue] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requests, setRequests] = useState([]);
  const [types, setTypes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [csat, setCsat] = useState(null);
  const [articles, setArticles] = useState([]);
  const [expanded, setExpanded] = useState(null);

  const toast = useCallback((msg, type) => onToast?.(msg, type), [onToast]);

  // Loader is await-first: no setState runs synchronously in the effect (react-hooks/set-state-in-effect).
  const load = useCallback(async () => {
    if (!workspaceId) return;
    try {
      if (tab === 'queues') {
        const d = await api.send(`/service/requests?workspaceId=${workspaceId}&queue=${queue}`);
        setRequests(Array.isArray(d) ? d : []);
      } else if (tab === 'types') {
        const d = await api.send(`/service/request-types?workspaceId=${workspaceId}`);
        setTypes(Array.isArray(d) ? d : []);
      } else if (tab === 'customers') {
        const d = await api.send(`/service/organizations?workspaceId=${workspaceId}`);
        setCustomers(Array.isArray(d) ? d : []);
      } else if (tab === 'csat') {
        setCsat(await api.send(`/service/requests/csat?workspaceId=${workspaceId}`));
      } else if (tab === 'kb') {
        const d = await api.send(`/service/requests/kb?workspaceId=${workspaceId}`);
        setArticles(Array.isArray(d) ? d : []);
      }
      setError(null);
    } catch (e) {
      setError(e.message || 'Could not load service data.');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, tab, queue]);

  // Fetch the active tab's data on mount and whenever it changes. `load` is await-first; the
  // post-await setState is the documented data-in-effect pattern used across this app.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  function selectTab(id) {
    if (id === tab) return;
    setLoading(true);
    setError(null);
    setExpanded(null);
    setTab(id);
  }

  function selectQueue(id) {
    if (id === queue) return;
    setLoading(true);
    setError(null);
    setExpanded(null);
    setQueue(id);
  }

  function reload() {
    setLoading(true);
    load();
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <header className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-semantic-info-surface">
          <Headset aria-hidden="true" className="h-5 w-5 text-semantic-info" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">Service Management</h1>
          <p className="text-sm text-neutral-600">
            Customer requests, agent queues, customer-facing SLAs and the portal knowledge base.
          </p>
        </div>
      </header>

      <div role="tablist" aria-label="Service management sections" className="mb-6 flex gap-1 border-b border-neutral-200 dark:border-neutral-700">
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

      {tab === 'queues' && (
        <div role="tablist" aria-label="Agent queue filters" className="mb-4 flex flex-wrap gap-2">
          {QUEUES.map((q) => (
            <button
              key={q.id}
              type="button"
              role="tab"
              aria-selected={queue === q.id}
              onClick={() => selectQueue(q.id)}
              className={cn(
                'rounded-full px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40',
                queue === q.id
                  ? 'bg-brand-navy text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300'
              )}
            >
              {q.label}
            </button>
          ))}
        </div>
      )}

      {loading && <SkeletonRows />}
      {!loading && error && <ErrorState message={error} onRetry={reload} />}

      {!loading && !error && tab === 'queues' && (
        <QueueTab
          requests={requests} canManage={canManage} expanded={expanded}
          setExpanded={setExpanded} onChanged={load} toast={toast}
        />
      )}
      {!loading && !error && tab === 'types' && (
        <TypesTab workspaceId={workspaceId} canManage={canManage} types={types} onChanged={load} toast={toast} />
      )}
      {!loading && !error && tab === 'customers' && (
        <CustomersTab workspaceId={workspaceId} canManage={canManage} customers={customers} onChanged={load} toast={toast} />
      )}
      {!loading && !error && tab === 'csat' && <CsatTab csat={csat} />}
      {!loading && !error && tab === 'kb' && (
        <KbTab workspaceId={workspaceId} canManage={canManage} articles={articles} onChanged={load} toast={toast} />
      )}
    </div>
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

const PRIORITY_TONE = { CRITICAL: 'danger', HIGH: 'warning', MEDIUM: 'info', LOW: 'neutral' };
const STATUS_TONE = { OPEN: 'info', IN_PROGRESS: 'warning', WAITING: 'neutral', RESOLVED: 'success', CLOSED: 'neutral' };

// ── Queues ───────────────────────────────────────────────────────────────────

function QueueTab({ requests, canManage, expanded, setExpanded, onChanged, toast }) {
  if (requests.length === 0) {
    return <EmptyState icon={Headset} title="No requests in this queue"
      hint="Requests customers raise from the portal land here, ready to triage." />;
  }
  return (
    <ul className="space-y-2">
      {requests.map((r) => (
        <li key={r.id} className="rounded-lg border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate font-semibold text-neutral-900 dark:text-neutral-50">{r.subject}</span>
                <Badge tone={STATUS_TONE[r.status] || 'neutral'}>{String(r.status).replace('_', ' ')}</Badge>
                <Badge tone={PRIORITY_TONE[r.priority] || 'neutral'}>{r.priority}</Badge>
                {r.csatRating != null && <Badge tone="success"><Star aria-hidden="true" className="h-3 w-3" /> {r.csatRating}/5</Badge>}
              </div>
              <p className="truncate font-mono text-xs text-neutral-500">{r.id}{r.workItemId ? ` · ${r.workItemId}` : ''}</p>
            </div>
            <button type="button" className={BTN_GHOST} onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
              {expanded === r.id ? 'Close' : 'Open'}
            </button>
          </div>
          {expanded === r.id && (
            <RequestDetail requestId={r.id} canManage={canManage} onChanged={onChanged} toast={toast} />
          )}
        </li>
      ))}
    </ul>
  );
}

function RequestDetail({ requestId, canManage, onChanged, toast }) {
  const [detail, setDetail] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [workItemId, setWorkItemId] = useState('');

  const load = useCallback(async () => {
    try {
      const d = await api.send(`/service/requests/${requestId}`);
      setDetail(d);
      setWorkItemId(d?.request?.workItemId || '');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoaded(true);
    }
  }, [requestId, toast]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  async function act(path, body, message) {
    try {
      await api.send(`/service/requests/${requestId}/${path}`, { method: 'POST', body: JSON.stringify(body || {}) });
      toast(message, 'success');
      load();
      onChanged();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  if (!loaded) return <div className="border-t border-neutral-200 dark:border-neutral-700 p-4"><SkeletonRows /></div>;
  if (!detail) return null;

  const req = detail.request || {};
  const sla = Array.isArray(detail.sla) ? detail.sla : [];

  return (
    <div className="space-y-4 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        {detail.tier && <Badge tone="info">{detail.tier} tier</Badge>}
        {detail.organization?.name && <span className="text-sm text-neutral-600">{detail.organization.name}</span>}
      </div>
      {req.description && <p className="text-sm text-neutral-700 dark:text-neutral-300">{req.description}</p>}

      {sla.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {sla.map((s) => (
            <SlaCountdownBadge key={s.id} metric={s.metric} state={s.state} band={s.band} remainingMinutes={s.remainingMinutes} />
          ))}
        </div>
      )}

      {req.csatRating != null && (
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          <Star aria-hidden="true" className="mr-1 inline h-4 w-4 text-semantic-warning" />
          CSAT {req.csatRating}/5{req.csatComment ? ` — "${req.csatComment}"` : ''}
        </p>
      )}

      {canManage && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={BTN_GHOST} onClick={() => act('assign', {}, 'Assigned to you')}>
              <UserPlus aria-hidden="true" className="h-4 w-4" /> Take it
            </button>
            <label className="inline-flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Status</span>
              <select className="input" value={req.status}
                onChange={(e) => act('status', { status: e.target.value }, 'Status updated')}>
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Linked work item</span>
              <input className="input font-mono" value={workItemId} placeholder="WI-1234"
                onChange={(e) => setWorkItemId(e.target.value)} />
            </label>
            <button type="button" className={BTN_PRIMARY} onClick={() => act('link', { workItemId }, 'Work item linked')}>
              <Link2 aria-hidden="true" className="h-4 w-4" /> Link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Request types ────────────────────────────────────────────────────────────

function TypesTab({ workspaceId, canManage, types, onChanged, toast }) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: '', category: 'SERVICE_REQUEST', description: '', formSchema: '[]' });

  async function create(e) {
    e.preventDefault();
    if (!draft.name.trim()) return;
    try {
      await api.send('/service/request-types', {
        method: 'POST',
        body: JSON.stringify({ workspaceId, name: draft.name.trim(), category: draft.category, description: draft.description, formSchema: draft.formSchema }),
      });
      toast('Request type created', 'success');
      setCreating(false);
      setDraft({ name: '', category: 'SERVICE_REQUEST', description: '', formSchema: '[]' });
      onChanged();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function remove(t) {
    try {
      await api.send(`/service/request-types/${t.id}`, { method: 'DELETE' });
      toast('Request type deleted', 'success');
      onChanged();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <div className="space-y-4">
      {canManage && (
        creating ? (
          <form onSubmit={create} className="space-y-3 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
            <Field label="Type name">
              <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Report an outage" />
            </Field>
            <Field label="Category">
              <select className="input" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
              </select>
            </Field>
            <Field label="Description">
              <input className="input" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="For power supply interruptions" />
            </Field>
            <Field label="Form schema (JSON) — fields shown on the portal">
              <textarea className="input font-mono" rows={3} value={draft.formSchema}
                onChange={(e) => setDraft({ ...draft, formSchema: e.target.value })}
                placeholder='[{"key":"meter","label":"Meter number","type":"text","required":true}]' />
            </Field>
            <div className="flex gap-2">
              <button type="submit" className={BTN_PRIMARY}>Create type</button>
              <button type="button" className={BTN_GHOST} onClick={() => setCreating(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          <button type="button" className={BTN_PRIMARY} onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" className="h-4 w-4" /> New request type
          </button>
        )
      )}

      {types.length === 0 ? (
        <EmptyState icon={Headset} title="No request types yet"
          hint={canManage ? 'Define the things a customer can raise from their portal.' : 'An admin has not defined any request types yet.'} />
      ) : (
        <ul className="space-y-2">
          {types.map((t) => (
            <li key={t.id} className="flex items-center gap-3 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold text-neutral-900 dark:text-neutral-50">{t.name}</span>
                  <Badge tone="info">{String(t.category).replace('_', ' ')}</Badge>
                  <Badge tone={t.active ? 'success' : 'neutral'}>{t.active ? 'Active' : 'Inactive'}</Badge>
                </div>
                {t.description && <p className="truncate text-sm text-neutral-600">{t.description}</p>}
              </div>
              {canManage && (
                <IconButton label="Delete request type" onClick={() => remove(t)}><Trash2 className="h-4 w-4" /></IconButton>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Customers ────────────────────────────────────────────────────────────────

function CustomersTab({ workspaceId, canManage, customers, onChanged, toast }) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: '', tier: 'SILVER', subdomain: '', primaryColor: '' });

  async function create(e) {
    e.preventDefault();
    if (!draft.name.trim()) return;
    try {
      await api.send('/service/organizations', {
        method: 'POST',
        body: JSON.stringify({ workspaceId, name: draft.name.trim(), tier: draft.tier, subdomain: draft.subdomain || null, primaryColor: draft.primaryColor || null }),
      });
      toast('Customer created', 'success');
      setCreating(false);
      setDraft({ name: '', tier: 'SILVER', subdomain: '', primaryColor: '' });
      onChanged();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function remove(c) {
    try {
      await api.send(`/service/organizations/${c.id}`, { method: 'DELETE' });
      toast('Customer deleted', 'success');
      onChanged();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <div className="space-y-4">
      {canManage && (
        creating ? (
          <form onSubmit={create} className="space-y-3 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
            <Field label="Customer name">
              <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Acme Power Utility" />
            </Field>
            <Field label="SLA tier">
              <select className="input" value={draft.tier} onChange={(e) => setDraft({ ...draft, tier: e.target.value })}>
                {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Portal subdomain">
              <input className="input" value={draft.subdomain} onChange={(e) => setDraft({ ...draft, subdomain: e.target.value })} placeholder="acme" />
            </Field>
            <Field label="Brand accent (hex)">
              <input className="input font-mono" value={draft.primaryColor} onChange={(e) => setDraft({ ...draft, primaryColor: e.target.value })} placeholder="#RRGGBB" />
            </Field>
            <div className="flex gap-2">
              <button type="submit" className={BTN_PRIMARY}>Create customer</button>
              <button type="button" className={BTN_GHOST} onClick={() => setCreating(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          <button type="button" className={BTN_PRIMARY} onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" className="h-4 w-4" /> New customer
          </button>
        )
      )}

      {customers.length === 0 ? (
        <EmptyState icon={Headset} title="No customers yet"
          hint={canManage ? 'Add a customer organization to give it a branded portal and a tier.' : 'No customer organizations are configured yet.'} />
      ) : (
        <ul className="space-y-2">
          {customers.map((c) => (
            <li key={c.id} className="flex items-center gap-3 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold text-neutral-900 dark:text-neutral-50">{c.name}</span>
                  <Badge tone="info">{c.tier}</Badge>
                  <Badge tone={c.active ? 'success' : 'neutral'}>{c.active ? 'Active' : 'Inactive'}</Badge>
                </div>
                {c.subdomain && <p className="truncate text-xs text-neutral-500">{c.subdomain}</p>}
              </div>
              {canManage && (
                <IconButton label="Delete customer" onClick={() => remove(c)}><Trash2 className="h-4 w-4" /></IconButton>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── CSAT ─────────────────────────────────────────────────────────────────────

function CsatTab({ csat }) {
  if (!csat || !csat.count) {
    return <EmptyState icon={Star} title="No CSAT responses yet"
      hint="Ratings appear here once customers rate their resolved requests." />;
  }
  const dist = csat.distribution || {};
  const max = Math.max(1, ...[5, 4, 3, 2, 1].map((s) => Number(dist[s] || 0)));
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Average</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-50">{csat.average} / 5</p>
        </div>
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Responses</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-50">{csat.count}</p>
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">Distribution</h3>
        <ul className="space-y-2">
          {[5, 4, 3, 2, 1].map((s) => {
            const v = Number(dist[s] || 0);
            return (
              <li key={s} className="flex items-center gap-3 text-sm">
                <span className="w-10 text-neutral-700 dark:text-neutral-300">{s} ★</span>
                <span className="h-3 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <span className="block h-full rounded-full bg-brand-navy" style={{ width: `${(v / max) * 100}%` }} />
                </span>
                <span className="w-8 text-right text-neutral-600">{v}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// ── Portal KB ────────────────────────────────────────────────────────────────

function KbTab({ workspaceId, canManage, articles, onChanged, toast }) {
  const [publishing, setPublishing] = useState(false);
  const [draft, setDraft] = useState({ articleId: '', title: '', body: '' });

  async function publish(e) {
    e.preventDefault();
    if (!draft.title.trim()) return;
    try {
      await api.send(`/service/requests/kb?workspaceId=${workspaceId}`, {
        method: 'POST',
        body: JSON.stringify({ articleId: draft.articleId || null, title: draft.title.trim(), body: draft.body }),
      });
      toast('Article published to portal', 'success');
      setPublishing(false);
      setDraft({ articleId: '', title: '', body: '' });
      onChanged();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function unpublish(a) {
    try {
      await api.send(`/service/requests/kb/${a.id}`, { method: 'DELETE' });
      toast('Article removed from portal', 'success');
      onChanged();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <div className="space-y-4">
      {canManage && (
        publishing ? (
          <form onSubmit={publish} className="space-y-3 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
            <Field label="Source article id (optional)">
              <input className="input font-mono" value={draft.articleId} onChange={(e) => setDraft({ ...draft, articleId: e.target.value })} placeholder="ART-1234" />
            </Field>
            <Field label="Title">
              <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="How to report an outage" />
            </Field>
            <Field label="Body">
              <textarea className="input" rows={4} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} placeholder="Customer-facing article text…" />
            </Field>
            <div className="flex gap-2">
              <button type="submit" className={BTN_PRIMARY}>Publish</button>
              <button type="button" className={BTN_GHOST} onClick={() => setPublishing(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          <button type="button" className={BTN_PRIMARY} onClick={() => setPublishing(true)}>
            <BookOpen aria-hidden="true" className="h-4 w-4" /> Publish article
          </button>
        )
      )}

      {articles.length === 0 ? (
        <EmptyState icon={BookOpen} title="Nothing published to the portal yet"
          hint={canManage ? 'Publish an internal KB article so customers can self-serve.' : 'No articles have been published to the portal yet.'} />
      ) : (
        <ul className="space-y-2">
          {articles.map((a) => (
            <li key={a.id} className="flex items-center gap-3 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
              <div className="min-w-0 flex-1">
                <span className="truncate font-semibold text-neutral-900 dark:text-neutral-50">{a.title}</span>
                <p className="text-xs text-neutral-500">Published {absoluteDateTime(a.publishedAt)}</p>
              </div>
              {canManage && (
                <IconButton label="Unpublish article" onClick={() => unpublish(a)}><Trash2 className="h-4 w-4" /></IconButton>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Small shared building blocks ────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
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
