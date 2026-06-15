import { useQuery } from '@tanstack/react-query';
import { workspaceSetupClient } from '@/lib/workspaceSetup';
import { workspaceSetupKeys } from './keys';

export function useWorkspaceSetup(workspaceId) {
  return useQuery({
    queryKey: workspaceSetupKeys.status(workspaceId),
    queryFn: () => workspaceSetupClient.getStatus(workspaceId),
    enabled: Boolean(workspaceId),
    staleTime: 60 * 1000,
  });
}
