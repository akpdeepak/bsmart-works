import { useState, useEffect } from 'react';
import { ArrowDown } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { reportError } from '@/lib/report-error';
import { onPressKey } from '@/lib/utils';
import { TypeBadge } from '@/components/works/work-item-type';
import { StatusBadge } from '@/components/works/status-badge';
import { statusToCategory } from '@/components/works/status';
import { Avatar } from '@/components/works/atoms/avatar';

// Sprint item list (extracted from App.jsx, TD-003 / ONE Function). Lists the work items in a sprint
// with inline "move to backlog". Self-fetches via the single apiClient.
export function SprintItemList({ sprintId, users, onMoveToBacklog, onSelect }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    api.send(`/sprints/${sprintId}/items`)
      .then(d => setItems(Array.isArray(d) ? d : [])).catch(reportError);
  }, [sprintId]);

  if (items.length === 0) return <div className="px-5 py-4 text-sm text-neutral-600 text-center">No items in this sprint yet.</div>;
  return (
    <div className="divide-y divide-neutral-50 dark:divide-neutral-700">
      {items.map(item => (
        <div key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-700 group">
          <TypeBadge type={item.type} compact />
          <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400 w-20 flex-shrink-0">{item.id}</span>
          <span role="button" tabIndex={0} onKeyDown={onPressKey} className="flex-1 text-sm text-neutral-900 cursor-pointer hover:text-brand-navy truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded" onClick={() => onSelect(item)}>{item.title}</span>
          <StatusBadge category={statusToCategory(item.status)}>{item.status}</StatusBadge>
          {(item.storyPoints > 0) && <span className="text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-1.5 py-0.5 rounded">{item.storyPoints}pt</span>}
          {item.assigneeId && <Avatar name={users.find(u => u.id === item.assigneeId)?.fullName || ''} size={6} />}
          <button onClick={() => { onMoveToBacklog(item.id); setItems(prev => prev.filter(i => i.id !== item.id)); }}
            className="opacity-0 group-hover:opacity-100 text-xs text-neutral-600 dark:text-neutral-400 hover:text-brand-navy transition-opacity" aria-label="Move to backlog"><ArrowDown className="inline-block h-3.5 w-3.5 mr-1 align-text-bottom" aria-hidden="true" />Backlog</button>
        </div>
      ))}
    </div>
  );
}
