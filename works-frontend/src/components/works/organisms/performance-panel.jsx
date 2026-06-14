import { useEffect, useState } from 'react';
import { ShieldCheck, Lock, Sparkles, TrendingUp, TrendingDown, Minus, Brain } from 'lucide-react';
import { kpiClient } from '@/lib/kpi';
import { api } from '@/lib/apiClient';
import { useProjects } from '@/hooks/queries/useProjects';
import { Badge } from '@/components/works/atoms/badge';
import { aiClient, anyCapabilityEnabled } from '@/lib/ai';
import { Button } from '@/components/works/button';
import { AiMetaBadge } from '@/components/works/ai-meta-badge';
import { AiBudgetNotice } from '@/components/works/organisms/ai-budget-notice';
import { CycleTimeHistogram } from '@/components/works/molecules/cycle-time-histogram';
import { MetricShareControl } from '@/components/works/molecules/metric-share-control';
import { useI18n } from '@/lib/i18n';

// Organism — the iteration-12 Performance surface (Cap L). Layered metrics with a prominent layer
// switcher and a privacy banner. Individual/Manager/Org need no entity id; Team and Project pick an
// entity (selector) and resolve to a single aggregated Layer; the manager layer carries the
// locked-by-design "individual comparison unavailable" callout (commitment 4, RB-40 §1). Tokens
// only, five interactive states, WCAG-AA. All HTTP via the kpi client / apiClient (CLAUDE.md §3).

const LAYERS = [
  { id: 'INDIVIDUAL', labelKey: 'insights.performance.individual' },
  { id: 'TEAM', labelKey: 'insights.performance.team' },
  { id: 'PROJECT', labelKey: 'insights.performance.project' },
  { id: 'MANAGER', labelKey: 'insights.performance.manager' },
  { id: 'ORG', labelKey: 'insights.performance.org' },
];

const PRIVACY_NOTE = {
  INDIVIDUAL: 'These are your private metrics. They are visible only to you unless you choose to share them.',
  TEAM: 'Team metrics are aggregated across the team — no individual engineer numbers are shown.',
  PROJECT: 'Project metrics are aggregated across everyone working in the project.',
  MANAGER: 'Individual engineer comparison is unavailable by design — managers see only aggregated team metrics, enforced at the API.',
  ORG: 'Organization metrics are fully aggregated.',
};

const STATUS_META = {
  ON_TRACK: { label: 'On track', icon: TrendingUp, tone: 'text-semantic-success', bg: 'bg-semantic-success/10' },
  AT_RISK: { label: 'At risk', icon: Minus, tone: 'text-semantic-warning', bg: 'bg-semantic-warning/10' },
  OFF_TRACK: { label: 'Off track', icon: TrendingDown, tone: 'text-semantic-danger', bg: 'bg-semantic-danger/10' },
};

