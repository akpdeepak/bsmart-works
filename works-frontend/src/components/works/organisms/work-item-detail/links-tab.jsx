import { X } from 'lucide-react';
import { StatusBadge } from '@/components/works/status-badge';
import { statusToCategory } from '@/components/works/status';
import { TypeBadge } from '@/components/works/work-item-type';
import { WorkItemSearchPicker } from '@/components/works/organisms/work-item-search-picker';

// LINKS TAB — hierarchy (parent/child) + typed relationships, all via work-item search
export function LinksTab({
  selectedItem, setSelectedItem, workItems, itemChildren,
  links, newLink, setNewLink, handleDeleteLink, handleCreateLink,
  handleSetParent, handleAddChild, handleRemoveChild,
  statusResolver,
}) {
  const HIER = new Set(['PARENT', 'CHILD']);
  const relLinks = links.filter(l => !HIER.has(l.linkType));
  const parent = selectedItem.parentId ? workItems.find(i => i.id === selectedItem.parentId) : null;
  const linkedIds = [selectedItem.id,
    ...(selectedItem.parentId ? [selectedItem.parentId] : []),
    ...itemChildren.map(c => c.id), ...relLinks.map(l => l.targetId)];
  const catOf = (c) => statusResolver ? statusResolver.categoryOf(c.type, c.status) : statusToCategory(c.status);
  const REL_TYPES = ['RELATES_TO', 'BLOCKS', 'BLOCKED_BY', 'DUPLICATES'];
  const rowCls = 'flex items-center gap-2 p-2 rounded-lg border border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800';
  return (
    <div className="space-y-5">
      {/* Hierarchy */}
      <div>
        <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">Hierarchy</p>
        <div className="mb-3">
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-1">Parent</p>
          {selectedItem.parentId ? (
            <div className={rowCls}>
              {parent ? <>
                <TypeBadge type={parent.type} compact />
                <button onClick={() => setSelectedItem(parent)} className="flex-1 min-w-0 text-left text-sm text-neutral-900 dark:text-neutral-100 truncate hover:text-brand-navy">
                  <span className="font-mono text-xs text-neutral-500 mr-1">{parent.autoId || parent.id}</span>{parent.title}
                </button>
              </> : <span className="flex-1 font-mono text-xs">{selectedItem.parentId}</span>}
              <button onClick={() => handleSetParent(null)} className="text-neutral-300 hover:text-semantic-danger flex-shrink-0" aria-label="Remove parent"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>
            </div>
          ) : (
            <WorkItemSearchPicker placeholder="Search to set a parent…" excludeIds={linkedIds}
              onSelect={(item) => handleSetParent(item.id)} />
          )}
        </div>
        <div>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-1">Children ({itemChildren.length})</p>
          {itemChildren.length > 0 && (
            <div className="space-y-1 mb-2">
              {itemChildren.map(child => (
                <div key={child.id} className={rowCls}>
                  <TypeBadge type={child.type} compact />
                  <button onClick={() => setSelectedItem(child)} className="flex-1 min-w-0 text-left text-sm text-neutral-900 dark:text-neutral-100 truncate hover:text-brand-navy">
                    <span className="font-mono text-xs text-neutral-500 mr-1">{child.autoId || child.id}</span>{child.title}
                  </button>
                  <StatusBadge category={catOf(child)}>{child.status}</StatusBadge>
                  <button onClick={() => handleRemoveChild(child.id)} className="text-neutral-300 hover:text-semantic-danger flex-shrink-0" aria-label="Remove child"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>
                </div>
              ))}
            </div>
          )}
          <WorkItemSearchPicker placeholder="Search to add a child…" excludeIds={linkedIds}
            onSelect={(item) => handleAddChild(item)} />
        </div>
      </div>

      {/* Relationships */}
      <div>
        <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">Relationships</p>
        {relLinks.length === 0 && <p className="text-xs text-neutral-500 mb-2">No linked items yet.</p>}
        {relLinks.length > 0 && (
          <div className="space-y-1 mb-2">
            {relLinks.map(l => {
              const t = workItems.find(i => i.id === l.targetId);
              return (
                <div key={l.id} className={rowCls}>
                  <span className="text-xs font-semibold bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-1.5 py-0.5 rounded uppercase flex-shrink-0">{l.linkType?.replace('_', ' ')}</span>
                  <button onClick={() => t && setSelectedItem(t)} className="flex-1 min-w-0 text-left text-sm text-neutral-900 dark:text-neutral-100 truncate hover:text-brand-navy">
                    <span className="font-mono text-xs text-neutral-500 mr-1">{l.targetId}</span>{l.targetTitle || ''}
                  </button>
                  <button onClick={() => handleDeleteLink(l.id)} className="text-neutral-300 hover:text-semantic-danger flex-shrink-0" aria-label="Remove link"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex gap-2 items-start">
          <select value={newLink.linkType} onChange={e => setNewLink(p => ({ ...p, linkType: e.target.value }))} className="input w-32 flex-shrink-0">
            {REL_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
          </select>
          <div className="flex-1 min-w-0">
            <WorkItemSearchPicker placeholder="Search to link…" excludeIds={linkedIds}
              onSelect={(item) => handleCreateLink(item.id, newLink.linkType || 'RELATES_TO')} />
          </div>
        </div>
      </div>
    </div>
  );
}
