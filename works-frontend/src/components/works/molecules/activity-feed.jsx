import { Activity } from 'lucide-react';
import { Avatar } from '@/components/works/atoms/avatar';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { eventToSentence, groupEventsByDay } from '@/lib/activity-feed';
import { relativeTime, shortDate } from '@/lib/format';

// ---------------------------------------------------------------------------
// Day-label helpers
// ---------------------------------------------------------------------------

function dayLabel(isoDate) {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (isoDate === today) return 'Today';
  if (isoDate === yesterday) return 'Yesterday';
  // Format as "Jun 12" using the month-day shortDate helper applied to noon UTC on that day
  return shortDate(`${isoDate}T12:00:00Z`);
}

// ---------------------------------------------------------------------------
// Loading skeleton — 4 rows, matches final layout shape
// ---------------------------------------------------------------------------
function ActivitySkeleton() {
  return (
    <ul aria-busy="true" aria-label="Loading activity" className="space-y-3">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full animate-pulse bg-neutral-100 flex-shrink-0" />
          <div className="flex-1 space-y-1.5 pt-1">
            <div className="animate-pulse bg-neutral-100 rounded h-3 w-3/4" />
            <div className="animate-pulse bg-neutral-100 rounded h-2.5 w-1/3" />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export function ActivityFeed({ events = [], loading = false }) {
  if (loading) return <ActivitySkeleton />;

  if (events.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No activity yet"
        subtitle="Actions on this item — status changes, comments, assignments — will appear here."
      />
    );
  }

  const groups = groupEventsByDay(events);

  return (
    <div>
      {groups.map(({ date, events: dayEvents }) => (
        <section key={date} className="mb-5 last:mb-0">
          <h3
            aria-label={`Activity on ${date}`}
            className="text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400 mb-2"
          >
            {dayLabel(date)}
          </h3>

          <ul className="space-y-3">
            {dayEvents.map((event) => (
              <li key={event.id ?? `${event.eventType}-${event.createdAt}`} className="flex items-start gap-3">
                <Avatar name={event.actorName ?? event.actor_name ?? 'System'} size={7} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neutral-900 dark:text-neutral-100 leading-snug">
                    <span className="font-semibold">
                      {event.actorName ?? event.actor_name ?? 'System'}
                    </span>
                    {' '}
                    {eventToSentence(event)}
                  </p>
                  <time
                    dateTime={event.createdAt}
                    className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 block"
                  >
                    {relativeTime(event.createdAt)}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
