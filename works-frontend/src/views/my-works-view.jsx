import { Star, User, AtSign, ClipboardList, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/works/button';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { TypeBadge } from '@/components/works/work-item-type';
import { StatusBadge } from '@/components/works/status-badge';
import { statusToCategory } from '@/components/works/status';

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// Tune this surface here — no JSX diving needed.
const CONFIG = {
  activityLimit: 20,          // max rows shown in the Recent Activity tab
  dueDateWarnDays: 3,         // days ahead at which the due-date label turns orange
  activitySortField: 'updatedAt', // sort key for activity; falls back to 'id'
};

// Returns a short relative time string: "2h ago", "3d ago", or a short date past 7 days.
function relativeTime(dateStr) {
  if (!dateStr) return '';
  const m = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d ago` : new Date(dateStr).toLocaleDateString();
}

// Returns { text, urgent } for a due date, or null if none.
function dueDateMeta(dateStr) {
  if (!dateStr) return null;
  const days = Math.ceil(
    (new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000
  );
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, urgent: true };
  if (days === 0) return { text: 'Due today', urgent: true };
  if (days <= CONFIG.dueDateWarnDays) return { text: `Due in ${days}d`, urgent: false };
  return { text: new Date(dateStr).toLocaleDateString(), urgent: false };
}

// Shared work-item row — used across Assigned, Starred, and Activity tabs.
function WorkRow({ item, onSelect, onPressKey, starred = false, compact = false }) {
  const due = dueDateMeta(item.dueDate);
  return (
    <div
      role="button" tabIndex={0}
      onClick={() => onSelect(item)}
      onKeyDown={onPressKey}
      className={cn(
        'bg-white dark:bg-neutral-800 border rounded-lg flex items-center gap-3',
        'cursor-pointer transition-shadow hover:shadow-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy-tint/40',
        compact ? 'p-3' : 'p-4',
        starred ? 'border-brand-orange/40' : 'border-neutral-200 dark:border-neutral-700'
      )}
    >
      {starred && <Star className="h-3.5 w-3.5 text-brand-orange fill-current flex-shrink-0" aria-hidden="true" />}
      <TypeBadge type={item.type} compact={compact} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{item.title}</p>
        <p className="text-xs text-neutral-600 dark:text-neutral-400 font-mono">{item.id}</p>
      </div>
      <StatusBadge category={statusToCategory(item.status)}>{item.status}</StatusBadge>
      {due && (
        <span className={cn(
          'text-xs font-medium whitespace-nowrap',
          due.urgent ? 'text-semantic-danger' : 'text-semantic-warning'
        )}>
          {due.text}
        </span>
      )}
    </div>
  );
}

// My Works view — personal workspace showing a user's assigned, starred, mentioned, and active items.
export default function MyWorksView({
  myItems,
  workItems,
  notifications,
  myWorksTab,
  currentUser,
  setMyWorksTab,
  setSelectedItem,
  setIsCreateOpen,
  onPressKey,
}) {
  // Compute tab data once to avoid repeated inline .filter() calls in JSX.
  const starredItems = workItems.filter(i => i.starred);
  const mentions = notifications.filter(n => n.type === 'MENTION');

  const activityAll = workItems
    .filter(i => i.createdBy === currentUser?.id || i.assigneeId === currentUser?.id)
    .sort((a, b) => {
      const av = String(a[CONFIG.activitySortField] ?? a.id ?? '');
      const bv = String(b[CONFIG.activitySortField] ?? b.id ?? '');
      return bv.localeCompare(av); // descending — most recent first
    });
  const activityItems = activityAll.slice(0, CONFIG.activityLimit);
  const activityOverflow = activityAll.length - activityItems.length;

  const tabs = [
    { key: 'assigned', label: 'Assigned', count: myItems.length },
    { key: 'starred',  label: 'Starred',  count: starredItems.length },
    { key: 'mentions', label: 'Mentions', count: mentions.length },
    { key: 'activity', label: 'Activity' },
  ];

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-brand-navy mb-1">My Works</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">Your personal workspace</p>

      {/* Tab bar */}
      <div role="tablist" className="flex gap-1 mb-5 border-b border-neutral-200 dark:border-neutral-700">
        {tabs.map(t => (
          <button
            key={t.key}
            role="tab"
            aria-selected={myWorksTab === t.key}
            onClick={() => setMyWorksTab(t.key)}
            className={cn(
              'text-sm font-medium px-4 py-2 border-b-2 transition-colors',
              myWorksTab === t.key
                ? 'border-brand-navy text-brand-navy'
                : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            )}
          >
            {t.label}{t.count != null ? ` (${t.count})` : ''}
          </button>
        ))}
      </div>

      {/* Assigned */}
      {myWorksTab === 'assigned' && (
        myItems.length === 0
          ? <EmptyState icon={User} title="Nothing assigned to you"
              subtitle="Work items assigned to you will appear here."
              action={<Button variant="secondary" size="sm" onClick={() => setIsCreateOpen(true)}>Create a work item</Button>} />
          : <div className="space-y-2">
              {myItems.map(item => (
                <WorkRow key={item.id} item={item} onSelect={setSelectedItem} onPressKey={onPressKey} />
              ))}
            </div>
      )}

      {/* Starred */}
      {myWorksTab === 'starred' && (
        starredItems.length === 0
          ? <EmptyState icon={Star} title="No starred items"
              subtitle="Star work items to keep them handy. Click the star on any card or in the detail panel." />
          : <div className="space-y-2">
              {starredItems.map(item => (
                <WorkRow key={item.id} item={item} onSelect={setSelectedItem} onPressKey={onPressKey} starred />
              ))}
            </div>
      )}

      {/* Mentions */}
      {myWorksTab === 'mentions' && (
        mentions.length === 0
          ? <EmptyState icon={AtSign} title="No mentions yet"
              subtitle="When someone @mentions you in a comment, it will appear here." />
          : <div className="space-y-2">
              {mentions.map(n => {
                const linkedItem = n.itemId ? workItems.find(i => i.id === n.itemId) : null;
                return (
                  <div
                    key={n.id}
                    role={linkedItem ? 'button' : undefined}
                    tabIndex={linkedItem ? 0 : undefined}
                    onClick={linkedItem ? () => setSelectedItem(linkedItem) : undefined}
                    onKeyDown={linkedItem ? onPressKey : undefined}
                    className={cn(
                      'bg-white dark:bg-neutral-800 border rounded-lg p-4',
                      !n.read ? 'border-brand-navy-tint/30' : 'border-neutral-200 dark:border-neutral-700',
                      linkedItem && 'cursor-pointer transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy-tint/40'
                    )}
                  >
                    <p className="text-sm text-neutral-900 dark:text-neutral-100">{n.message}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">{relativeTime(n.createdAt)}</p>
                      {linkedItem && (
                        <span className="text-xs text-brand-navy-tint font-medium flex items-center gap-1">
                          {linkedItem.id} <ArrowRight className="h-3 w-3" aria-hidden="true" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
      )}

      {/* Activity */}
      {myWorksTab === 'activity' && (
        activityItems.length === 0
          ? <EmptyState icon={ClipboardList} title="No recent activity"
              subtitle="Items you create or are assigned to will show here."
              action={<Button variant="secondary" size="sm" onClick={() => setIsCreateOpen(true)}>Create a work item</Button>} />
          : <div className="space-y-2">
              {activityItems.map(i => (
                <WorkRow key={i.id} item={i} onSelect={setSelectedItem} onPressKey={onPressKey} compact />
              ))}
              {activityOverflow > 0 && (
                <p className="text-xs text-neutral-600 dark:text-neutral-400 text-center pt-2">
                  Showing {CONFIG.activityLimit} most recent · {activityOverflow} more
                </p>
              )}
            </div>
      )}
    </div>
  );
}
