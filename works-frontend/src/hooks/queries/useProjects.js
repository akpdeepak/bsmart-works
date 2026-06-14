import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import { projectsKeys } from './keys';

// Single source of truth for a workspace's projects (GET /projects?workspaceId=...).
// Previously fetched independently by App.jsx and performance-panel — see
// docs/analysis/ONE-source.md §A.2. Returns the standard TanStack Query result; `data` is the
// project array (undefined while loading).
export function useProjects(workspaceId) {
  return useQuery({
    queryKey: projectsKeys.list(workspaceId),
    queryFn: () => api.send(`/projects?workspaceId=${encodeURIComponent(workspaceId)}`),
    enabled: !!workspaceId,
  });
}
