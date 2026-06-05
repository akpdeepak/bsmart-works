import { useCallback, useEffect, useMemo, useState } from 'react';
import { Lock, ShieldCheck, Share2, TrendingUp, X, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/apiClient';
import { BarChart } from '@/components/works/molecules';

// Organism — the layered KPI / Performance dashboard (iteration 12, Cap L).
// Layers: Individual / Team / Project / Manager / Org. Individual data is private by default;
// everything above is aggregated, and the privacy guarantee is enforced server-side (the API
// returns 403 / suppressed values) — this UI only reflects it. RB-30 tokens + five states + a11y.

const LAYERS = [
  { id: 'PERSONAL', label: 'Individual' },
  { id: 'TEAM', label: 'Team' },
  { id: 'PROJECT', label: 'Project' },
  { id: 'MANAGER', label: 'Manager' },
  { id: 'ORG', label: 'Organization' },
];

const UNIT_SUFFIX = { percent: '%', days: 'd', hours: 'h', points: ' pts', count: '' };

function formatValue(metric) {
  if (metric.value === null || metric.value === undefined) return null;
  const suffix = UNIT_SUFFIX[metric.unit] ?? '';
  return `${metric.value}${suffix}`;
}

function bandClasses(band) {
  if (band === 'HEALTHY') return 'bg-semantic-success/10 text-semantic-success border-semantic-success/30';
  if (band === 'WATCH') return 'bg-semantic-warning/10 text-semantic-warning border-semantic-warning/30';
  return 'bg-semantic-danger/10 text-semantic-danger border-semantic-danger/30';
}

function MetricCard({ metric }) {
  const display = formatValue(metric);
  const unavailable = metric.available === false;
  const suppressed = metric.suppressed === true;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide font-semibold text-neutral-600">{metric.name}</span>
      {unavailable ? (
        <span className="text-sm text-neutral-400" title={metric.unavailableReason}>Not yet measured</span>
      ) : suppressed ? (
        <span className="inline-flex items-center gap-1 text-sm text-neutral-400">
          <Lock className="h-4 w-4" aria-hidden="true" /> Hidden
        </span>
      ) : (
        <span className="text-2xl font-bold text-neutral-900">{display}</span>
      )}
      {metric.description && (
        <span className="text-xs text-neutral-600">{metric.description}</span>
      )}
    </div>
  );
}

function HealthDimension({ label, score }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-neutral-700">{label}</span>
        <span className="text-neutral-600">{score}%</span>
      </div>
      <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
        <div className="h-full rounded-full bg-brand-navy" style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
      </div>
    </div>
  );
}

