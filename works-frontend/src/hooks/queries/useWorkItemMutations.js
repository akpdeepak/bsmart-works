import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import { workItemsKeys } from './keys';

// Not a real UUID — used only as a stable reference during the optimistic window.
// Never sent to the server; replaced by the real id on success.
function tempId() {
  return `__temp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// Optimistically add a new work item to the cache while the POST is in flight.
// On success: swap the temp row for the real server item (picking up autoId, createdAt, etc.).
// On error: restore the snapshot so the failed item never appears to the user.
// onSettled always invalidates so the cache converges to server truth even if onSuccess races.
//
// Usage:
//   const { mutate: createItem, isPending } = useWorkItemCreate(workspaceId, { projectId });
//   createItem(formData, { onError: (e) => showToast(e.message, 'error') });
export function useWorkItemCreate(workspaceId, { projectId } = {}) {
  const qc = useQueryClient();
  const key = workItemsKeys.list(workspaceId, projectId);

  return useMutation({
    mutationFn: (data) =>
      api.send('/work-items', { method: 'POST', body: JSON.stringify(data) }),

    onMutate: async (variables) => {
      // Cancel any overlapping refetch so it doesn't clobber our optimistic write.
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData(key);
      const _tempId = tempId();
      const optimistic = {
        ...variables,
        id: _tempId,
        _temp: true,
        createdAt: new Date().toISOString(),
      };
      qc.setQueryData(key, (prev) => (prev ? [optimistic, ...prev] : [optimistic]));
      return { snapshot, _tempId };
    },

    onError: (_err, _variables, context) => {
      if (context?.snapshot !== undefined) {
        qc.setQueryData(key, context.snapshot);
      }
    },

    onSuccess: (saved, _variables, context) => {
      if (context?._tempId) {
        qc.setQueryData(key, (prev) =>
          prev ? prev.map((i) => (i.id === context._tempId ? saved : i)) : [saved],
        );
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}

// Optimistically update a work item's status in the cache, rolling back on any error.
// On success: adopt the full server-returned item so derived fields (statusChangedAt, lapse
// badges, workflow-enforced derived columns) are accurate rather than optimistic guesses.
//
// Usage:
//   const { mutate: changeStatus } = useWorkItemStatusChange(workspaceId, { projectId });
//   changeStatus(
//     { item, newStatus: 'DONE' },
//     { onError: (e) => showToast(e.message || 'Failed to update status', 'error') },
//   );
export function useWorkItemStatusChange(workspaceId, { projectId } = {}) {
  const qc = useQueryClient();
  const key = workItemsKeys.list(workspaceId, projectId);

  return useMutation({
    mutationFn: ({ item, newStatus }) =>
      api.send(`/work-items/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...item, status: newStatus }),
      }),

    onMutate: async ({ item, newStatus }) => {
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData(key);
      qc.setQueryData(key, (prev) =>
        prev ? prev.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i)) : prev,
      );
      return { snapshot };
    },

    onError: (_err, _variables, context) => {
      if (context?.snapshot !== undefined) {
        qc.setQueryData(key, context.snapshot);
      }
    },

    onSuccess: (saved) => {
      qc.setQueryData(key, (prev) =>
        prev ? prev.map((i) => (i.id === saved.id ? saved : i)) : prev,
      );
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}
