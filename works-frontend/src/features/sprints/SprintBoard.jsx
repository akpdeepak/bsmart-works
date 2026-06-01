import React from 'react';
import { Avatar, TypeBadge } from '@/components/works/ui';

export function SprintBoard({ items, columns, users, swimlaneBy, onDragStart, onDragOver, onDrop, onSelect, onDelete, density, allItems = [] }) {
  const pad = { compact: 'p-2', comfortable: 'p-3', spacious: 'p-4' };

  const getSwimlanes = () => {
    if (swimlaneBy === 'none') return [{ key: 'all', label: null, items }];
    if (swimlaneBy === 'assignee') {
      const keys = [...new Set(items.map(i => i.assigneeId || 'unassigned'))];
      return keys.map(k => ({ key: k, label: k === 'unassigned' ? 'Unassigned' : users.find(u => u.id === k)?.fullName || k, items: items.filter(i => (i.assigneeId || 'unassigned') === k) }));
    }
    if (swimlaneBy === 'type') {
      const keys = [...new Set(items.map(i => i.type))];
      return keys.map(k => ({ key: k, label: k, items: items.filter(i => i.type === k) }));
    }
    if (swimlaneBy === 'priority') {
      return ['CRITICAL','HIGH','MEDIUM','LOW'].map(p => ({ key: p, label: p, items: items.filter(i => (i.priority || 'MEDIUM') === p) })).filter(s => s.items.length > 0);
    }
    if (swimlaneBy === 'epic') {
      const epicMap = {};
      items.forEach(item => {
        const epicId = item.parentId || 'no-epic';
        if (!epicMap[epicId]) epicMap[epicId] = [];
        epicMap[epicId].push(item);
      });
      return Object.entries(epicMap).map(([epicId, epicItems]) => {
        const epic = allItems.find(i => i.id === epicId && i.type === 'Epic');
        return { key: epicId, label: epic ? `⚡ ${epic.title}` : epicId === 'no-epic' ? 'No Epic' : epicId, items: epicItems };
      }).sort((a, b) => {
        if (a.label === 'No Epic') return 1;
        if (b.label === 'No Epic') return -1;
        return a.label.localeCompare(b.label);
      });
    }
    if (swimlaneBy === 'tag') {
      const tagMap = { 'No Tags': [] };
      items.forEach(item => {
        if (!item.tags || item.tags.length === 0) {
          tagMap['No Tags'].push(item);
        } else {
          item.tags.forEach(tag => {
            if (!tagMap[tag]) tagMap[tag] = [];
            tagMap[tag].push(item);
          });
        }
      });
      return Object.entries(tagMap)
        .filter(([, tagItems]) => tagItems.length > 0)
        .map(([tag, tagItems]) => ({ key: tag, label: `🏷 ${tag}`, items: tagItems }))
        .sort((a, b) => {
          if (a.label === '🏷 No Tags') return 1;
          if (b.label === '🏷 No Tags') return -1;
          return a.label.localeCompare(b.label);
        });
    }
    return [{ key: 'all', label: null, items }];
  };

  return (
    <div className="flex-1 overflow-auto dark:bg-neutral-900">
      {getSwimlanes().map(lane => (
        <div key={lane.key}>
          {lane.label && (
            <div className="flex items-center gap-2 mb-2 mt-4 px-1">
              <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700"></div>
              <span className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider px-2">{lane.label}</span>
              <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700"></div>
            </div>
          )}
          <div className="flex gap-4 min-h-40">
            {columns.map(col => {
              const colItems = lane.items.filter(i => i.status === col.name);
              return (
                <div key={col.name} className="flex-1 min-w-48 flex flex-col bg-neutral-100 dark:bg-neutral-800 rounded-xl p-3"
                  onDragOver={onDragOver} onDrop={(e) => onDrop(e, col.name)}>
                  {!lane.label && (
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${col.dot}`}></span>
                        <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">{col.name}</h3>
                      </div>
                      <span className="text-xs bg-white dark:bg-neutral-700 text-neutral-500 dark:text-neutral-300 px-2 py-0.5 rounded-full shadow-sm">{colItems.length}</span>
                    </div>
                  )}
                  <div className="space-y-2 flex-1">
                    {colItems.length === 0 && <div className="flex items-center justify-center py-6 border-2 border-dashed border-neutral-200 rounded-lg"><p className="text-xs text-neutral-300">Drop here</p></div>}
                    {colItems.map(item => (
                      <div key={item.id} draggable onDragStart={(e) => onDragStart(e, item.id)}
                        className={`bg-white dark:bg-neutral-700 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-600 cursor-grab hover:shadow-md transition-shadow group ${pad[density]}`}>
                        <div className="flex items-start justify-between mb-1.5">
                          <span className="font-mono text-[10px] text-neutral-400">{item.id}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => onSelect(item)} className="text-neutral-400 hover:text-brand-navy text-xs p-0.5">✏</button>
                            <button onClick={() => onDelete(item.id)} className="text-neutral-400 hover:text-semantic-danger text-xs p-0.5">✕</button>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-neutral-900 leading-snug mb-2 cursor-pointer" onClick={() => onSelect(item)}>{item.title}</p>
                        <div className="flex items-center justify-between">
                          <TypeBadge type={item.type} compact={density === 'compact'} />
                          <div className="flex items-center gap-1.5">
                            {(item.storyPoints > 0) && <span className="text-[10px] text-neutral-400 font-medium">{item.storyPoints}pt</span>}
                            {item.assigneeId && <Avatar name={users.find(u => u.id === item.assigneeId)?.fullName || ''} size={5} />}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
