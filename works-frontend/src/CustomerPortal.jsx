import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/works/button';
import { Badge } from '@/components/works/atoms/badge';
import { api } from '@/lib/apiClient';
import { smartDate } from '@/lib/format';
import { slaLabel, slaTone } from '@/lib/serviceSla';
import { SupportChatWidget } from '@/components/works/organisms/support-chat-widget';
import { EmptyState } from '@/components/works/molecules/empty-state';
import { FileText, Inbox, CheckCircle } from 'lucide-react';

// ── Separate customer session (distinct from the internal bSmartSession) ──────────────
const PORTAL_KEY = 'bSmartPortalSession';

function readPortalSession() {
  try {
    return JSON.parse(localStorage.getItem(PORTAL_KEY) || 'null');
  } catch {
    return null;
  }
}

function portalHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Thin portal API on top of the single apiClient — passes the customer token explicitly. */
function portalApi(token) {
  return {
    get: (path) => api.send(path, { headers: portalHeaders(token) }),
    post: (path, body) => api.send(path, { method: 'POST', body, headers: portalHeaders(token) }),
  };
}

const STATUS_TONE = {
  NEW: 'info', OPEN: 'info', IN_PROGRESS: 'brand', WAITING_CUSTOMER: 'warning',
  RESOLVED: 'success', CLOSED: 'neutral',
};

function StatusBadge({ status }) {
  return <Badge tone={STATUS_TONE[status] || 'neutral'}>{(status || '').replace('_', ' ')}</Badge>;
}

function SlaBadge({ sla }) {
  if (!sla || sla.state === 'NONE') return null;
  return <Badge tone={slaTone(sla.state)}>{slaLabel(sla)}</Badge>;
}

// ── Login ─────────────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    api.send('/portal/auth/login', { method: 'POST', body: { email, password } })
      .then((data) => {
        localStorage.setItem(PORTAL_KEY, JSON.stringify(data));
        onLogin(data);
      })
      .catch((err) => setError(err.message || 'Sign in failed'))
      .finally(() => setBusy(false));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-200 dark:from-neutral-900 dark:to-neutral-800 p-4">
      <div className="w-full max-w-md glass-card p-8 shadow-xl animate-fade-in-up">
        <h1 className="text-2xl font-bold text-brand-navy dark:text-white">Customer Portal</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">Sign in to raise and track your support requests.</p>
        {error && (
          <div className="mt-4 rounded-md bg-semantic-danger-surface p-3 text-sm text-semantic-danger">{error}</div>
        )}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="portal-email" className="mb-1 block text-sm font-medium text-neutral-700">Email</label>
            <input
              id="portal-email" type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-md border border-neutral-300 px-3 text-sm text-neutral-900"
            />
          </div>
          <div>
            <label htmlFor="portal-password" className="mb-1 block text-sm font-medium text-neutral-700">Password</label>
            <input
              id="portal-password" type="password" required value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-md border border-neutral-300 px-3 text-sm text-neutral-900"
            />
          </div>
          <Button type="submit" fullWidth loading={busy}>Sign in</Button>
        </form>
      </div>
    </div>
  );
}

