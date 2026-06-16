import { api } from '@/lib/apiClient';

const ws = (workspaceId) => encodeURIComponent(workspaceId);

export const workspaceSetupClient = {
  getStatus: (workspaceId) =>
    api.send(`/workspace-setup/status?workspaceId=${ws(workspaceId)}`),
};
