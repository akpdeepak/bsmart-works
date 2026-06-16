import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import { projectsKeys } from './queries/keys';
import { workItemsKeys } from './queries/keys';

// Prefetch-on-hover handlers for the main sidebar navigation items.
//
// Hovering a nav item that leads to a data-heavy view fires a prefetchQuery so the data is
// already in the TanStack Query cache by the time the user clicks. This shaves a visible loading
// state for the two most-traversed views (Projects / Teams and Work Items / Backlog).
//
// Usage:
//   const { onProjectsHover, onWorkItemsHover } = usePrefetchNav(workspaceId);
//   <NavItem onMouseEnter={onProjectsHover} ... />
//
// staleTime of 5 minutes: the prefetch is a speculative warm-up — data that's less than 5 min old
// is still good; avoid refetching unnecessarily if the user already visited the view recently.

const PREFETCH_STALE_MS = 5 * 60 * 1000; // 5 minutes

export function usePrefetchNav(workspaceId) {
  const queryClient = useQueryClient();

  function onProjectsHover() {
    if (!workspaceId) return;
    queryClient.prefetchQuery({
      queryKey: projectsKeys.list(workspaceId),
      queryFn: () => api.send(`/projects?workspaceId=${encodeURIComponent(workspaceId)}`),
      staleTime: PREFETCH_STALE_MS,
    });
  }

  function onWorkItemsHover() {
    if (!workspaceId) return;
    queryClient.prefetchQuery({
      queryKey: workItemsKeys.list(workspaceId, null),
      queryFn: () => {
        const params = new URLSearchParams({ workspaceId });
        return api.send(`/work-items?${params}`);
      },
      staleTime: PREFETCH_STALE_MS,
    });
  }

  return { onProjectsHover, onWorkItemsHover };
}
