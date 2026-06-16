// heart-widgets.jsx — WI-06–10 HEART metrics + activation-funnel widgets.
//
// Five widgets backed by /api/v1/metrics/heart and /api/v1/metrics/funnel.
// Each exports a standalone React component usable in the Today widget registry.
//
// WI-06  HeartDashboardWidget  — all five HEART scores in one grid
// WI-07  ActivationFunnelWidget — staged funnel with conversion bars
// WI-08  EngagementScoreWidget  — single large engagement KPI
// WI-09  RetentionMetricsWidget — week-over-week retention card
// WI-10  TaskSuccessWidget      — 30-day task completion rate

import { Heart, Users, TrendingUp, RefreshCw, CheckCircle, ArrowRight } from 'lucide-react';
import { useHeartMetrics, useActivationFunnel } from '@/hooks/queries/useHeartMetrics';
import { cn } from '@/lib/utils';

// ── Shared primitives ────────────────────────────────────────────────────────

function ScoreBadge({ score, size = 'md' }) {
  const color =
    score >= 75 ? 'text-semantic-success' :
    score >= 50 ? 'text-semantic-warning' :
    'text-semantic-danger';
  const cls = size === 'lg'
    ? 'text-4xl font-bold'
    : 'text-2xl font-bold';
  return (
    <span className={cn(cls, color)} aria-label={`${score}%`}>
      {score}<span className="text-sm font-normal text-neutral-400 ml-0.5">%</span>
    </span>
  );
}

function MiniRing({ score, label, sub, icon: Icon, iconColor }) {
  const stroke = score >= 75 ? 'stroke-semantic-success' :
                 score >= 50 ? 'stroke-semantic-warning' :
                 'stroke-semantic-danger';
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 min-w-24">
      <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
        <circle cx="26" cy="26" r={r} fill="none" stroke="currentColor"
          className="text-neutral-200 dark:text-neutral-700" strokeWidth="4" />
        <circle cx="26" cy="26" r={r} fill="none" className={stroke}
          strokeWidth="4" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          transform="rotate(-90 26 26)" />
        <foreignObject x="8" y="8" width="36" height="36">
          <div className={cn('flex items-center justify-center w-full h-full', iconColor)}>
            <Icon size={16} />
          </div>
        </foreignObject>
      </svg>
      <span className="text-base font-bold text-neutral-900 dark:text-neutral-100">{score}%</span>
      <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 text-center leading-tight">{label}</span>
      {sub && <span className="text-xs text-neutral-400 text-center leading-tight">{sub}</span>}
    </div>
  );
}

