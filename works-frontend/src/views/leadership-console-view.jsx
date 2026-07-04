// Leadership Console (iteration 16, Cap X) — the cross-team rollup surface for BCITS leadership.
// Glance-and-go: large stat cards, a prominent AI executive briefing, strategic themes, resource
// allocation, the risk portfolio, customer health, the strategy-to-execution map, and a board-deck
// auto-draft. Self-contained like the Developer Workspace — fetches its own workspace-scoped data
// via leadershipClient → apiClient (CLAUDE.md §3). Tokens only, five interactive states, WCAG-AA.

import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Sparkles, Map as MapIcon, Users, ShieldAlert, HeartPulse,
  GitBranch, Presentation, Wand2,
} from 'lucide-react';
import { Button } from '@/components/works/button';
import { PageLayout } from '@/components/works/templates/page-layout';
import { AiMetaBadge } from '@/components/works/ai-meta-badge';
import { AsyncBoundary } from '@/components/works/atoms/async-boundary';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { Skeleton } from '@/components/works/atoms/skeleton';
import { leadershipClient } from '@/lib/leadership';
import { formatNumber } from '@/lib/format';

const TABS = [
  { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
  { id: 'briefing', label: 'AI briefing', Icon: Sparkles },
  { id: 'themes', label: 'Themes', Icon: MapIcon },
  { id: 'resources', label: 'Resources', Icon: Users },
  { id: 'risks', label: 'Risks', Icon: ShieldAlert },
  { id: 'customers', label: 'Customer health', Icon: HeartPulse },
  { id: 'strategy', label: 'Strategy map', Icon: GitBranch },
  { id: 'deck', label: 'Board deck', Icon: Presentation },
];

function Stat({ label, value, tone = 'neutral' }) {
  const toneClass = tone === 'danger' ? 'text-semantic-danger'
    : tone === 'warning' ? 'text-semantic-warning'
      : tone === 'success' ? 'text-semantic-success' : 'text-brand-navy dark:text-neutral-100';
  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function Card({ title, icon, action, children }) {
  return (
    <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
      <header className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <span className="text-brand-navy dark:text-neutral-300">{icon}</span>{title}
        </h3>
        {action}
      </header>
      {children}
    </section>
  );
}

function ProgressBar({ percent }) {
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  return (
    <div className="h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-700" aria-hidden="true">
      <div className="h-2 rounded-full bg-brand-navy" style={{ width: `${p}%` }} />
    </div>
  );
}

function riskTone(score) {
  return score >= 6 ? 'bg-semantic-danger text-white' : score >= 3 ? 'bg-semantic-warning text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200';
}

function churnTone(risk) {
  return risk === 'HIGH' ? 'bg-semantic-danger text-white' : risk === 'MEDIUM' ? 'bg-semantic-warning text-white' : 'bg-semantic-success text-white';
}

export default function LeadershipConsoleView({ workspaceId, onToast }) {
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [briefingBusy, setBriefingBusy] = useState(false);
  const [deckBusy, setDeckBusy] = useState(false);

  const notify = useCallback((m, t) => onToast?.(m, t), [onToast]);

  // State is only ever set inside async callbacks (never synchronously in the effect body) so the
  // loader can be reused by the effect, the tab switcher and the Retry button alike (RB-30 states).
  const load = useCallback((which, ref) => {
    if (!workspaceId) return;
    const live = () => !ref || ref.alive;
    const fetchers = {
      overview: () => leadershipClient.rollup(workspaceId),
      briefing: () => leadershipClient.briefings(workspaceId),
      themes: () => leadershipClient.strategicThemes(workspaceId),
      resources: () => leadershipClient.resourceAllocation(workspaceId),
      risks: () => leadershipClient.riskPortfolio(workspaceId),
      customers: () => leadershipClient.customerHealth(workspaceId),
      strategy: () => leadershipClient.strategyExecution(workspaceId),
      deck: () => Promise.resolve(null),
    };
    (fetchers[which] || fetchers.overview)()
      .then((result) => { if (live()) { setData((d) => ({ ...d, [which]: result })); setError(null); } })
      .catch((e) => { if (live()) setError(e.message || 'Could not load the Leadership Console.'); })
      .finally(() => { if (live()) setLoading(false); });
  }, [workspaceId]);

  useEffect(() => {
    const ref = { alive: true };
    load(tab, ref);
    return () => { ref.alive = false; };
  }, [tab, load]);

  function selectTab(id) { if (id !== tab) { setLoading(true); setError(null); setTab(id); } }
  function retry() { setLoading(true); setError(null); load(tab, { alive: true }); }

  async function generateBriefing(id) {
    setBriefingBusy(true);
    try {
      const result = await leadershipClient.generateBriefing(id);
      setData((d) => ({
        ...d,
        briefing: (d.briefing || []).map((b) => (b.id === id ? result.briefing : b)),
        briefingResult: result,
      }));
      notify('Executive briefing generated', 'success');
    } catch (e) {
      notify(e.message || 'Could not generate the briefing', 'error');
    } finally {
      setBriefingBusy(false);
    }
  }

  async function generateDeck() {
    setDeckBusy(true);
    try {
      const quarter = `Q${Math.floor(new Date().getMonth() / 3) + 1} ${new Date().getFullYear()}`;
      const result = await leadershipClient.boardDeck(workspaceId, quarter);
      setData((d) => ({ ...d, deck: result }));
      notify('Board deck drafted', 'success');
    } catch (e) {
      notify(e.message || 'Could not draft the board deck', 'error');
    } finally {
      setDeckBusy(false);
    }
  }

  return (
    <PageLayout
      title="Leadership Console"
      description="Cross-team rollup, strategy and risk — at a glance."
    >

      <div className="flex gap-1 overflow-x-auto border-b border-neutral-200 dark:border-neutral-700 mb-6" role="tablist">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => selectTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 whitespace-nowrap ${
              tab === id
                ? 'border-brand-orange text-brand-navy dark:text-neutral-100'
                : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-brand-navy dark:hover:text-neutral-200'
            }`}
          >
            <Icon aria-hidden="true" className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      <AsyncBoundary
        loading={loading}
        error={error}
        onRetry={retry}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
        skeleton={<><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></>}
      >
        <div role="tabpanel">
          {tab === 'overview' && <OverviewTab data={data.overview} />}
          {tab === 'briefing' && (
            <BriefingTab
              briefings={data.briefing} busy={briefingBusy} result={data.briefingResult}
              onGenerate={generateBriefing}
            />
          )}
          {tab === 'themes' && <ThemesTab data={data.themes} />}
          {tab === 'resources' && <ResourcesTab data={data.resources} />}
          {tab === 'risks' && <RisksTab data={data.risks} />}
          {tab === 'customers' && <CustomersTab data={data.customers} />}
          {tab === 'strategy' && <StrategyTab data={data.strategy} />}
          {tab === 'deck' && <DeckTab data={data.deck} busy={deckBusy} onGenerate={generateDeck} />}
        </div>
      </AsyncBoundary>
    </PageLayout>
  );
}

function OverviewTab({ data }) {
  if (!data) return null;
  const t = data.totals || {};
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Work items" value={formatNumber(t.total || 0)} />
        <Stat label="Completion" value={`${data.completionRate || 0}%`} tone="success" />
        <Stat label="Overdue" value={formatNumber(t.overdue || 0)} tone={Number(t.overdue) > 0 ? 'danger' : 'neutral'} />
        <Stat label="Unassigned" value={formatNumber(t.unassigned || 0)} tone={Number(t.unassigned) > 0 ? 'warning' : 'neutral'} />
      </div>
      <Card title="Per-project delivery" icon={<LayoutDashboard className="h-4 w-4" />}>
        {(data.projects || []).length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">No projects in scope.</p>
        ) : (
          <ul className="space-y-3">
            {data.projects.map((p) => (
              <li key={p.id}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">{p.name}</span>
                  <span className="text-neutral-600 dark:text-neutral-400">{p.completionRate}% · {p.total} items{Number(p.overdue) > 0 ? ` · ${p.overdue} overdue` : ''}</span>
                </div>
                <ProgressBar percent={p.completionRate} />
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Teams" icon={<Users className="h-4 w-4" />}>
        {(data.teams || []).length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">No teams defined yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {data.teams.map((t2) => (
              <li key={t2.id} className="rounded-md bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-200">
                {t2.name} <span className="text-neutral-600 dark:text-neutral-400">· {t2.project_count} projects</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function BriefingTab({ briefings, busy, result, onGenerate }) {
  if (!briefings || briefings.length === 0) {
    return <EmptyState icon={Sparkles} title="No briefings yet" subtitle="An executive briefing is a schedulable, editable narrative tailored to your priorities. Create one from Settings to get started." />;
  }
  return (
    <div className="space-y-6">
      {briefings.map((b) => (
        <Card
          key={b.id}
          title={b.title}
          icon={<Sparkles className="h-4 w-4" />}
          action={
            <Button size="sm" variant="action" loading={busy} leftIcon={<Wand2 className="h-4 w-4" />} onClick={() => onGenerate(b.id)}>
              Generate
            </Button>
          }
        >
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">
            {b.cadence} · {b.tone?.toLowerCase()} · {b.length?.toLowerCase()}{b.focus ? ` · focus: ${b.focus}` : ''}
          </p>
          {result && result.briefing?.id === b.id && <div className="mb-2"><AiMetaBadge meta={result.meta} /></div>}
          <pre className="whitespace-pre-wrap text-sm text-neutral-800 dark:text-neutral-200 font-sans bg-neutral-50 dark:bg-neutral-800 rounded-md p-3 max-w-3xl">
            {b.content || 'Not generated yet — press Generate.'}
          </pre>
        </Card>
      ))}
    </div>
  );
}

function ThemesTab({ data }) {
  const themes = data?.themes || [];
  if (themes.length === 0) return <EmptyState icon={MapIcon} title="No strategic themes" subtitle="Strategic themes track progress, contributing items, owners and risks. Define them in the PO Workspace roadmap." />;
  return (
    <div className="space-y-3">
      {themes.map((t) => (
        <Card key={t.id} title={t.name} icon={<MapIcon className="h-4 w-4" />}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-neutral-600 dark:text-neutral-400">{t.quarter || '—'} · {t.status}</span>
            <span className="font-medium text-neutral-900 dark:text-neutral-100">{t.progress}%</span>
          </div>
          <ProgressBar percent={t.progress} />
        </Card>
      ))}
    </div>
  );
}

function ResourcesTab({ data }) {
  if (!data) return null;
  const members = data.members || [];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Stat label="Team avg open" value={data.teamAverageOpen ?? 0} />
        <Stat label="Unassigned" value={formatNumber(data.unassignedItems || 0)} tone={Number(data.unassignedItems) > 0 ? 'warning' : 'neutral'} />
        <Stat label="Over-allocated" value={(data.rebalancingSuggestions || []).length} tone={(data.rebalancingSuggestions || []).length ? 'danger' : 'success'} />
      </div>
      <Card title="Allocation by member" icon={<Users className="h-4 w-4" />}>
        {members.length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">No assigned work in scope.</p>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-neutral-900 dark:text-neutral-100">{m.full_name}</span>
                <span className="flex items-center gap-3 text-neutral-600 dark:text-neutral-400">
                  <span>{m.open_items} open · {m.open_points} pts</span>
                  <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${
                    m.allocation === 'OVER' ? 'bg-semantic-danger text-white'
                      : m.allocation === 'UNDER' ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200'
                        : 'bg-semantic-success text-white'}`}>{m.allocation}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function RisksTab({ data }) {
  if (!data) return null;
  const risks = data.risks || [];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Stat label="Open risks" value={formatNumber(data.openCount || 0)} />
        <Stat label="High impact" value={formatNumber(data.highImpactCount || 0)} tone={Number(data.highImpactCount) > 0 ? 'danger' : 'success'} />
      </div>
      <Card title="Risk portfolio (impact × probability)" icon={<ShieldAlert className="h-4 w-4" />}>
        {risks.length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">No open risks across projects.</p>
        ) : (
          <ul className="space-y-2">
            {risks.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 flex-1 truncate text-neutral-900 dark:text-neutral-100">{r.title}</span>
                <span className="text-neutral-600 dark:text-neutral-400 truncate">{r.project_name || '—'}</span>
                <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${riskTone(r.score)}`}>score {r.score}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function CustomersTab({ data }) {
  if (!data) return null;
  const customers = data.customers || [];
  return (
    <Card title="Customer health" icon={<HeartPulse className="h-4 w-4" />} action={<span className="text-xs text-neutral-600 dark:text-neutral-400">{data.atRiskCount || 0} at risk</span>}>
      {customers.length === 0 ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">No active customers.</p>
      ) : (
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {customers.map((c) => (
            <li key={c.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-neutral-900 dark:text-neutral-100">{c.name} <span className="text-neutral-600 dark:text-neutral-400">· {c.tier}</span></span>
              <span className="flex items-center gap-3 text-neutral-600 dark:text-neutral-400">
                <span>health {c.healthScore}/100{c.avgCsat != null ? ` · CSAT ${c.avgCsat}` : ''}{Number(c.overdueRequests) > 0 ? ` · ${c.overdueRequests} overdue` : ''}</span>
                <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${churnTone(c.churnRisk)}`}>{c.churnRisk}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function StrategyTab({ data }) {
  const objectives = data?.objectives || [];
  if (objectives.length === 0) return <EmptyState icon={GitBranch} title="No objectives linked" subtitle="Link OKRs to work items in the PO Workspace to see the full strategy-to-execution map." />;
  return (
    <div className="space-y-4">
      {objectives.map((o) => (
        <Card key={o.id} title={o.title} icon={<GitBranch className="h-4 w-4" />} action={<span className="text-xs text-neutral-600 dark:text-neutral-400">{o.level} · {o.quarter}</span>}>
          {(o.keyResults || []).length === 0 ? (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">No key results.</p>
          ) : (
            <ul className="space-y-3">
              {o.keyResults.map((kr) => (
                <li key={kr.id}>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{kr.title}</p>
                  <ul className="mt-1 ml-4 space-y-0.5">
                    {(kr.links || []).length === 0 ? (
                      <li className="text-xs text-neutral-600 dark:text-neutral-400">No linked work.</li>
                    ) : kr.links.map((l, i) => (
                      <li key={i} className="text-xs text-neutral-600 dark:text-neutral-400">
                        ↳ {l.work_item_title || l.entity_id} {l.work_item_status ? `(${l.work_item_status})` : ''}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  );
}

function DeckTab({ data, busy, onGenerate }) {
  return (
    <div className="space-y-4">
      <Card
        title="Quarterly board deck"
        icon={<Presentation className="h-4 w-4" />}
        action={<Button size="sm" variant="action" loading={busy} leftIcon={<Wand2 className="h-4 w-4" />} onClick={onGenerate}>Draft deck</Button>}
      >
        {!data ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Generate a board-deck draft for the engineering / delivery section from current data.</p>
        ) : (
          <>
            <div className="mb-3"><AiMetaBadge meta={data.meta} /></div>
            <div className="space-y-3">
              {(data.slides || []).map((s, i) => (
                <div key={i} className="rounded-md border border-neutral-200 dark:border-neutral-700 p-3">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Slide {i + 1}: {s.title}</p>
                  <ul className="ml-4 list-disc text-sm text-neutral-700 dark:text-neutral-300">
                    {(s.bullets || []).map((b, j) => <li key={j}>{b}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
