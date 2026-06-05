// Developer Workspace home (iteration 14, Cap U) — the engineer's morning surface.
// Information-dense cards with clear hierarchy: today's work, PRs to review (urgency-ranked),
// blockers, focus mode + time blocking, the standup helper (AI-drafted, editable before posting),
// recent activity, and PRIVATE personal velocity. All HTTP goes through the devClient → apiClient
// (CLAUDE.md §3); tokens only, five interactive states, WCAG-AA (RB-30).

import { useState, useEffect, useCallback } from 'react';
import {
  GitPullRequest, ListTodo, OctagonAlert, Moon, Activity,
  MessageSquareText, Gauge, Copy, Plus, X, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/works/button';
import { devClient, focusUntilLabel } from '@/lib/developer';

function Card({ title, icon, count, children, action }) {
  return (
    <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 flex flex-col">
      <header className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <span className="text-brand-navy dark:text-neutral-300">{icon}</span>
          {title}
          {typeof count === 'number' && (
            <span className="text-xs font-bold text-neutral-600 bg-neutral-100 dark:bg-neutral-800 rounded-full px-2 py-0.5">
              {count}
            </span>
          )}
        </h3>
        {action}
      </header>
      {children}
    </section>
  );
}

function Empty({ children }) {
  return <p className="text-sm text-neutral-600 dark:text-neutral-400 py-3">{children}</p>;
}

function PriorityTag({ priority }) {
  if (!priority) return null;
  const p = String(priority).toUpperCase();
  const tone = p === 'P0' || p === 'CRITICAL'
    ? 'bg-semantic-danger text-white'
    : p === 'HIGH' ? 'bg-semantic-warning text-white'
      : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200';
  return <span className={`text-xs font-bold uppercase tracking-wide rounded-sm px-1.5 py-0.5 ${tone}`}>{p}</span>;
}

export function DeveloperWorkspace({ workspaceId, onOpenItem, onToast }) {
  const [home, setHome] = useState(null);
  const [velocity, setVelocity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [standup, setStandup] = useState(null);
  const [standupDraft, setStandupDraft] = useState('');
  const [busyStandup, setBusyStandup] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [form, setForm] = useState({ title: '', startsAt: '', endsAt: '', allowP0: true });

  const notify = useCallback((msg, type) => onToast?.(msg, type), [onToast]);

  // Fetch + reconcile. State is only ever set inside async callbacks (never synchronously in the
  // effect body) so the load can be reused by the effect and the Refresh/Retry buttons alike.
  const load = useCallback((ref) => {
    if (!workspaceId) return;
    const live = () => !ref || ref.alive;
    Promise.all([devClient.home(workspaceId), devClient.velocity(workspaceId)])
      .then(([h, v]) => { if (live()) { setHome(h); setVelocity(v); setError(null); } })
      .catch((e) => { if (live()) setError(e.message || 'Could not load the Developer Workspace.'); })
      .finally(() => { if (live()) setLoading(false); });
  }, [workspaceId]);

  useEffect(() => {
    const ref = { alive: true };
    load(ref);
    return () => { ref.alive = false; };
  }, [load]);

  const refresh = useCallback(() => { setLoading(true); setError(null); load(); }, [load]);

  const generateStandup = useCallback(() => {
    setBusyStandup(true);
    devClient.standup(workspaceId)
      .then((s) => { setStandup(s); setStandupDraft(s.draft || ''); })
      .catch((e) => notify(e.message || 'Could not draft standup.', 'error'))
      .finally(() => setBusyStandup(false));
  }, [workspaceId, notify]);

  const copyStandup = useCallback(() => {
    if (navigator.clipboard && standupDraft) {
      navigator.clipboard.writeText(standupDraft).then(
        () => notify('Standup copied to clipboard.', 'success'),
        () => notify('Could not copy.', 'error'),
      );
    }
  }, [standupDraft, notify]);

  const submitFocus = useCallback((e) => {
    e.preventDefault();
    if (!form.startsAt || !form.endsAt) { notify('Pick a start and end time.', 'error'); return; }
    setScheduling(true);
    devClient.scheduleFocus(workspaceId, {
      title: form.title,
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
      allowP0: form.allowP0,
    })
      .then(() => { notify('Focus block scheduled.', 'success'); setForm({ title: '', startsAt: '', endsAt: '', allowP0: true }); load(); })
      .catch((err) => notify(err.message || 'Could not schedule focus block.', 'error'))
      .finally(() => setScheduling(false));
  }, [form, workspaceId, notify, load]);

  const cancelFocus = useCallback((id) => {
    devClient.cancelFocus(id)
      .then(() => { notify('Focus block cancelled.', 'success'); load(); })
      .catch((err) => notify(err.message || 'Could not cancel.', 'error'));
  }, [notify, load]);

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading Developer Workspace">
        <div className="h-8 w-64 rounded-md bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-lg bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-semantic-danger/30 rounded-lg p-6 text-center">
        <OctagonAlert className="h-10 w-10 text-semantic-danger mx-auto mb-3" aria-hidden="true" />
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Developer Workspace unavailable</h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">{error}</p>
        <Button variant="secondary" size="sm" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={refresh}>Retry</Button>
      </div>
    );
  }

  const focusStatus = home?.focusStatus;
  const focusLabel = focusUntilLabel(focusStatus);
  const todays = home?.todaysWork || [];
  const queue = home?.reviewQueue || [];
  const blockers = home?.blockers || [];
  const focusBlocks = home?.focusBlocks || [];
  const activity = home?.recentActivity || [];

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Developer Workspace</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Your work, your reviews, your focus — in one place.</p>
        </div>
        <div className="flex items-center gap-3">
          {focusLabel && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-navy dark:text-neutral-200 bg-brand-navy/10 dark:bg-neutral-800 rounded-full px-3 py-1">
              <Moon className="h-3.5 w-3.5" aria-hidden="true" /> {focusLabel}
            </span>
          )}
          <Button variant="secondary" size="sm" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={refresh}>Refresh</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today's work */}
        <Card title="Today's work" icon={<ListTodo className="h-4 w-4" />} count={todays.length}>
          {todays.length === 0 ? <Empty>Nothing assigned and in progress. Pick up an item from the backlog.</Empty> : (
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {todays.map((it) => (
                <li key={it.id}>
                  <button
                    type="button"
                    onClick={() => onOpenItem?.(it.id)}
                    className="w-full text-left flex items-center justify-between gap-3 py-2 rounded-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400">{it.id}</span>
                      <span className="text-sm text-neutral-900 dark:text-neutral-100 truncate">{it.title}</span>
                    </span>
                    <span className="flex items-center gap-2 flex-shrink-0">
                      <PriorityTag priority={it.priority} />
                      <span className="text-xs text-neutral-600 dark:text-neutral-400">{it.status}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* PRs to review */}
        <Card title="PRs to review" icon={<GitPullRequest className="h-4 w-4" />} count={queue.length}>
          {queue.length === 0 ? <Empty>No pull requests are waiting on your review.</Empty> : (
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {queue.map((pr) => (
                <li key={pr.id} className="py-2 flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <a
                      href={pr.url || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-brand-navy-tint hover:text-brand-navy hover:underline truncate block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded-sm"
                    >
                      #{pr.number} {pr.title}
                    </a>
                    <span className="text-xs text-neutral-600 dark:text-neutral-400">{pr.authorName} · {pr.repo}</span>
                  </span>
                  <span className="flex items-center gap-2 flex-shrink-0">
                    <PriorityTag priority={pr.linkedPriority} />
                    <span className="text-xs font-semibold text-brand-orange" title="Urgency score">★ {pr.urgencyScore}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Blockers */}
        <Card title="Blockers" icon={<OctagonAlert className="h-4 w-4" />} count={blockers.length}>
          {blockers.length === 0 ? <Empty>Nothing blocked. 🎉</Empty> : (
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {blockers.map((b) => (
                <li key={b.id} className="py-2 text-sm">
                  <button type="button" onClick={() => onOpenItem?.(b.id)} className="font-mono text-xs text-neutral-600 dark:text-neutral-400 hover:underline">{b.id}</button>
                  <span className="text-neutral-900 dark:text-neutral-100"> {b.title}</span>
                  <span className="block text-xs text-semantic-danger">blocked by {b.blockedBy} — {b.blockerTitle}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Personal velocity — PRIVATE */}
        <Card
          title="Personal velocity"
          icon={<Gauge className="h-4 w-4" />}
          action={<span className="text-xs font-semibold text-semantic-success bg-semantic-success/10 rounded-full px-2 py-0.5">Private · only you</span>}
        >
          {!velocity ? <Empty>No velocity data yet.</Empty> : (
            <dl className="grid grid-cols-2 gap-4">
              <div><dt className="text-xs text-neutral-600 dark:text-neutral-400">Completion rate</dt><dd className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{velocity.completionRate}%</dd></div>
              <div><dt className="text-xs text-neutral-600 dark:text-neutral-400">Avg cycle time</dt><dd className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{velocity.avgCycleTimeDays}d</dd></div>
              <div><dt className="text-xs text-neutral-600 dark:text-neutral-400">Completed (14d)</dt><dd className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{velocity.throughputLast14Days}</dd></div>
              <div><dt className="text-xs text-neutral-600 dark:text-neutral-400">Assigned</dt><dd className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{velocity.assigned}</dd></div>
            </dl>
          )}
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-3">These numbers are never visible to your manager.</p>
        </Card>

        {/* Standup helper */}
        <Card
          title="Standup helper"
          icon={<MessageSquareText className="h-4 w-4" />}
          action={(
            <Button variant="action" size="sm" loading={busyStandup} onClick={generateStandup} leftIcon={<RefreshCw className="h-4 w-4" />}>
              {standup ? 'Redraft' : 'Draft from my work'}
            </Button>
          )}
        >
          {!standup ? <Empty>Draft yesterday / today / blockers from your work item and git activity. You edit before posting.</Empty> : (
            <div className="space-y-2">
              <label htmlFor="standup-draft" className="sr-only">Standup draft</label>
              <textarea
                id="standup-draft"
                value={standupDraft}
                onChange={(e) => setStandupDraft(e.target.value)}
                rows={8}
                className="w-full text-sm font-mono text-neutral-900 dark:text-neutral-100 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-600 dark:text-neutral-400">
                  {standup.meta?.fallback ? 'Deterministic draft (AI off / over budget)' : 'AI-assisted draft'}
                </span>
                <Button variant="secondary" size="sm" leftIcon={<Copy className="h-4 w-4" />} onClick={copyStandup}>Copy</Button>
              </div>
            </div>
          )}
        </Card>

        {/* Focus mode + time blocking */}
        <Card title="Focus mode" icon={<Moon className="h-4 w-4" />} count={focusBlocks.filter((b) => b.status === 'SCHEDULED').length}>
          <form onSubmit={submitFocus} className="space-y-2 mb-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="focus-start" className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">Start</label>
                <input id="focus-start" type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                  className="w-full text-sm border border-neutral-200 dark:border-neutral-700 rounded-md px-2 py-1 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40" />
              </div>
              <div>
                <label htmlFor="focus-end" className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">End</label>
                <input id="focus-end" type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                  className="w-full text-sm border border-neutral-200 dark:border-neutral-700 rounded-md px-2 py-1 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40" />
              </div>
            </div>
            <input aria-label="Focus block title" type="text" placeholder="What are you focusing on?" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full text-sm border border-neutral-200 dark:border-neutral-700 rounded-md px-2 py-1 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40" />
            <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
              <input type="checkbox" checked={form.allowP0} onChange={(e) => setForm({ ...form, allowP0: e.target.checked })} />
              Let P0 incidents break through
            </label>
            <Button type="submit" variant="primary" size="sm" loading={scheduling} leftIcon={<Plus className="h-4 w-4" />} fullWidth>Schedule focus block</Button>
          </form>
          {focusBlocks.filter((b) => b.status === 'SCHEDULED').length === 0 ? <Empty>No focus blocks scheduled.</Empty> : (
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {focusBlocks.filter((b) => b.status === 'SCHEDULED').map((b) => (
                <li key={b.id} className="py-2 flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0">
                    <span className="text-neutral-900 dark:text-neutral-100 truncate block">{b.title}</span>
                    <span className="text-xs text-neutral-600 dark:text-neutral-400">{new Date(b.startsAt).toLocaleString()} – {new Date(b.endsAt).toLocaleTimeString()}</span>
                  </span>
                  <Button variant="ghost" size="icon" aria-label={`Cancel focus block ${b.title}`} onClick={() => cancelFocus(b.id)}><X className="h-4 w-4" /></Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Recent activity */}
        <Card title="Recent activity" icon={<Activity className="h-4 w-4" />}>
          {activity.length === 0 ? <Empty>No recent activity.</Empty> : (
            <ul className="space-y-1.5">
              {activity.map((a, i) => (
                <li key={`${a.aggregateId}-${i}`} className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-2">
                  <span className="font-mono text-neutral-900 dark:text-neutral-200">{a.aggregateId}</span>
                  <span>{String(a.eventType).replace(/_/g, ' ').toLowerCase()}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
