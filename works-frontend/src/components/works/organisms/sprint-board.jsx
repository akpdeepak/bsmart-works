import { SquarePen, X } from 'lucide-react';
import { TypeBadge } from '@/components/works/work-item-type';
import { Avatar } from '@/components/works/atoms/avatar';
import { StatusBadge } from '@/components/works/status-badge';
import { statusToCategory } from '@/components/works/status';
import { PriorityBadge } from '@/components/works/priority-badge';
import { LapseBadge } from '@/components/works/atoms/lapse-badge';
import { computeLapse } from '@/lib/status-lapse';

/**
 * SprintBoard — kanban board with swimlane support for the sprint view.
 *
 * Extracted from App.jsx (TD-003) so it can be imported independently.
 */
export function SprintBoard({ items, columns, users, swimlaneBy, onDragStart, onDragOver, onDrop, onSelect, onDelete, density, allItems = [], cardPrefs, customFieldDefs = [], statusResolver }) {
  const pad = { compact: 'p-2', comfortable: 'p-3', spacious: 'p-4' };
  const iv = cardPrefs?.isVisible ?? (() => true);
  // Group cards into columns by category (per-type status config; legacy-safe), so custom
  // statuses land in the right column. Columns themselves are matched to a category by name.
  const colCat = (col) => statusToCategory(col.name);
  const itemCat = (i) => statusResolver ? statusResolver.categoryOf(i.type, i.status) : statusToCategory(i.status);

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
        const epic = allItems.find(i => i.id === epicId && i.type === 'EPIC');
        return {
          key: epicId,
          label: epic ? epic.title : epicId === 'no-epic' ? 'No Epic' : epicId,
          items: epicItems
        };
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
        .map(([tag, tagItems]) => ({ key: tag, label: tag, items: tagItems }))
        .sort((a, b) => {
          if (a.label === 'No Tags') return 1;
          if (b.label === 'No Tags') return -1;
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
              <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider px-2">{lane.label}</span>
              <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700"></div>
            </div>
          )}
          <div className="flex gap-4 min-h-40">
            {columns.map(col => {
              const colItems = lane.items.filter(i => itemCat(i) === colCat(col));
              return (
                <div key={col.name} className="flex-1 min-w-48 flex flex-col bg-neutral-100 dark:bg-neutral-800 rounded-xl p-3"
                  onDragOver={onDragOver} onDrop={(e) => onDrop(e, colCat(col))}>
                  {!lane.label && (
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${col.dot}`}></span>
                        <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">{col.name}</h3>
                      </div>
                      <span className="text-xs bg-white dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded-full shadow-sm">{colItems.length}</span>
                    </div>
                  )}
                  <div className="space-y-2 flex-1">
                    {colItems.length === 0 && <div className="flex items-center justify-center py-6 border-2 border-dashed border-neutral-200 rounded-lg"><p className="text-xs text-neutral-300">Drop here</p></div>}
                    {colItems.map(item => {
                      const customVisible = customFieldDefs.filter(d => iv(`fd_${d.id}`) && item.fieldValues?.[d.id] != null);
                      const lapse = computeLapse(item.statusChangedAt, statusResolver?.metaFor(item.type, item.status) ?? null);
                      const showLapse = itemCat(item) !== 'done' && (lapse.state === 'at_risk' || lapse.state === 'breached');
                      return (
                        <div key={item.id} draggable onDragStart={(e) => onDragStart(e, item.id)}
                          className={`bg-white dark:bg-neutral-700 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-600 cursor-grab hover:shadow-md transition-shadow group ${pad[density]}`}>
                          <div className="flex items-start justify-between mb-1.5">
                            <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400">{item.autoId || item.id}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => onSelect(item)} className="text-neutral-600 dark:text-neutral-400 hover:text-brand-navy text-xs p-0.5" aria-label="Edit"><SquarePen className="h-3.5 w-3.5" aria-hidden="true" /></button>
                              <button onClick={() => onDelete(item.id)} className="text-neutral-600 dark:text-neutral-400 hover:text-semantic-danger text-xs p-0.5" aria-label="Delete"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>
                            </div>
                          </div>
                          <button type="button" className="text-sm font-medium text-neutral-900 dark:text-neutral-100 leading-snug mb-2 cursor-pointer text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded" onClick={() => onSelect(item)}>{item.title}</button>
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <TypeBadge type={item.type} compact={density === 'compact'} />
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {iv('priority') && item.priority && <PriorityBadge priority={item.priority} />}
                              {iv('status') && <StatusBadge category={itemCat(item)}>{item.status}</StatusBadge>}
                              {showLapse && <LapseBadge lapse={lapse} compact />}
                              {iv('storyPoints') && item.storyPoints > 0 && <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">{item.storyPoints}pt</span>}
                              {iv('assignee') && item.assigneeId && <Avatar name={users.find(u => u.id === item.assigneeId)?.fullName || ''} size={5} />}
                            </div>
                          </div>
                          {iv('tags') && item.tags && item.tags.length > 0 && density !== 'compact' && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {item.tags.map(t => (
                                <span key={t} className="text-xs bg-neutral-100 dark:bg-neutral-600 text-neutral-600 dark:text-neutral-300 px-1.5 py-0.5 rounded">{t}</span>
                              ))}
                            </div>
                          )}
                          {customVisible.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {customVisible.map(d => (
                                <span key={d.id} className="text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-1.5 py-0.5 rounded" title={d.name}>
                                  {d.name}: {String(item.fieldValues[d.id])}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
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