function MetricCard({ metric }) {
  const sm = metric.status ? STATUS_META[metric.status] : null;
  const StatusIcon = sm?.icon;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-1 mb-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">{metric.label}</p>
        {sm && (
          <span className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-semibold ${sm.tone} ${sm.bg}`} aria-label={sm.label}>
            {StatusIcon && <StatusIcon aria-hidden="true" className="h-3 w-3" />}
            {sm.label}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
        {metric.value}
        {metric.unit === 'percent' && '%'}
      </p>
      <p className="mt-0.5 text-xs text-neutral-600">
        {metric.unit !== 'percent' && metric.unit} · n={metric.sampleSize}
      </p>
    </div>
  );
}

function LayerView({ layer, aiOn, anomalyBusy, anomalyResult, onExplainAnomaly }) {
  const { t } = useI18n();
  if (!layer) return null;
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{layer.label}</h3>
        {layer.privacyNote && (
          <Badge tone="info" className="gap-1">
            <Lock aria-hidden="true" className="h-3 w-3" />
            Aggregated
          </Badge>
        )}
      </div>
      {layer.metrics?.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {layer.metrics.map((m) => (
            <div key={m.key}>
              <MetricCard metric={m} />
              {aiOn && (
                <div className="mt-1">
                  <Button
                    variant="ghost"
                    size="xs"
                    leftIcon={<Brain aria-hidden="true" className="h-3 w-3" />}
                    loading={anomalyBusy === m.key}
                    onClick={() => onExplainAnomaly(m.key, [m.value])}
                    aria-label={`Explain ${m.label} anomaly`}
                  >
                    {t('insights.performance.explain')}
                  </Button>
                  {anomalyResult[m.key] && (
                    <div className="mt-1 space-y-1">
                      {anomalyResult[m.key].meta?.fallback && (
                        <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                          AI off — showing deterministic result.
                        </p>
                      )}
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">{anomalyResult[m.key].text}</p>
                      <AiMetaBadge meta={anomalyResult[m.key].meta} />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-neutral-600">{t('insights.performance.noMetrics')}</p>
      )}
      {layer.privacyNote && <p className="mt-2 text-xs text-neutral-600">{layer.privacyNote}</p>}
    </div>
  );
}

export function PerformancePanel({ workspaceId, aiCapabilities = [], onOpenItem }) {
  const { t } = useI18n();
  const [layer, setLayer] = useState('INDIVIDUAL');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // null = not yet loaded; [] = loaded-but-empty (lets us distinguish loading from "no entities").
  const [teams, setTeams] = useState(null);
  const [teamId, setTeamId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [anomalyBusy, setAnomalyBusy] = useState(null); // metricKey currently explaining
  const [anomalyResult, setAnomalyResult] = useState({}); // metricKey → explanation text
  // Cycle-time distribution for the active single-layer scope (§3.7). Keyed by scope so a stale
  // result never paints under a new scope, and so the effect never calls setState synchronously
  // (react-hooks/set-state-in-effect) — it only resolves in the async continuation.
  const [distByScope, setDistByScope] = useState({}); // scopeKey → { data } | { error }

  // Projects come from the shared ONE-Source hook. `data` is undefined while loading; normalize to
  // null so the loading-vs-"no projects" distinction below is preserved.
  const projects = useProjects(workspaceId).data ?? null;
  // The effective selection defaults to the first project until the user picks one explicitly — a
  // pure derivation (no default-selection effect, so no synchronous setState in an effect).
  const effectiveProjectId = projectId || projects?.[0]?.id || '';

  const aiOn = anyCapabilityEnabled(aiCapabilities);

  const explainAnomaly = (metricKey, values) => {
    if (!workspaceId || !values?.length) return;
    setAnomalyBusy(metricKey);
    // The explain-anomaly response carries its AI Control Plane verdict (r.meta) — keep it so the
    // provenance badge and the explicit AI-off note render honestly (RB-40 §2.4); never drop to
    // bare text silently.
    aiClient.explainAnomaly(workspaceId, metricKey, values)
      .then((r) => setAnomalyResult((prev) => ({
        ...prev,
        [metricKey]: { text: r?.explanation || r?.text || 'No explanation returned.', meta: r?.meta || null },
      })))
      .catch(() => setAnomalyResult((prev) => ({ ...prev, [metricKey]: { text: 'Could not explain anomaly.', meta: null } })))
      .finally(() => setAnomalyBusy(null));
  };

  // Load the team list once per workspace so the Team selector has options and a default. setState
  // only in the async continuation (react-hooks/set-state-in-effect). Projects come from the shared
  // useProjects hook (above); their default selection is handled in the effect below.
  useEffect(() => {
    if (!workspaceId) return undefined;
    let active = true;
    const enc = encodeURIComponent(workspaceId);
    Promise.resolve()
      .then(() => api.send(`/teams?workspaceId=${enc}`))
      .catch(() => [])
      .then((t) => {
        if (!active) return;
        const ts = Array.isArray(t) ? t : [];
        setTeams(ts);
        setTeamId((cur) => cur || ts[0]?.id || '');
      });
    return () => { active = false; };
  }, [workspaceId]);

  // Fetch the metrics for the active layer. Team/Project wait for a selected id (no synchronous
  // setState in the effect body — the empty case is derived in render).
  useEffect(() => {
    if (!workspaceId) return undefined;
    let active = true;
    let fetcher;
    if (layer === 'INDIVIDUAL') fetcher = kpiClient.personal(workspaceId).then((r) => ({ single: r }));
    else if (layer === 'ORG') fetcher = kpiClient.org(workspaceId).then((r) => ({ single: r }));
    else if (layer === 'MANAGER') fetcher = kpiClient.manager(workspaceId).then((r) => ({ many: r }));
    else if (layer === 'TEAM') {
      if (!teamId) return () => { active = false; };
      fetcher = kpiClient.team(workspaceId, teamId).then((r) => ({ single: r }));
    } else if (layer === 'PROJECT') {
      if (!effectiveProjectId) return () => { active = false; };
      fetcher = kpiClient.project(workspaceId, effectiveProjectId).then((r) => ({ single: r }));
    } else return () => { active = false; };
    fetcher
      .then((next) => { if (active) { setData(next); setError(null); } })
      .catch((e) => { if (active) setError(e.message || 'Could not load metrics.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [workspaceId, layer, teamId, effectiveProjectId]);

  // Cycle-time distribution histogram (§3.7). MANAGER is a multi-team rollup with no single scope,
  // so it has no distribution; the other layers map cleanly to the backend's scopeLevel/scopeId.
  // setState happens only in the async continuation (react-hooks/set-state-in-effect).
  const distScopeId = layer === 'TEAM' ? teamId : layer === 'PROJECT' ? effectiveProjectId : undefined;
  const distNeedsId = layer === 'TEAM' || layer === 'PROJECT';
  const distScopeKey = layer === 'MANAGER' ? null : `${layer}:${distScopeId || ''}`;
  useEffect(() => {
    if (!workspaceId || layer === 'MANAGER') return undefined;
    if (distNeedsId && !distScopeId) return undefined;
    let active = true;
    const key = distScopeKey;
    kpiClient.distribution(workspaceId, layer, distScopeId)
      .then((d) => { if (active) setDistByScope((prev) => ({ ...prev, [key]: { data: d } })); })
      .catch((e) => {
        if (active) setDistByScope((prev) => ({ ...prev, [key]: { error: e.message || 'Could not load the cycle-time distribution.' } }));
      });
    return () => { active = false; };
  }, [workspaceId, layer, distScopeId, distNeedsId, distScopeKey]);

  const distEntry = distScopeKey ? distByScope[distScopeKey] : null;

  const noTeam = layer === 'TEAM' && teams !== null && teams.length === 0;
  const noProject = layer === 'PROJECT' && projects !== null && projects.length === 0;
  const noEntity = noTeam || noProject;
  const selectorItems = layer === 'TEAM' ? teams : layer === 'PROJECT' ? projects : null;
  const selectorValue = layer === 'TEAM' ? teamId : effectiveProjectId;

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-navy">{t('insights.performance.title')}</h1>
        <p className="mt-0.5 text-sm text-neutral-600">
          {t('insights.performance.subtitle')}
        </p>
      </div>

      {/* Layer switcher */}
      <div role="tablist" aria-label="Metric layer" className="mb-4 inline-flex rounded-lg border border-neutral-200 p-1 dark:border-neutral-700">
        {LAYERS.map((l) => (
          <button
            key={l.id}
            type="button"
            role="tab"
            aria-selected={layer === l.id}
            onClick={() => { setLoading(true); setLayer(l.id); }}
            className={[
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-fast',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-1',
              'active:translate-y-px disabled:opacity-50',
              layer === l.id
                ? 'bg-brand-navy text-white'
                : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800',
            ].join(' ')}
          >
            {t(l.labelKey)}
          </button>
        ))}
      </div>

      {/* Privacy banner */}
      <div className="mb-4 flex items-start gap-2 rounded-lg bg-semantic-info-surface p-3">
        <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 text-semantic-info" />
        <p className="text-xs text-neutral-700 dark:text-neutral-200">{PRIVACY_NOTE[layer]}</p>
      </div>

      {/* AI budget/degradation signal — only meaningful when AI is on for this workspace (RB-40 §2.5). */}
      {aiOn && <AiBudgetNotice workspaceId={workspaceId} className="mb-4" />}

      {/* Entity selector (Team / Project) */}
      {selectorItems && selectorItems.length > 0 && (
        <div className="mb-4">
          <label htmlFor="kpi-entity" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-600">
            {layer === 'TEAM' ? t('insights.performance.team') : t('insights.performance.project')}
          </label>
          <select
            id="kpi-entity"
            value={selectorValue}
            onChange={(e) => { setLoading(true); (layer === 'TEAM' ? setTeamId : setProjectId)(e.target.value); }}
            className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          >
            {selectorItems.map((x) => (
              <option key={x.id} value={x.id}>{x.name}</option>
            ))}
          </select>
        </div>
      )}

      {noEntity && (
        <p className="text-sm text-neutral-600">
          {noTeam
            ? 'No teams yet. Create a team to see aggregated team metrics.'
            : 'No projects yet. Create a project to see aggregated project metrics.'}
        </p>
      )}

      {loading && !noEntity && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg bg-semantic-danger-surface p-4 text-sm text-semantic-danger">{error}</div>
      )}

      {!loading && !error && data?.single && (
        <LayerView layer={data.single} aiOn={aiOn} anomalyBusy={anomalyBusy} anomalyResult={anomalyResult} onExplainAnomaly={explainAnomaly} />
      )}
      {!loading && !error && data?.many && (
        <div className="space-y-6">
          {data.many.length === 0 && (
            <p className="text-sm text-neutral-600">No teams yet. Create a team to see manager-level rollups.</p>
          )}
          {data.many.map((l) => (
            <LayerView key={l.scopeId || l.label} layer={l} aiOn={aiOn} anomalyBusy={anomalyBusy} anomalyResult={anomalyResult} onExplainAnomaly={explainAnomaly} />
          ))}
        </div>
      )}

      {/* Cycle-time distribution histogram (§3.7) — single-layer scopes only, once metrics resolve. */}
      {!loading && !error && !noEntity && layer !== 'MANAGER' && (
        <section aria-labelledby="cycle-time-heading" className="mt-6 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
          <h3 id="cycle-time-heading" className="mb-3 text-base font-semibold text-neutral-900 dark:text-neutral-100">
            {t('insights.performance.cycleTimeDistribution')}
          </h3>
          {distEntry?.error ? (
            <div className="rounded-lg bg-semantic-danger-surface p-3 text-sm text-semantic-danger" role="alert">{distEntry.error}</div>
          ) : !distEntry ? (
            <div className="h-28 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />
          ) : (
            <CycleTimeHistogram distribution={distEntry.data} onSelectOutlier={onOpenItem} />
          )}
        </section>
      )}

      {/* Voluntary metric-sharing — Individual layer only (§3.8). */}
      {layer === 'INDIVIDUAL' && (
        <div className="mt-6">
          <MetricShareControl workspaceId={workspaceId} />
        </div>
      )}

      <p className="mt-6 flex items-center gap-1.5 text-xs text-neutral-600">
        <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-brand-orange" />
        AI team-health narratives are available on team views when AI is enabled (with a deterministic fallback).
      </p>
    </div>
  );
}
