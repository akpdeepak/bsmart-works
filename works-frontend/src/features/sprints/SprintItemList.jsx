import React, { useState, useEffect } from 'react';
import { api } from '@/lib/apiClient';
import { Avatar, TypeBadge } from '@/components/works/ui';
import { StatusBadge } from '@/components/works/status-badge';
import { statusToCategory } from '@/components/works/status';

export function SprintItemList({ sprintId, users, onMoveToBacklog, onSelect }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    api.raw(`/sprints/${sprintId}/items`)
      .then(r => r.json()).then(d => setItems(Array.isArray(d) ? d : [])).catch(() => {});
  }, [sprintId]);

  if (items.length === 0) return <div className="px-5 py-4 text-sm text-neutral-400 text-center">No items in this sprint yet.</div>;
  return (
    <div className="divide-y divide-neutral-50 dark:divide-neutral-700">
      {items.map(item => (
        <div key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-700 group">
          <TypeBadge type={item.type} compact />
          <span className="font-mono text-[10px] text-neutral-400 w-20 flex-shrink-0">{item.id}</span>
          <span className="flex-1 text-sm text-neutral-900 cursor-pointer hover:text-brand-navy truncate" onClick={() => onSelect(item)}>{item.title}</span>
          <StatusBadge category={statusToCategory(item.status)}>{item.status}</StatusBadge>
          {(item.storyPoints > 0) && <span className="text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-1.5 py-0.5 rounded">{item.storyPoints}pt</span>}
          {item.assigneeId && <Avatar name={users.find(u => u.id === item.assigneeId)?.fullName || ''} size={6} />}
          <button onClick={() => { onMoveToBacklog(item.id); setItems(prev => prev.filter(i => i.id !== item.id)); }}
            className="opacity-0 group-hover:opacity-100 text-xs text-neutral-400 hover:text-brand-navy transition-opacity">↓ Backlog</button>
        </div>
      ))}
    </div>
  );
}
