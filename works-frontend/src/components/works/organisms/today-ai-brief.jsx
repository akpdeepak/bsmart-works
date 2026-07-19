import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Sparkles } from 'lucide-react';
import { AiMetaBadge } from '@/components/works/ai-meta-badge';
import { Button } from '@/components/works/button';
import { aiAssistClient } from '@/lib/ai-assist';

export function TodayAiBrief({ workspaceId, onOpenItem }) {
  const { data, isLoading } = useQuery({
    queryKey: ['today-nudges', workspaceId],
    queryFn: () => workspaceId
      ? aiAssistClient.getTodayNudges(workspaceId)
      : { summary: '', nudges: [], fallback: true, meta: { fallback: true } },
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(workspaceId),
  });

  if (isLoading) {
    return <div className="mb-6 h-28 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" aria-label="Loading daily brief" />;
  }
  if (!data) return null;

  return (
    <section aria-labelledby="today-ai-brief-heading"
      className="mb-6 rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="today-ai-brief-heading" className="flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">
            <Sparkles className="h-4 w-4 text-brand-navy" aria-hidden="true" />
            Daily brief
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-neutral-700 dark:text-neutral-300">
            {data.summary || 'No proactive focus signal is available right now.'}
          </p>
        </div>
        <AiMetaBadge meta={data.meta || { fallback: Boolean(data.fallback) }} />
      </div>

      {data.nudges?.length > 0 && (
        <div className="mt-4 border-t border-neutral-100 pt-3 dark:border-neutral-700">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Sources</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {data.nudges.map((nudge) => (
              <li key={nudge.workItemId || nudge.text}>
                <Button type="button" variant="secondary" size="sm"
                  onClick={() => onOpenItem?.(nudge.workItemId, nudge.title)}>
                  {nudge.workItemId || 'Assigned work'}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
