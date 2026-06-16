// WI-11 — feature-flag hooks. Server-side flags; no third-party SDK (RB-40 §3).
//
// useFeatureFlags(workspaceId) — returns the full TanStack Query result for the flag list.
// useFeatureFlag(workspaceId, flagName) — derived selector: { enabled, variant }.
//   Returns { enabled: false, variant: null } when the flag is absent or still loading.

import { useQuery } from '@tanstack/react-query';
import { featureFlagsClient } from '@/lib/featureFlags';
import { featureFlagsKeys } from './keys';

export function useFeatureFlags(workspaceId) {
  return useQuery({
    queryKey: featureFlagsKeys.list(workspaceId),
    queryFn: () => featureFlagsClient.getAll(workspaceId),
    enabled: Boolean(workspaceId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFeatureFlag(workspaceId, flagName) {
  const { data } = useFeatureFlags(workspaceId);
  const flag = (data?.flags ?? []).find((f) => f.name === flagName);
  return { enabled: flag?.enabled ?? false, variant: flag?.variant ?? null };
}
