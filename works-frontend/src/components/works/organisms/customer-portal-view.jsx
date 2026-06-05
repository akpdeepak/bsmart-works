import { useCallback, useEffect, useState } from 'react';
import {
  LifeBuoy, Send, BookOpen, Star, AlertTriangle, Search,
} from 'lucide-react';
import { api } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/works/atoms/badge';
import { SlaCountdownBadge } from '@/components/works/molecules/sla-countdown-badge';
import { absoluteDateTime } from '@/lib/format';

// Organism — the customer-facing PORTAL surface (iteration 9, Cap N + Cap M). A deliberately
// lighter, friendlier identity than internal Works (RB-20 §4, iteration-9 UX note): a customer signs
// in to their org's portal, submits a request by type (with its dynamic form), tracks "my requests"
// with status + live SLA countdown, browses/searches the published KB, and rates a resolved request.
// The portal account is a SEPARATE identity (Cap N): this component holds its own portal JWT in
// state and passes it explicitly as the Authorization header, never touching the internal session.
// All HTTP via the apiClient; token classes only; loading/empty/error states explicit (RB-30 §6).

const TABS = [
  { id: 'new', label: 'New request' },
  { id: 'mine', label: 'My requests' },
  { id: 'kb', label: 'Knowledge base' },
];

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUS_TONE = { OPEN: 'info', IN_PROGRESS: 'warning', WAITING: 'neutral', RESOLVED: 'success', CLOSED: 'neutral' };

const BTN_PRIMARY = 'inline-flex items-center gap-2 rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-navy/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_GHOST = 'inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800';

export function CustomerPortalView({ subdomain = '', onToast }) {
  const [session, setSession] = useState(null); // { token, account, organization }

  const toast = useCallback((msg, type) => onToast?.(msg, type), [onToast]);

  if (!session) {
    return <PortalAuth subdomain={subdomain} onSignedIn={setSession} toast={toast} />;
  }
  return <PortalApp session={session} onSignOut={() => setSession(null)} toast={toast} />;
}

// ── Auth (separate external identity) ──────────────────────────────────────────

function PortalAuth({ subdomain, onSignedIn, toast }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ subdomain, email: '', fullName: '', password: '' });
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const path = mode === 'login' ? '/portal/auth/login' : '/portal/auth/register';
      const body = mode === 'login'
        ? { subdomain: form.subdomain, email: form.email, password: form.password }
        : { subdomain: form.subdomain, email: form.email, fullName: form.fullName, password: form.password };
      const res = await api.raw(path, { method: 'POST', body: JSON.stringify(body) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
        throw new Error(err.message || 'Sign in failed.');
      }
      onSignedIn(await res.json());
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <header className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-semantic-info-surface">
          <LifeBuoy aria-hidden="true" className="h-5 w-5 text-semantic-info" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">Customer Portal</h1>
          <p className="text-sm text-neutral-600">Sign in to raise and track your support requests.</p>
        </div>
      </header>

      <form onSubmit={submit} className="space-y-3 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6">
        <Field label="Portal">
          <input className="input" value={form.subdomain} onChange={(e) => setForm({ ...form, subdomain: e.target.value })} placeholder="acme" />
        </Field>
        {mode === 'register' && (
          <Field label="Full name">
            <input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Jane Operator" />
          </Field>
        )}
        <Field label="Email">
          <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@acme.example" />
        </Field>
        <Field label="Password">
          <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className={BTN_PRIMARY} disabled={busy}>
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
          <button type="button" className="text-sm font-semibold text-brand-navy hover:underline dark:text-brand-navy-tint"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'New here? Create an account' : 'Have an account? Sign in'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Authenticated portal ───────────────────────────────────────────────────────

function PortalApp({ session, onSignOut, toast }) {
  const [tab, setTab] = useState('mine');
  const token = session.token;

  // Every portal call carries the portal JWT explicitly so the internal session is never used.
  const portalGet = useCallback(
    (path) => api.send(path, { headers: { Authorization: `Bearer ${token}` } }),
    [token],
  );
  const portalPost = useCallback(
    (path, body) => api.send(path, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }),
    [token],
  );

  return (
    <div className="mx-auto max-w-3xl p-6">
      <header className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-semantic-info-surface">
          <LifeBuoy aria-hidden="true" className="h-5 w-5 text-semantic-info" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">{session.organization?.name || 'Customer Portal'}</h1>
          <p className="text-sm text-neutral-600">Signed in as {session.account?.email}</p>
        </div>
        <button type="button" className={BTN_GHOST} onClick={onSignOut}>Sign out</button>
      </header>

      <div role="tablist" aria-label="Portal sections" className="mb-6 flex gap-1 border-b border-neutral-200 dark:border-neutral-700">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
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

      {tab === 'new' && <NewRequest portalGet={portalGet} portalPost={portalPost} toast={toast} onCreated={() => setTab('mine')} />}
      {tab === 'mine' && <MyRequests portalGet={portalGet} portalPost={portalPost} toast={toast} />}
      {tab === 'kb' && <PortalKb portalGet={portalGet} toast={toast} />}
    </div>
  );
}

// ── New request (2-step: pick type → fill form) ─────────────────────────────────

