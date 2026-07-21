import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'bSmartActiveWorkspace';

export function resolveActiveWorkspace(workspaces, persistedId) {
  if (!Array.isArray(workspaces) || workspaces.length === 0) return '';
  return workspaces.some((workspace) => workspace.id === persistedId)
    ? persistedId
    : workspaces[0].id;
}

export function useWorkspaceContext(api, currentUser) {
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(false);
    setReady(false);
    try {
      const response = await api.raw('/workspaces/mine');
      const body = await response.json();
      const memberships = Array.isArray(body) ? body : [];
      const persistedId = localStorage.getItem(STORAGE_KEY) || '';
      const resolvedId = resolveActiveWorkspace(memberships, persistedId);

      setWorkspaces(memberships);
      setActiveWorkspaceId(resolvedId);
      if (resolvedId) localStorage.setItem(STORAGE_KEY, resolvedId);
      else localStorage.removeItem(STORAGE_KEY);
      setReady(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [api, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const timer = setTimeout(refresh, 0);
    return () => clearTimeout(timer);
  }, [currentUser, refresh]);

  const selectWorkspace = useCallback((workspaceId) => {
    if (!workspaces.some((workspace) => workspace.id === workspaceId)) return false;
    localStorage.setItem(STORAGE_KEY, workspaceId);
    setActiveWorkspaceId(workspaceId);
    return true;
  }, [workspaces]);

  return {
    workspaces: currentUser ? workspaces : [],
    activeWorkspaceId: currentUser ? activeWorkspaceId : '',
    loading,
    error,
    ready: Boolean(currentUser && ready),
    refresh,
    selectWorkspace,
  };
}
