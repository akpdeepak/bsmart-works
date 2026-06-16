import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import { workItemActivityKeys } from './keys';

// Fetches the activity event list for a single work item.
// Calls GET /work-items/{id}/activity — normalises snake_case keys returned by
// JdbcTemplate (event_type, occurred_at, actor_name) to the camelCase shape
// the ActivityFeed molecule and activity-feed.js lib expect.
export function useWorkItemActivity(workspaceId, workItemId) {
  return useQuery({
    queryKey: workItemActivityKeys.list(workspaceId, workItemId),
    queryFn: async () => {
      const data = await api
        .send(`/work-items/${workItemId}/activity?workspaceId=${workspaceId}`)
        .catch(() => []);
      const rows = Array.isArray(data) ? data : [];
      return rows.map((e) => ({
        ...e,
        eventType:  e.eventType  ?? e.event_type,
        createdAt:  e.createdAt  ?? e.occurred_at,
        actorName:  e.actorName  ?? e.actor_name,
        payload:    typeof e.payload === 'string' ? (() => { try { return JSON.parse(e.payload); } catch { return {}; } })() : (e.payload ?? {}),
      }));
    },
    enabled: Boolean(workspaceId) && Boolean(workItemId),
    // Activity is append-only; a 30 s stale window keeps the feed fresh without
    // hammering the server on every re-render.
    staleTime: 30_000,
  });
}
