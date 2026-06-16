import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import { workItemActivityKeys } from './keys';

// Fetches the activity event list for a single work item.
// Calls GET /work-items/{id}/events — if the endpoint does not yet exist, the
// query returns an empty array (isLoading stays false) so the ActivityFeed
// molecule renders the empty state without throwing.
export function useWorkItemActivity(workspaceId, workItemId) {
  return useQuery({
    queryKey: workItemActivityKeys.list(workspaceId, workItemId),
    queryFn: async () => {
      const data = await api
        .send(`/work-items/${workItemId}/events?workspaceId=${workspaceId}`)
        .catch(() => []);
      return Array.isArray(data) ? data : [];
    },
    enabled: Boolean(workspaceId) && Boolean(workItemId),
    // Activity is append-only; a 30 s stale window keeps the feed fresh without
    // hammering the server on every re-render.
    staleTime: 30_000,
  });
}
