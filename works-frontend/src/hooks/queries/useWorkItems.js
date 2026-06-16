import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import { workItemsKeys } from './keys';

// Single source of truth for a workspace's work-item list (GET /work-items?workspaceId=...).
// Complements the per-view state in App.jsx; components that own their own data section
// (e.g. backlog, board) can subscribe here instead of receiving items as props from App.jsx.
// Returns the standard TanStack Query result; `data` is the item array (undefined while loading).
export function useWorkItems(workspaceId, { projectId } = {}) {
  return useQuery({
    queryKey: workItemsKeys.list(workspaceId, projectId),
    queryFn: () => {
      const params = new URLSearchParams({ workspaceId });
      if (projectId) params.set('projectId', projectId);
      return api.send(`/work-items?${params}`);
    },
    enabled: Boolean(workspaceId),
  });
}
