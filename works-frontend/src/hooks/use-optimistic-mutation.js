import { useMutation, useQueryClient } from '@tanstack/react-query';

// useOptimisticMutation — a thin wrapper around useMutation that pre-wires the three
// TanStack Query optimistic-update lifecycle hooks so callers don't repeat the same
// snapshot/rollback/invalidate boilerplate for every mutation.
//
// How it works:
//   onMutate  — saves a snapshot of the current cache, immediately applies the optimistic
//               update via `updater`, and returns the snapshot so onError can restore it.
//   onError   — rolls back to the snapshot when the server rejects the mutation.
//   onSettled — invalidates the query after either success or failure so the cache
//               converges to server truth regardless of what the optimistic write did.
//
// Any additional TanStack `useMutation` options (e.g. `onSuccess`, `onError`, `retry`)
// passed via `...options` are merged in and take effect alongside the pre-wired hooks.
//
// Usage:
//   const { mutate, isPending } = useOptimisticMutation({
//     queryKey: workItemsKeys.list(workspaceId, projectId),
//     mutationFn: (variables) => api.send('/work-items', { method: 'POST', body: JSON.stringify(variables) }),
//     updater:    (current, variables) => current ? [{ ...variables, _temp: true }, ...current] : [variables],
//   });
//
// Parameters:
//   queryKey   — the TanStack Query cache key to snapshot / update / invalidate
//   mutationFn — the async function that performs the server request
//   updater    — (currentData, variables) => nextData  — the optimistic cache transform
//   ...options — forwarded verbatim to useMutation
//
// Returns the full useMutation result object (mutate, mutateAsync, isPending, isError, …).
export function useOptimisticMutation({ queryKey, mutationFn, updater, ...options }) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn,

    // 1. Cancel any in-flight refetch so it doesn't overwrite our optimistic write, then
    //    snapshot the current data and apply the caller-supplied updater immediately.
    onMutate: async (variables) => {
      await qc.cancelQueries({ queryKey });
      const snapshot = qc.getQueryData(queryKey);
      qc.setQueryData(queryKey, (current) => updater(current, variables));
      // Return the snapshot in context so onError can roll back.
      return { snapshot };
    },

    // 2. If the server rejects the mutation, restore the pre-mutation snapshot.
    onError: (_err, _variables, context) => {
      if (context?.snapshot !== undefined) {
        qc.setQueryData(queryKey, context.snapshot);
      }
    },

    // 3. Invalidate after success OR failure — guarantees the cache converges to server truth.
    onSettled: () => {
      qc.invalidateQueries({ queryKey });
    },

    // Caller options are spread last so they can override or augment the lifecycle hooks above.
    // TanStack Query merges array-valued hooks, so a caller-supplied onError runs in addition to
    // the rollback above rather than replacing it.
    ...options,
  });
}
