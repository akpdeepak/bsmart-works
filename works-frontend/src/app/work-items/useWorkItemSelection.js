import { useCallback, useRef, useState } from 'react';
import { api } from '@/lib/apiClient';
import { reportError } from '@/lib/report-error';

function isHydratedWorkItem(item, id) {
  return item?.id === id && Object.prototype.hasOwnProperty.call(item, 'description');
}

export function useWorkItemSelection() {
  const [selectedItem, setSelectedItemState] = useState(null);
  const selectedItemRef = useRef(null);
  const requestSequence = useRef(0);

  const setSelectedItem = useCallback((value) => {
    requestSequence.current += 1;
    setSelectedItemState((current) => {
      const next = typeof value === 'function' ? value(current) : value;
      selectedItemRef.current = next;
      return next;
    });
  }, []);

  const openWorkItemById = useCallback(async (id) => {
    if (!id) {
      setSelectedItem(null);
      return null;
    }

    const current = selectedItemRef.current;
    if (isHydratedWorkItem(current, id)) return current;

    const requestId = ++requestSequence.current;
    selectedItemRef.current = null;
    setSelectedItemState(null);

    try {
      const item = await api.send(`/work-items/${encodeURIComponent(id)}`);
      if (requestSequence.current === requestId) {
        selectedItemRef.current = item;
        setSelectedItemState(item);
      }
      return item;
    } catch (error) {
      if (requestSequence.current === requestId) {
        selectedItemRef.current = null;
        setSelectedItemState(null);
        reportError(error);
      }
      return null;
    }
  }, [setSelectedItem]);

  return { selectedItem, setSelectedItem, openWorkItemById };
}
