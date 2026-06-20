import { ChevronDown, CircleDot, GitPullRequest, Link2, Rocket, ShieldCheck } from 'lucide-react';
import { buildEngineeringActivity } from '@/lib/engineering-activity';

function Signal({ label, value }) {
  return (
    <div className="rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/70 px-3 py-2">
      <dt className="text-xs text-neutral-600 dark:text-neutral-400">{label}</dt>
      <dd className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{value}</dd>
    </div>
  );
}

function EvidenceList({ items, onOpenItem }) {
  if (items.length === 0) {
    return <p className="text-sm text-neutral-600 dark:text-neutral-400">No active linked work evidence yet.</p>;
  }

  return (
    <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
      {items.map((item) => (
        <li key={item.id} className="py-2 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onOpenItem?.(item.id)}
            className="min-w-0 text-left rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
          >
            <span className="block text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">{item.title}</span>
            <span className="block text-xs text-neutral-600 dark:text-neutral-400">
              {item.id} - {item.status} - {item.evidenceCount} linked event{item.evidenceCount === 1 ? '' : 's'}
            </span>
          </button>
          <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${item.blocked ? 'bg-semantic-danger/10 text-semantic-danger' : 'bg-semantic-success/10 text-semantic-success'}`}>
            {item.blocked ? 'Blocked' : 'Flowing'}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function EngineeringActivityPanel({ home, onOpenItem }) {
  const activity = buildEngineeringActivity({
    todaysWork: home?.todaysWork,
    reviewQueue: home?.reviewQueue,
    blockers: home?.blockers,
    recentActivity: home?.recentActivity,
  });

  return (
    <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <span className="text-brand-navy dark:text-neutral-300"><ShieldCheck className="h-4 w-4" aria-hidden="true" /></span>
            Engineering activity
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{activity.summary}</p>
        </div>
        <span className="text-xs font-semibold rounded-full bg-brand-navy/10 text-brand-navy dark:bg-neutral-800 dark:text-neutral-200 px-2 py-1">
          Evidence, not ranking
        </span>
      </header>

      <dl className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Signal label="Pending review" value={activity.releaseReadiness.pendingReview} />
        <Signal label="Failed CI" value={activity.releaseReadiness.failedCi} />
        <Signal label="Merged" value={activity.releaseReadiness.merged} />
        <Signal label="Deployed" value={activity.releaseReadiness.deployed} />
      </dl>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2 mb-2">
            <GitPullRequest className="h-4 w-4 text-brand-navy dark:text-neutral-300" aria-hidden="true" />
            Review flow
          </h4>
          {activity.reviewFlow.length === 0 ? (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">No pull requests are waiting on review.</p>
          ) : (
            <ul className="space-y-2">
              {activity.reviewFlow.map((pr) => (
                <li key={pr.id} className="rounded-md border border-neutral-200 dark:border-neutral-700 p-3">
                  <a href={pr.url || '#'} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand-navy-tint hover:text-brand-navy hover:underline">
                    #{pr.number} {pr.title}
                  </a>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">{pr.repo} - {pr.status}</p>
                  <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-2">{pr.nextAction}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2 mb-2">
            <Link2 className="h-4 w-4 text-brand-navy dark:text-neutral-300" aria-hidden="true" />
            Linked work evidence
          </h4>
          <EvidenceList items={activity.linkedWork} onOpenItem={onOpenItem} />
        </div>
      </div>

      <details className="rounded-md border border-neutral-200 dark:border-neutral-700 p-3 group">
        <summary className="cursor-pointer list-none flex items-center justify-between gap-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Raw activity events
          <ChevronDown className="h-4 w-4 text-neutral-500 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        {activity.rawEvents.length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">No raw activity events were returned by the workspace feed.</p>
        ) : (
          <ul className="mt-2 divide-y divide-neutral-100 dark:divide-neutral-800">
            {activity.rawEvents.map((event) => (
              <li key={event.id} className="py-2 text-xs text-neutral-600 dark:text-neutral-400 flex items-start gap-2">
                <CircleDot className="h-3.5 w-3.5 mt-0.5 text-brand-navy dark:text-neutral-300" aria-hidden="true" />
                <span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">{event.label}</span>
                  {' - '}
                  {event.linked ? `Linked to ${event.workItemId}` : 'Unlinked, ready for manual linking'}
                  <span className="block">{event.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </details>

      <footer className="flex flex-wrap items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
        <Rocket className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Sources: {activity.citations.join(', ')}</span>
      </footer>
    </section>
  );
}
