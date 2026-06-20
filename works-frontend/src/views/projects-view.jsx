import {
  TrendingUp, Activity, AlertTriangle, GitBranch, MessageSquareText, Scale, ShieldCheck, Sparkles,
} from 'lucide-react';
import { PageLayout } from '@/components/works/templates/page-layout';
import { Folder } from 'lucide-react';
import { Button } from '@/components/works/button';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { ListSkeleton } from '@/components/works/atoms/skeleton';
import { statusToCategory } from '@/components/works/status';
import { buildProjectCommandCenter } from '@/lib/project-command-center';
import { useI18n } from '@/lib/i18n';

// Teams view (formerly Projects). A Team is a workspace-level container for work items —
// equivalent to a JIRA project. Work item IDs are workspace-scoped (EP-0001 is unique
// across all teams). B20: teamMetrics is { [teamId]: { velocity, completionPct, cycleTimeDays } }.
export default function ProjectsView({
  loading = false,
  projects,
  workItems,
  setIsProjectOpen,
  handleArchiveProject,
  userName,
  projectMetrics = {},
  projectMetricsLoading = false,
  statusResolver,
}) {
  const { t } = useI18n();
  if (loading && projects.length === 0) {
    return (
      <PageLayout header={null}>
        <ListSkeleton rows={4} />
      </PageLayout>
    );
  }
  // "Done" is resolved from the item's status category, not a literal string, so teams using
  // custom / renamed done statuses still show accurate completion.
  const isDone = (item) => (statusResolver
    ? statusResolver.categoryOf(item.type, item.status)
    : statusToCategory(item.status)) === 'done';
  return (
    <PageLayout
      title={t('deliver.teams.title')}
      description={`${projects.length} ${projects.length !== 1 ? t('deliver.teams.teamPlural') : t('deliver.teams.teamSingular')} ${t('deliver.teams.inThisWorkspace')}`}
      actions={<Button variant="action" onClick={() => setIsProjectOpen(true)}>{t('deliver.teams.newTeam')}</Button>}
      width="dashboard"
    >

      {projects.length === 0
        ? (
          <EmptyState
            icon={Folder}
            title={t('deliver.teams.emptyTitle')}
            subtitle={t('deliver.teams.emptySubtitle')}
            action={<Button variant="action" onClick={() => setIsProjectOpen(true)}>{t('deliver.teams.createFirst')}</Button>}
          />
        )
        : (
          <div className="space-y-3">
            {projects.map(p => {
              const projectItems = workItems.filter(i => i.projectId === p.id);
              const count = projectItems.length;
              const done  = projectItems.filter(isDone).length;
              const command = buildProjectCommandCenter({
                project: p,
                items: projectItems,
                metrics: projectMetrics[p.id],
                isDone,
              });
              const healthClass = command.healthTone === 'danger'
                ? 'text-semantic-danger'
                : command.healthTone === 'warning'
                  ? 'text-semantic-warning'
                  : 'text-semantic-success';
              return (
                <div key={p.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-brand-navy rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {p.keyPrefix}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-neutral-900">{p.name}</h3>
                        {p.slug && (
                          <span
                            className="text-xs font-mono bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-600"
                            title={t('deliver.teams.teamIdentifier')}
                          >
                            {p.keyPrefix}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                        {p.description || t('deliver.teams.noDescription')}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-neutral-900">{count} {t('deliver.teams.items')}</p>
                      {count > 0 && <p className="text-xs text-semantic-success">{done} {t('deliver.teams.done')}</p>}
                      {p.leadUserId && (
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                          {t('deliver.teams.leadPrefix')}{userName(p.leadUserId)}
                        </p>
                      )}
                      <button
                        onClick={() => handleArchiveProject(p.id)}
                        className="text-xs text-neutral-300 hover:text-neutral-600 mt-1 transition-colors"
                      >
                        {p.archived ? t('deliver.teams.unarchive') : t('deliver.teams.archive')}
                      </button>
                    </div>
                  </div>

                  {count > 0 && (
                    <div className="mt-3">
                      <div className="h-1.5 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-semantic-success rounded-full transition-all"
                          style={{ width: `${Math.round((done / count) * 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                        {Math.round((done / count) * 100)}{t('deliver.teams.percentComplete')}
                      </p>
                    </div>
                  )}

                  {/* B20 — inline metrics strip */}
                  <section className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-900"
                    aria-label={`Project command center for ${p.name}`}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                          <Sparkles className="h-3.5 w-3.5 text-brand-navy dark:text-brand-navy-tint" aria-hidden="true" />
                          Command center
                        </p>
                        <p className={`mt-1 text-sm font-semibold ${healthClass}`}>
                          {command.health}: {command.explanation}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                          Sources: {command.citations.join(', ')}
                        </p>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:w-96">
                        <ProjectSignal icon={AlertTriangle} label="Risks & blockers"
                          value={`${command.risks + command.issues} open, ${command.blocked} blocked`} />
                        <ProjectSignal icon={ShieldCheck} label="SLA/customer"
                          value={command.slaRisk > 0 ? `${command.slaRisk} at risk` : 'No active SLA risk'} />
                        <ProjectSignal icon={Scale} label="Decisions"
                          value={command.decisions > 0 ? `${command.decisions} pending` : 'No pending decisions'} />
                        <ProjectSignal icon={GitBranch} label="DevSync"
                          value={command.devSync > 0 ? `${command.devSync} linked items` : 'No linked code yet'} />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800">
                        <MessageSquareText className="h-3.5 w-3.5 text-brand-navy" aria-hidden="true" />
                        Project room ready
                      </span>
                      <span className="inline-flex rounded-full border border-neutral-200 bg-white px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800">
                        Customer update draft can cite these signals
                      </span>
                      {command.nextActions.map(action => (
                        <span key={action} className="inline-flex rounded-full border border-neutral-200 bg-white px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800">
                          {action}
                        </span>
                      ))}
                    </div>
                  </section>

                  {projectMetricsLoading ? (
                    <div className="mt-3 flex gap-3" aria-busy="true" aria-label={t('deliver.teams.loadingMetrics')}>
                      <div className="animate-pulse bg-neutral-100 dark:bg-neutral-800 rounded h-8 w-24" aria-hidden="true" />
                      <div className="animate-pulse bg-neutral-100 dark:bg-neutral-800 rounded h-8 w-24" aria-hidden="true" />
                      <div className="animate-pulse bg-neutral-100 dark:bg-neutral-800 rounded h-8 w-24" aria-hidden="true" />
                    </div>
                  ) : projectMetrics[p.id] ? (
                    <div className="mt-3 flex flex-wrap gap-3">
                      {projectMetrics[p.id].velocity != null && (
                        <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                          <TrendingUp className="h-3.5 w-3.5 text-brand-navy" aria-hidden="true" />
                          <span className="font-semibold text-neutral-900 dark:text-neutral-100">{projectMetrics[p.id].velocity}</span>
                          <span>{t('deliver.teams.ptsPerSprint')}</span>
                        </div>
                      )}
                      {projectMetrics[p.id].completionPct != null && (
                        <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                          <Activity className="h-3.5 w-3.5 text-semantic-success" aria-hidden="true" />
                          <span className="font-semibold text-neutral-900 dark:text-neutral-100">{Math.round(projectMetrics[p.id].completionPct)}%</span>
                          <span>{t('deliver.teams.completion')}</span>
                        </div>
                      )}
                      {projectMetrics[p.id].cycleTimeDays != null && (
                        <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                          <span className="inline-block h-3.5 w-3.5 rounded-full border border-neutral-400 text-center leading-none text-xs font-bold" aria-hidden="true">⏱</span>
                          <span className="font-semibold text-neutral-900 dark:text-neutral-100">{projectMetrics[p.id].cycleTimeDays.toFixed(1)}d</span>
                          <span>{t('deliver.teams.cycleTime')}</span>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )
      }
    </PageLayout>
  );
}

function ProjectSignal({ icon: Icon, label, value }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800">
      <p className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{value}</p>
    </div>
  );
}
