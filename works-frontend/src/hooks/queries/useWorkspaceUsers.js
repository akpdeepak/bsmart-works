import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import { usersKeys } from './keys';

// Single source of truth for "the members of a workspace" (GET /users?workspaceId=...).
// Previously fetched independently (and mirrored into local useState) by App.jsx,
// metric-share-control, and performance-panel — see docs/analysis/ONE-source.md §A.2.
// Returns the standard TanStack Query result; `data` is the user array (undefined while loading).
export function useWorkspaceUsers(workspaceId) {
  return useQuery({
    queryKey: usersKeys.list(workspaceId),
    queryFn: () => api.send(`/users?workspaceId=${encodeURIComponent(workspaceId)}`),
    enabled: !!workspaceId,
  });
}
