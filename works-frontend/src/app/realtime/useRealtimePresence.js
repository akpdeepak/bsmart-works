import { useEffect, useRef, useState } from 'react';
import { connectRealtime, leavePresence, sendPresence } from '@/lib/realtime';
import { queryClient } from '@/lib/query-client';
import { viewToPath } from '@/lib/routes';

export function useRealtimePresence({ currentUser, workspaceId, view, enabled = true }) {
  const [presenceState, setPresenceState] = useState({ workspaceId: '', members: [] });
  const viewRef = useRef(view);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    if (!enabled || !currentUser || !workspaceId) return undefined;

    const dispose = connectRealtime(workspaceId, {
      event: () => queryClient.invalidateQueries(),
      presence: (data) => setPresenceState({
        workspaceId,
        members: Array.isArray(data?.present) ? data.present : [],
      }),
    });
    const heartbeat = () => sendPresence({
      workspaceId,
      name: currentUser.fullName || currentUser.email,
      location: viewToPath(viewRef.current) || viewRef.current,
    });
    heartbeat();
    const timer = setInterval(heartbeat, 15000);

    return () => {
      clearInterval(timer);
      dispose();
      leavePresence(workspaceId);
    };
  }, [currentUser, enabled, workspaceId]);

  return enabled && presenceState.workspaceId === workspaceId ? presenceState.members : [];
}
