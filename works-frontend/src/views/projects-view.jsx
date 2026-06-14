import { TrendingUp, Activity } from 'lucide-react';
import { Folder } from 'lucide-react';
import { Button } from '@/components/works/button';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { statusToCategory } from '@/components/works/status';
import { useI18n } from '@/lib/i18n';

// Teams view (formerly Projects). A Team is a workspace-level container for work items —
// equivalent to a JIRA project. Work item IDs are workspace-scoped (EP-0001 is unique
// across all teams). B20: teamMetrics is { [teamId]: { velocity, completionPct, cycleTimeDays } }.
export default function ProjectsView({
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
  // "Done" is resolved from the item's status category, not a literal string, so teams using
  // custom / renamed done statuses still show accurate completion.
  const isDone = (item) => (statusResolver
    ? statusResolver.categoryOf(item.type, item.status)
    : statusToCategory(item.status)) === 'done';
  return (
    <div className="p-8 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">{t('deliver.teams.title')}</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">
            {projects.length} {projects.length !== 1 ? t('deliver.teams.teamPlural') : t('deliver.teams.teamSingular')} {t('deliver.teams.inThisWorkspace')}
          </p>
        </div>
        <Button variant="action" onClick={() => setIsProjectOpen(true)}>{t('deliver.teams.newTeam')}</Button>
      </div>

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
              const count = workItems.filter(i => i.projectId === p.id).length;
              const done  = workItems.filter(i => i.projectId === p.id && isDone(i)).length;
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
    </div>
  );
}