export function PerformanceDashboard({ workspaceId, currentUser, users = [], teams = [], projects = [], onToast }) {
  const [layer, setLayer] = useState('PERSONAL');
  const [teamId, setTeamId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [view, setView] = useState(null);
  const [health, setHealth] = useState(null);
  const [cycle, setCycle] = useState(null);
  const [settings, setSettings] = useState(null);
  const [grants, setGrants] = useState([]);
  const [shareWith, setShareWith] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const aggregated = layer !== 'PERSONAL';
  const notify = useCallback((message, type) => onToast?.(message, type), [onToast]);

  const params = useMemo(() => {
    const p = new URLSearchParams({ workspaceId, layer });
    if (layer === 'TEAM' && teamId) p.set('teamId', teamId);
    if (layer === 'MANAGER' && teamId) p.set('teamId', teamId);
    if (layer === 'PROJECT' && projectId) p.set('projectId', projectId);
    return p.toString();
  }, [workspaceId, layer, teamId, projectId]);

  useEffect(() => {
    if (!workspaceId) return undefined;
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [v, h, c] = await Promise.all([
          api.send(`/kpi/view?${params}`),
          aggregated ? api.send(`/kpi/team-health?${params}`).catch(() => null) : Promise.resolve(null),
          api.send(`/kpi/cycle-time?${params}`).catch(() => null),
        ]);
        if (!active) return;
        setView(v);
        setHealth(h);
        setCycle(c);
      } catch (e) {
        if (active) setError(e.message || 'Could not load metrics.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [params, aggregated, workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    api.send(`/kpi/settings?workspaceId=${workspaceId}`).then(setSettings).catch(() => {});
  }, [workspaceId]);

  const loadGrants = useCallback(() => {
    api.send('/metrics/shares').then(setGrants).catch(() => {});
  }, []);

  useEffect(() => { if (layer === 'PERSONAL') loadGrants(); }, [layer, loadGrants]);

  const addShare = () => {
    if (!shareWith) return;
    api.send('/metrics/shares', { method: 'POST', body: { workspaceId, sharedWithId: shareWith } })
      .then(() => { setShareWith(''); loadGrants(); notify('Metrics shared.', 'success'); })
      .catch((e) => notify(e.message || 'Could not share.', 'error'));
  };

  const revokeShare = (id) => {
    api.send(`/metrics/shares/${id}`, { method: 'DELETE' })
      .then(() => { loadGrants(); notify('Share revoked.', 'success'); })
      .catch((e) => notify(e.message || 'Could not revoke.', 'error'));
  };

  const userName = (id) => users.find((u) => u.id === id)?.fullName || id;
  const sharedIds = new Set(grants.map((g) => g.sharedWithId));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Performance</h1>
          <p className="text-sm text-neutral-600">Layered metrics with privacy by design.</p>
        </div>
        {/* Layer switcher */}
        <div role="tablist" aria-label="Metric layer" className="inline-flex rounded-lg border border-neutral-200 bg-neutral-50 p-1">
          {LAYERS.map((l) => (
            <button
              key={l.id}
              role="tab"
              aria-selected={layer === l.id}
              onClick={() => setLayer(l.id)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-fast',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-2',
                'active:translate-y-px',
                layer === l.id ? 'bg-white text-brand-navy shadow-sm' : 'text-neutral-600 hover:text-neutral-900',
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scope selector for Team / Project / Manager */}
      {(layer === 'TEAM' || layer === 'MANAGER') && (
        <label className="flex items-center gap-2 text-sm">
          <span className="font-medium text-neutral-700">Team</span>
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
          >
            <option value="">{layer === 'MANAGER' ? 'All teams (workspace)' : 'Select a team'}</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
      )}
      {layer === 'PROJECT' && (
        <label className="flex items-center gap-2 text-sm">
          <span className="font-medium text-neutral-700">Project</span>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
          >
            <option value="">Select a project</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
      )}

      {/* Privacy banner */}
      {view?.privacy && (
        <div className={cn(
          'flex items-start gap-2 rounded-lg border p-3 text-sm',
          aggregated ? 'border-brand-navy-tint/30 bg-brand-navy-tint/5 text-brand-navy' : 'border-neutral-200 bg-neutral-50 text-neutral-700',
        )}>
          <ShieldCheck className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <span>{view.privacy.message}</span>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-semantic-danger/30 bg-semantic-danger/10 p-3 text-sm text-semantic-danger">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Metric cards */}
          {view?.metrics?.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {view.metrics.map((m) => <MetricCard key={m.key} metric={m} />)}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-10 w-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-300 mb-3">
                <TrendingUp className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="text-base font-semibold text-neutral-700">No metrics to show</h3>
              <p className="text-sm text-neutral-600 max-w-xs">
                {aggregated ? 'Pick a scope above, or there is not enough data yet.' : 'Complete some work to see your metrics here.'}
              </p>
            </div>
          )}

          {/* Team health composite + narrative */}
          {aggregated && health && (
            <div className="rounded-lg border border-neutral-200 bg-white p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-neutral-900">Team health</h2>
                <span className={cn('rounded-full border px-3 py-0.5 text-xs font-semibold', bandClasses(health.band))}>
                  {health.composite}% · {health.band?.replace('_', ' ')}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <HealthDimension label="Predictability" score={health.predictability} />
                <HealthDimension label="Scope stability" score={health.scopeStability} />
                <HealthDimension label="Flow efficiency" score={health.flowEfficiency} />
              </div>
              {health.narrative && (
                <div className="rounded-md bg-neutral-50 p-3 text-sm text-neutral-700">
                  <p>{health.narrative}</p>
                </div>
              )}
            </div>
          )}

          {/* Cycle-time distribution */}
          {cycle && cycle.count > 0 && (
            <div className="rounded-lg border border-neutral-200 bg-white p-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-xl font-semibold text-neutral-900">Cycle time distribution</h2>
                <div className="flex gap-4 text-xs text-neutral-600">
                  <span>Median <strong className="text-neutral-900">{cycle.median}d</strong></span>
                  <span>P85 <strong className="text-neutral-900">{cycle.p85}d</strong></span>
                  <span>{cycle.count} items</span>
                </div>
              </div>
              <BarChart data={cycle.histogram || []} />
              {cycle.outliers?.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide font-semibold text-neutral-600 mb-1">
                    Outliers (&gt; {cycle.outlierThreshold}d)
                  </p>
                  <ul className="text-sm text-neutral-700 space-y-1">
                    {cycle.outliers.map((o) => (
                      <li key={o.id} className="flex justify-between gap-2">
                        <span className="truncate">{o.title}</span>
                        <span className="text-neutral-500 flex-shrink-0">{o.cycleDays}d</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Locked-by-design callout (aggregated views) */}
          {aggregated && settings?.individualComparisonLocked && (
            <div className="flex items-start gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
              <Lock className="h-5 w-5 flex-shrink-0 text-neutral-400" aria-hidden="true" />
              <span>
                <strong>Individual engineer comparison unavailable.</strong> This is a deliberate design
                choice, not a missing feature — metrics never rank or expose individuals.
              </span>
            </div>
          )}

          {/* Voluntary sharing (personal layer only) */}
          {layer === 'PERSONAL' && (
            <div className="rounded-lg border border-neutral-200 bg-white p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-brand-navy" aria-hidden="true" />
                <h2 className="text-xl font-semibold text-neutral-900">Share my metrics</h2>
              </div>
              <p className="text-sm text-neutral-600 flex items-start gap-1">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                Your metrics are private. Choose specific people to share them with — for example before a 1:1.
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <label className="sr-only" htmlFor="share-with">Share with</label>
                <select
                  id="share-with"
                  value={shareWith}
                  onChange={(e) => setShareWith(e.target.value)}
                  className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
                >
                  <option value="">Select a person…</option>
                  {users.filter((u) => u.id !== currentUser?.id && !sharedIds.has(u.id))
                    .map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                </select>
                <button
                  onClick={addShare}
                  disabled={!shareWith}
                  className={cn(
                    'rounded-md bg-brand-navy px-3 py-1.5 text-sm font-medium text-white transition-colors duration-fast',
                    'hover:bg-brand-navy-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-2',
                    'active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  Share
                </button>
              </div>
              {grants.length > 0 && (
                <ul className="space-y-1">
                  {grants.map((g) => (
                    <li key={g.id} className="flex items-center justify-between rounded-md bg-neutral-50 px-3 py-1.5 text-sm">
                      <span className="text-neutral-700">{userName(g.sharedWithId)}</span>
                      <button
                        onClick={() => revokeShare(g.id)}
                        aria-label={`Revoke share with ${userName(g.sharedWithId)}`}
                        className="inline-flex items-center gap-1 text-neutral-500 hover:text-semantic-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded active:translate-y-px"
                      >
                        <X className="h-4 w-4" aria-hidden="true" /> Revoke
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
