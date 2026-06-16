import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';

// ── HEART metrics ────────────────────────────────────────────────────────────

export function useHeartMetrics(workspaceId) {
  return useQuery({
    queryKey: ['heart-metrics', workspaceId],
    queryFn: () => api.send(`/metrics/heart?workspaceId=${encodeURIComponent(workspaceId)}`),
    enabled: Boolean(workspaceId),
    staleTime: 5 * 60_000,
  });
}

// ── Activation funnel ────────────────────────────────────────────────────────

export function useActivationFunnel(workspaceId) {
  return useQuery({
    queryKey: ['activation-funnel', workspaceId],
    queryFn: () => api.send(`/metrics/funnel?workspaceId=${encodeURIComponent(workspaceId)}`),
    enabled: Boolean(workspaceId),
    staleTime: 5 * 60_000,
  });
}
