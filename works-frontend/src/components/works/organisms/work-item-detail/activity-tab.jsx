import { WorkItemStatusTimeline } from '@/components/works/organisms/work-item-status-timeline';
import { ActivityFeed } from '@/components/works/molecules/activity-feed';
import { useWorkItemActivity } from '@/hooks/queries/useWorkItemActivity';

// ActivityTab — renders the narrative activity feed for a single work item.
//
// Data comes from `useWorkItemActivity`, which fetches /work-items/{id}/events via the standard
// apiClient. The feed normalises both camelCase (eventType / actorName / createdAt) and
// snake_case (event_type / actor_name / occurred_at) shapes so it works with current and legacy
// server responses. The existing statusMetrics timeline is preserved above the feed.
//
// The old inline-fetch + setActivity prop pattern is no longer used for the narrative feed —
// that state lives in TanStack Query now. The legacy props (activity, setActivity,
// activityEventFilter, setActivityEventFilter, reportError) are accepted in the rest spread so
// the parent call-site in work-item-detail-panel.jsx does not need to change.
export function ActivityTab({ selectedItem, statusMetrics, activeWorkspaceId, currentUser, ...rest }) {
  // rest contains legacy props: activity, setActivity, activityEventFilter,
  // setActivityEventFilter, reportError — now unused; kept via spread for call-site stability.
  void rest;

  const workspaceId = activeWorkspaceId ?? selectedItem?.workspaceId;
  const workItemId  = selectedItem?.id;

  // Normalise events: the API may return camelCase (events table schema) or snake_case (legacy).
  // eventToSentence reads `event.eventType`; Avatar reads `event.actorName`.
  const { data: rawEvents = [], isLoading } = useWorkItemActivity(workspaceId, workItemId);

  const events = rawEvents.map((e) => ({
    ...e,
    // Normalise keys so ActivityFeed always sees camelCase
    eventType: e.eventType  ?? e.event_type,
    actorName: e.actorName  ?? e.actor_name,
    createdAt: e.createdAt  ?? e.occurred_at,
  }));

  return (
    <div>
      {statusMetrics?.durations?.length > 0 && (
        <div className="mb-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800">
          <WorkItemStatusTimeline metrics={statusMetrics} />
        </div>
      )}

      <ActivityFeed
        events={events}
        loading={isLoading}
        currentUser={currentUser}
      />
    </div>
  );
}