// ── Dynamic request form (per request type, with conditional fields) ───────────────────
function RequestForm({ type, onSubmit, onCancel, busy }) {
  const fields = Array.isArray(type.formSchema) ? type.formSchema
    : (() => { try { return JSON.parse(type.formSchema || '[]'); } catch { return []; } })();
  const [subject, setSubject] = useState('');
  const [values, setValues] = useState({});
  const [error, setError] = useState('');

  const visible = (f) => {
    if (!f.showIf) return true;
    return values[f.showIf.field] === f.showIf.equals;
  };

  const submit = (e) => {
    e.preventDefault();
    setError('');
    if (!subject.trim()) { setError('Please add a short summary.'); return; }
    for (const f of fields) {
      if (f.required && visible(f) && !values[f.key]) {
        setError(`"${f.label}" is required.`);
        return;
      }
    }
    onSubmit({ requestTypeId: type.id, subject: subject.trim(), formData: values });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="req-subject" className="mb-1 block text-sm font-medium text-neutral-700">Summary</label>
        <input
          id="req-subject" type="text" required value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="A short summary of your request"
          className="h-10 w-full rounded-md border border-neutral-300 px-3 text-sm text-neutral-900"
        />
      </div>
      {fields.filter(visible).map((f) => (
        <div key={f.key}>
          <label htmlFor={`f-${f.key}`} className="mb-1 block text-sm font-medium text-neutral-700">
            {f.label}{f.required ? ' *' : ''}
          </label>
          {f.type === 'textarea' ? (
            <textarea
              id={`f-${f.key}`} rows={3} value={values[f.key] || ''}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              className="w-full rounded-md border border-neutral-300 p-3 text-sm text-neutral-900"
            />
          ) : f.type === 'select' ? (
            <select
              id={`f-${f.key}`} value={values[f.key] || ''}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              className="h-10 w-full rounded-md border border-neutral-300 px-3 text-sm text-neutral-900"
            >
              <option value="">Select…</option>
              {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input
              id={`f-${f.key}`} type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
              value={values[f.key] || ''}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              className="h-10 w-full rounded-md border border-neutral-300 px-3 text-sm text-neutral-900"
            />
          )}
        </div>
      ))}
      {error && <p className="text-sm text-semantic-danger">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Back</Button>
        <Button type="submit" loading={busy}>Submit request</Button>
      </div>
    </form>
  );
}

// ── Main portal ─────────────────────────────────────────────────────────────────────────
export default function CustomerPortal() {
  const [session, setSession] = useState(() => readPortalSession());
  const [view, setView] = useState('home');
  const [types, setTypes] = useState([]);
  const [chosenType, setChosenType] = useState(null);
  const [requests, setRequests] = useState([]);
  const [active, setActive] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [articles, setArticles] = useState([]);
  const [article, setArticle] = useState(null);
  const [kbQuery, setKbQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  const token = session?.token;
  const account = session?.account;
  const pApi = useCallback(() => portalApi(token), [token]);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadHome = useCallback(() => {
    pApi().get('/portal/dashboard').then(setDashboard).catch(() => {});
  }, [pApi]);
  const loadRequests = useCallback(() => {
    pApi().get('/portal/requests').then((d) => setRequests(Array.isArray(d) ? d : [])).catch(() => {});
  }, [pApi]);

  useEffect(() => {
    if (!token) return;
    loadHome();
    loadRequests();
  }, [token, loadHome, loadRequests]);

  if (!session) return <LoginScreen onLogin={setSession} />;

  const logout = () => { localStorage.removeItem(PORTAL_KEY); setSession(null); };

  const go = (next) => {
    setView(next);
    if (next === 'home') loadHome();
    if (next === 'requests') loadRequests();
    if (next === 'new') { setChosenType(null); pApi().get('/portal/request-types').then((d) => setTypes(Array.isArray(d) ? d : [])).catch(() => {}); }
    if (next === 'kb') pApi().get('/portal/knowledge').then((d) => setArticles(Array.isArray(d) ? d : [])).catch(() => {});
  };

  const openRequest = (id) => {
    pApi().get(`/portal/requests/${id}`).then((d) => { setActive(d); setView('request'); }).catch(() => {});
  };

  const submitRequest = (payload) => {
    setBusy(true);
    pApi().post('/portal/requests', payload)
      .then((created) => { flash('Request submitted'); setActive(created); setView('request'); loadRequests(); loadHome(); })
      .catch((err) => flash(err.message || 'Could not submit'))
      .finally(() => setBusy(false));
  };

  const searchKb = (e) => {
    e.preventDefault();
    pApi().get(`/portal/knowledge?q=${encodeURIComponent(kbQuery)}`)
      .then((d) => setArticles(Array.isArray(d) ? d : [])).catch(() => {});
  };

  const openArticle = (id) => {
    pApi().get(`/portal/knowledge/${id}`).then((d) => { setArticle(d); setView('article'); }).catch(() => {});
  };

  const submitCsat = (rating, comment) => {
    pApi().post(`/portal/requests/${active.id}/csat`, { rating, comment })
      .then(() => { flash('Thanks for your feedback'); openRequest(active.id); })
      .catch((err) => flash(err.message || 'Could not submit rating'));
  };

  const accent = account?.primaryColor || 'var(--color-brand-navy)';
  const nav = [
    { key: 'home', label: 'Home' },
    { key: 'new', label: 'New request' },
    { key: 'requests', label: 'My requests' },
    { key: 'kb', label: 'Knowledge base' },
  ];

  return (
    <div className="min-h-screen bg-neutral-50" style={{ '--portal-accent': accent }}>
      <header className="text-white" style={{ backgroundColor: 'var(--portal-accent)' }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            {account?.logoUrl
              ? <img src={account.logoUrl} alt={`${account.name} logo`} className="h-8 w-8 rounded" />
              : null}
            <div>
              <p className="text-base font-bold leading-tight">{account?.name || 'Support'}</p>
              <p className="text-xs opacity-90">{account?.tier ? `${account.tier} support` : 'Support portal'}</p>
            </div>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={logout}>Sign out</Button>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 px-4">
          {nav.map((n) => (
            <button
              key={n.key} type="button" onClick={() => go(n.key)}
              className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                view === n.key || (view === 'request' && n.key === 'requests') || (view === 'article' && n.key === 'kb')
                  ? 'border-white text-white'
                  : 'border-transparent text-white/80 hover:text-white'
              }`}
            >
              {n.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {view === 'home' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-neutral-900">Welcome back</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { label: 'Open requests', value: dashboard?.totals?.open ?? 0 },
                { label: 'Resolved', value: dashboard?.totals?.resolved ?? 0 },
                { label: 'Total', value: dashboard?.totals?.total ?? 0 },
                { label: 'SLA at risk', value: dashboard?.totals?.slaBreached ?? 0 },
              ].map((c) => (
                <div key={c.label} className="glass-card p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{c.label}</p>
                  <p className="mt-1 text-3xl font-bold text-brand-navy dark:text-white">{c.value}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={() => go('new')}>Raise a request</Button>
              <Button type="button" variant="secondary" onClick={() => go('kb')}>Search knowledge base</Button>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-neutral-700">Recent resolutions</h3>
              {(dashboard?.recentResolutions || []).length === 0 ? (
                <EmptyState icon={CheckCircle} title="No recent resolutions" description="When your requests are resolved, they will appear here." />
              ) : (
                <ul className="divide-y divide-neutral-100 glass-card">
                  {dashboard.recentResolutions.map((r) => (
                    <li key={r.id}>
                      <button type="button" onClick={() => openRequest(r.id)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-neutral-50">
                        <span className="truncate text-sm text-neutral-900">{r.subject}</span>
                        <StatusBadge status={r.status} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {view === 'new' && (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold text-neutral-900">
              {chosenType ? chosenType.name : 'What can we help with?'}
            </h2>
            {!chosenType ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {types.map((t) => (
                  <button key={t.id} type="button" onClick={() => setChosenType(t)}
                    className="glass-card p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-brand-navy-tint">
                    <p className="font-semibold text-neutral-900">{t.name}</p>
                    <p className="mt-1 text-sm text-neutral-600">{t.description}</p>
                  </button>
                ))}
                {types.length === 0 && <EmptyState icon={FileText} title="No request types" description="There are no request types available." />}
              </div>
            ) : (
              <div className="glass-card p-5 animate-scale-in">
                <RequestForm type={chosenType} busy={busy}
                  onCancel={() => setChosenType(null)} onSubmit={submitRequest} />
              </div>
            )}
          </div>
        )}

        {view === 'requests' && (
          <div className="space-y-4 animate-fade-in-up">
            <h2 className="text-xl font-semibold text-neutral-900">My requests</h2>
            {requests.length === 0 ? (
              <EmptyState icon={Inbox} title="No requests yet" description="You have not raised any requests yet." actionLabel="Raise a request" onAction={() => go('new')} />
            ) : (
              <ul className="divide-y divide-neutral-100 glass-card">
                {requests.map((r) => (
                  <li key={r.id}>
                    <button type="button" onClick={() => openRequest(r.id)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-neutral-50">
                      <span className="flex-1 truncate text-sm text-neutral-900">{r.subject}</span>
                      <SlaBadge sla={r.sla} />
                      <StatusBadge status={r.status} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {view === 'request' && active && (
          <RequestDetail request={active} onBack={() => go('requests')} onCsat={submitCsat} />
        )}

        {view === 'kb' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-neutral-900">Knowledge base</h2>
            <form onSubmit={searchKb} className="flex gap-2">
              <label htmlFor="kb-search" className="sr-only">Search articles</label>
              <input id="kb-search" type="search" value={kbQuery} onChange={(e) => setKbQuery(e.target.value)}
                placeholder="Search articles…"
                className="h-10 flex-1 rounded-md border border-neutral-300 px-3 text-sm text-neutral-900" />
              <Button type="submit" variant="secondary">Search</Button>
            </form>
            {articles.length === 0 ? (
              <EmptyState icon={FileText} title="No articles found" description="We couldn't find any knowledge base articles." />
            ) : (
              <ul className="divide-y divide-neutral-100 glass-card">
                {articles.map((a) => (
                  <li key={a.id}>
                    <button type="button" onClick={() => openArticle(a.id)}
                      className="block w-full px-4 py-3 text-left hover:bg-neutral-50">
                      <span className="text-sm font-medium text-neutral-900">{a.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {view === 'article' && article && (
          <article className="mx-auto max-w-3xl space-y-4">
            <Button type="button" variant="link" onClick={() => go('kb')}>← Back to knowledge base</Button>
            <h2 className="text-2xl font-bold text-neutral-900">{article.title}</h2>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">{article.content}</div>
          </article>
        )}
      </main>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-xl bg-neutral-900 px-5 py-3 text-sm font-medium text-white shadow-xl">
          {toast}
        </div>
      )}

      {/* Iteration 20 (Cap N) — real-time customer chat with AI tier-1 + human escalation. The
          portal token scopes the conversation to this customer's workspace server-side. */}
      <SupportChatWidget
        token={token}
        workspaceId={account?.workspaceId}
        accountId={account?.id}
        customerName={account?.name}
      />
    </div>
  );
}

// ── Request detail + CSAT ───────────────────────────────────────────────────────────────
function RequestDetail({ request, onBack, onCsat }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const canRate = (request.status === 'RESOLVED' || request.status === 'CLOSED') && !request.rated;

  return (
    <div className="space-y-5 animate-fade-in-up">
      <Button type="button" variant="link" onClick={onBack}>← Back to my requests</Button>
      <div className="glass-card p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-semibold text-neutral-900">{request.subject}</h2>
          <div className="flex shrink-0 gap-2">
            <SlaBadge sla={request.sla} />
            <StatusBadge status={request.status} />
          </div>
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          {request.typeKey} · raised {smartDate(request.createdAt)}
          {request.slaDueAt ? ` · due ${smartDate(request.slaDueAt)}` : ''}
        </p>
        {request.description && <p className="mt-4 text-sm text-neutral-700">{request.description}</p>}
      </div>

      {canRate && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-neutral-700">How did we do?</h3>
          <div className="mt-2 flex gap-1" role="group" aria-label="Satisfaction rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" aria-label={`Rate ${n} out of 5`} onClick={() => setRating(n)}
                className={`text-2xl ${n <= rating ? 'text-brand-orange' : 'text-neutral-300'}`}>★</button>
            ))}
          </div>
          <label htmlFor="csat-comment" className="mt-3 mb-1 block text-sm font-medium text-neutral-700">
            Comment (optional)
          </label>
          <textarea id="csat-comment" rows={2} value={comment} onChange={(e) => setComment(e.target.value)}
            className="w-full rounded-md border border-neutral-300 p-3 text-sm text-neutral-900" />
          <div className="mt-3">
            <Button type="button" disabled={rating === 0} onClick={() => onCsat(rating, comment)}>Submit rating</Button>
          </div>
        </div>
      )}
      {request.rated && (
        <p className="text-sm text-semantic-success">Thanks — you have rated this request.</p>
      )}
    </div>
  );
}
