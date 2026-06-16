// Hook — subscribes to the global toast queue and re-renders on changes.
// Returns { visible, queue } from the toast singleton.
import { useState, useEffect } from 'react';
import { subscribeToasts } from '@/lib/toast-queue';

export function useToastQueue() {
  const [state, setState] = useState({ visible: [], queue: [] });
  useEffect(() => subscribeToasts(setState), []);
  return state;
}