function WidgetShell({ title, icon: Icon, iconColor, loading, error, children }) {
  return (
    <section aria-label={title} className="h-full flex flex-col gap-4">
      <header className="flex items-center gap-2">
        <Icon size={16} className={iconColor} aria-hidden="true" />
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
      </header>
      {loading ? (
        <div className="animate-pulse space-y-3" aria-busy="true" aria-label={`Loading ${title}`}>
          <div className="flex gap-3">
            {[0,1,2,3,4].map(i => (
              <div key={i} className="h-24 flex-1 rounded-xl bg-neutral-100 dark:bg-neutral-800" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div role="alert" className="rounded-lg bg-semantic-danger-surface p-3 text-xs text-semantic-danger">
          Could not load {title.toLowerCase()}. Try refreshing.
        </div>
      ) : children}
    </section>
  );
}

// ── WI-06: HeartDashboardWidget ──────────────────────────────────────────────

export function HeartDashboardWidget({ workspaceId }) {
  const { data, isLoading, isError } = useHeartMetrics(workspaceId);

  const dimensions = [
    { key: 'happiness',  label: 'Happiness',  sub: 'On-time delivery',    icon: Heart,       iconColor: 'text-semantic-danger' },
    { key: 'engagement', label: 'Engagement', sub: 'Active last 7 days',  icon: Users,       iconColor: 'text-brand-navy' },
    { key: 'adoption',   label: 'Adoption',   sub: 'Created a work item', icon: TrendingUp,  iconColor: 'text-brand-orange' },
    { key: 'retention',  label: 'Retention',  sub: 'Week-over-week',      icon: RefreshCw,   iconColor: 'text-semantic-success' },
    { key: 'taskSuccess', label: 'Task Success', sub: 'Done in 30 days',  icon: CheckCircle, iconColor: 'text-semantic-warning' },
  ];

  return (
    <WidgetShell title="HEART Metrics" icon={Heart} iconColor="text-semantic-danger" loading={isLoading} error={isError}>
      {data && (
        <div className="flex gap-3 overflow-x-auto pb-1" role="list" aria-label="HEART dimensions">
          {dimensions.map(({ key, label, sub, icon, iconColor }) => {
            const score = Number(data[key]?.score ?? 0);
            return (
              <div key={key} role="listitem" className="flex-1 min-w-0">
                <MiniRing score={score} label={label} sub={sub} icon={icon} iconColor={iconColor} />
              </div>
            );
          })}
        </div>
      )}
      {data && (
        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-auto">
          Workspace-level averages · Refreshes every 5 min
        </p>
      )}
    </WidgetShell>
  );
}

// ── WI-07: ActivationFunnelWidget ────────────────────────────────────────────

export function ActivationFunnelWidget({ workspaceId }) {
  const { data: stages, isLoading, isError } = useActivationFunnel(workspaceId);

  return (
    <WidgetShell title="Activation Funnel" icon={ArrowRight} iconColor="text-brand-orange" loading={isLoading} error={isError}>
      {stages && stages.length > 0 && (
        <ol className="space-y-2" aria-label="Funnel stages">
          {stages.map((s, idx) => (
            <li key={idx} className="flex items-center gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-navy text-white text-xs font-bold flex items-center justify-center" aria-hidden="true">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate">{s.label}</span>
                  <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 ml-2 flex-shrink-0">
                    {s.count} <span className="text-neutral-400">({s.pct}%)</span>
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-neutral-100 dark:bg-neutral-700">
                  <div
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-base',
                      s.pct >= 75 ? 'bg-semantic-success' :
                      s.pct >= 40 ? 'bg-brand-orange' :
                      'bg-semantic-danger'
                    )}
                    style={{ width: `${s.pct}%` }}
                    role="progressbar"
                    aria-valuenow={s.pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${s.label}: ${s.pct}%`}
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      {stages && stages.length === 0 && (
        <p className="text-xs text-neutral-400 text-center py-4">No funnel data yet — invite your team to get started.</p>
      )}
    </WidgetShell>
  );
}

// ── WI-08: EngagementScoreWidget ─────────────────────────────────────────────

export function EngagementScoreWidget({ workspaceId }) {
  const { data, isLoading, isError } = useHeartMetrics(workspaceId);
  const eng = data?.engagement;

  return (
    <WidgetShell title="Engagement" icon={Users} iconColor="text-brand-navy" loading={isLoading} error={isError}>
      {eng && (
        <div className="flex flex-col items-center gap-2 py-2">
          <ScoreBadge score={Number(eng.score)} size="lg" />
          <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
            {eng.active7d} of {eng.totalMembers} members active in the last 7 days
          </p>
          <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-700 mt-1">
            <div
              className="h-2 rounded-full bg-brand-navy transition-all duration-base"
              style={{ width: `${eng.score}%` }}
              role="progressbar"
              aria-valuenow={Number(eng.score)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Engagement: ${eng.score}%`}
            />
          </div>
        </div>
      )}
    </WidgetShell>
  );
}

// ── WI-09: RetentionMetricsWidget ────────────────────────────────────────────

export function RetentionMetricsWidget({ workspaceId }) {
  const { data, isLoading, isError } = useHeartMetrics(workspaceId);
  const ret = data?.retention;

  return (
    <WidgetShell title="Retention" icon={RefreshCw} iconColor="text-semantic-success" loading={isLoading} error={isError}>
      {ret && (
        <div className="flex flex-col gap-3">
          <div className="flex items-end gap-3">
            <ScoreBadge score={Number(ret.score)} size="lg" />
            <span className="text-xs text-neutral-500 dark:text-neutral-400 pb-1">week-over-week</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800 p-2 text-center">
              <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{ret.thisWeek}</p>
              <p className="text-xs text-neutral-500">Active this week</p>
            </div>
            <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800 p-2 text-center">
              <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{ret.lastWeek}</p>
              <p className="text-xs text-neutral-500">Active last week</p>
            </div>
          </div>
          <p className="text-xs text-neutral-400">
            {Number(ret.score) >= 80
              ? 'Strong retention — most last-week users are back.'
              : Number(ret.score) >= 50
              ? 'Moderate retention — some users lapsed between weeks.'
              : 'Low retention — focus on re-engagement campaigns.'}
          </p>
        </div>
      )}
    </WidgetShell>
  );
}

// ── WI-10: TaskSuccessWidget ─────────────────────────────────────────────────

export function TaskSuccessWidget({ workspaceId }) {
  const { data, isLoading, isError } = useHeartMetrics(workspaceId);
  const ts = data?.taskSuccess;

  return (
    <WidgetShell title="Task Success Rate" icon={CheckCircle} iconColor="text-semantic-warning" loading={isLoading} error={isError}>
      {ts && (
        <div className="flex flex-col gap-3">
          <div className="flex items-end gap-3">
            <ScoreBadge score={Number(ts.score)} size="lg" />
            <span className="text-xs text-neutral-500 dark:text-neutral-400 pb-1">completed</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-semantic-success/10 p-2 text-center">
              <p className="text-lg font-bold text-semantic-success">{ts.done}</p>
              <p className="text-xs text-neutral-500">Done</p>
            </div>
            <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800 p-2 text-center">
              <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{ts.total}</p>
              <p className="text-xs text-neutral-500">Created (30 d)</p>
            </div>
          </div>
          <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-700">
            <div
              className={cn(
                'h-2 rounded-full transition-all duration-base',
                Number(ts.score) >= 75 ? 'bg-semantic-success' :
                Number(ts.score) >= 50 ? 'bg-semantic-warning' :
                'bg-semantic-danger'
              )}
              style={{ width: `${ts.score}%` }}
              role="progressbar"
              aria-valuenow={Number(ts.score)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Task success rate: ${ts.score}%`}
            />
          </div>
        </div>
      )}
    </WidgetShell>
  );
}