function NewRequest({ portalGet, portalPost, toast, onCreated }) {
  const [types, setTypes] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({ requestTypeId: '', subject: '', description: '', priority: 'MEDIUM', formData: {} });

  const load = useCallback(async () => {
    try {
      const d = await portalGet('/portal/request-types');
      setTypes(Array.isArray(d) ? d : []);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoaded(true);
    }
  }, [portalGet, toast]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const selectedType = types.find((t) => t.id === form.requestTypeId);
  const fields = parseSchema(selectedType?.formSchema);

  async function submit(e) {
    e.preventDefault();
    if (!form.subject.trim()) return;
    try {
      await portalPost('/portal/requests', {
        requestTypeId: form.requestTypeId || null,
        subject: form.subject.trim(),
        description: form.description,
        priority: form.priority,
        formData: JSON.stringify(form.formData),
      });
      toast('Request submitted', 'success');
      onCreated();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  if (!loaded) return <SkeletonRows />;

  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6">
      <Field label="What do you need help with?">
        <select className="input" value={form.requestTypeId} onChange={(e) => setForm({ ...form, requestTypeId: e.target.value, formData: {} })}>
          <option value="">General request</option>
          {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Field>
      <Field label="Subject">
        <input className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Power outage in sector 4" />
      </Field>
      <Field label="Priority">
        <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </Field>
      <Field label="Details">
        <textarea className="input" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Tell us what happened…" />
      </Field>

      {fields.map((f) => (
        <Field key={f.key} label={`${f.label || f.key}${f.required ? ' *' : ''}`}>
          {Array.isArray(f.options) && f.options.length > 0 ? (
            <select className="input" value={form.formData[f.key] || ''}
              onChange={(e) => setForm({ ...form, formData: { ...form.formData, [f.key]: e.target.value } })}>
              <option value="">Select…</option>
              {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input className="input" value={form.formData[f.key] || ''}
              onChange={(e) => setForm({ ...form, formData: { ...form.formData, [f.key]: e.target.value } })} />
          )}
        </Field>
      ))}

      <button type="submit" className={BTN_PRIMARY}><Send aria-hidden="true" className="h-4 w-4" /> Submit request</button>
    </form>
  );
}

// ── My requests (status + SLA countdown + CSAT) ─────────────────────────────────

function MyRequests({ portalGet, portalPost, toast }) {
  const [requests, setRequests] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const d = await portalGet('/portal/requests');
      setRequests(Array.isArray(d) ? d : []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Could not load your requests.');
    } finally {
      setLoaded(true);
    }
  }, [portalGet]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  async function rate(r, rating) {
    try {
      await portalPost(`/portal/requests/${r.id}/csat`, { rating, comment: '' });
      toast(`Thanks — rated ${rating}/5`, 'success');
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  if (!loaded) return <SkeletonRows />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (requests.length === 0) {
    return <EmptyState icon={LifeBuoy} title="No requests yet"
      hint="When you raise a request it will appear here with its status and SLA countdown." />;
  }

  return (
    <ul className="space-y-2">
      {requests.map((r) => {
        const sla = Array.isArray(r.sla) ? r.sla : [];
        return (
          <li key={r.id} className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate font-semibold text-neutral-900 dark:text-neutral-50">{r.subject}</span>
              <Badge tone={STATUS_TONE[r.status] || 'neutral'}>{String(r.status).replace('_', ' ')}</Badge>
              <span className="ml-auto text-xs text-neutral-500">{absoluteDateTime(r.createdAt)}</span>
            </div>
            {sla.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {sla.map((s, i) => (
                  <SlaCountdownBadge key={i} metric={s.metric} state={s.state} band={s.band} remainingMinutes={s.remainingMinutes} />
                ))}
              </div>
            )}
            {(r.status === 'RESOLVED' || r.status === 'CLOSED') && r.csatRating == null && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-neutral-600">Rate this resolution:</span>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" aria-label={`Rate ${n} out of 5`} onClick={() => rate(r, n)}
                    className="rounded-md p-1 text-neutral-400 transition-colors hover:text-semantic-warning focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40">
                    <Star aria-hidden="true" className="h-5 w-5" />
                  </button>
                ))}
              </div>
            )}
            {r.csatRating != null && (
              <p className="mt-2 text-sm text-neutral-600">
                <Star aria-hidden="true" className="mr-1 inline h-4 w-4 text-semantic-warning" /> You rated this {r.csatRating}/5
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ── Portal KB ──────────────────────────────────────────────────────────────────

function PortalKb({ portalGet, toast }) {
  const [articles, setArticles] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [q, setQ] = useState('');

  const load = useCallback(async (query) => {
    try {
      const path = query ? `/portal/kb?q=${encodeURIComponent(query)}` : '/portal/kb';
      const d = await portalGet(path);
      setArticles(Array.isArray(d) ? d : []);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoaded(true);
    }
  }, [portalGet, toast]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(''); }, [load]);

  function search(e) {
    e.preventDefault();
    setLoaded(false);
    load(q.trim());
  }

  return (
    <div className="space-y-4">
      <form onSubmit={search} className="flex items-end gap-2">
        <label className="block flex-1">
          <span className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Search the knowledge base</span>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="outage, billing, meter…" />
        </label>
        <button type="submit" className={BTN_GHOST}><Search aria-hidden="true" className="h-4 w-4" /> Search</button>
      </form>

      {!loaded ? <SkeletonRows /> : articles.length === 0 ? (
        <EmptyState icon={BookOpen} title="No articles found"
          hint="Try a different search, or check back later for new help articles." />
      ) : (
        <ul className="space-y-2">
          {articles.map((a) => (
            <li key={a.id} className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">{a.title}</h3>
              {a.body && <p className="mt-1 line-clamp-3 text-sm text-neutral-600">{a.body}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Small shared building blocks ────────────────────────────────────────────────

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

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
      {children}
    </label>
  );
}

function parseSchema(formSchema) {
  if (!formSchema) return [];
  try {
    const arr = typeof formSchema === 'string' ? JSON.parse(formSchema) : formSchema;
    return Array.isArray(arr) ? arr.filter((f) => f && f.key) : [];
  } catch {
    return [];
  }
}
