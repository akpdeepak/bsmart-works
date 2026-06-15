import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { savedViewsClient } from '@/lib/saved-views';
import { savedViewsKeys } from './keys';

export function useSavedViews(workspaceId, projectId) {
  return useQuery({
    queryKey: savedViewsKeys.list(workspaceId, projectId),
    queryFn: () => savedViewsClient.list(workspaceId, projectId),
    enabled: Boolean(workspaceId),
    staleTime: 30 * 1000,
  });
}

export function useSavedViewMutations(workspaceId, projectId) {
  const qc = useQueryClient();
  const key = savedViewsKeys.list(workspaceId, projectId);

  const rename = useMutation({
    mutationFn: ({ id, name }) => savedViewsClient.update(workspaceId, id, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const remove = useMutation({
    mutationFn: (id) => savedViewsClient.delete(workspaceId, id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old) => (old ? old.filter((v) => v.id !== id) : old));
      return { prev };
    },
    onError: (_err, _id, ctx) => qc.setQueryData(key, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  const reorder = useMutation({
    mutationFn: ({ id, displayOrder }) =>
      savedViewsClient.update(workspaceId, id, { displayOrder }),
    onMutate: async ({ id, displayOrder }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old) => {
        if (!old) return old;
        return old.map((v) => (v.id === id ? { ...v, displayOrder } : v))
          .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.name.localeCompare(b.name));
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => qc.setQueryData(key, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { rename, remove, reorder };
}
