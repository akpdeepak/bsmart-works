import { useState } from 'react';
import { Star, User, AtSign, ClipboardList, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/works/button';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { Skeleton, ListSkeleton } from '@/components/works/atoms/skeleton';
import { TypeBadge } from '@/components/works/work-item-type';
import { StatusBadge } from '@/components/works/status-badge';
import { statusToCategory } from '@/components/works/status';
import { LapseBadge } from '@/components/works/atoms/lapse-badge';
import { computeLapse } from '@/lib/status-lapse';
import { useI18n } from '@/lib/i18n';
import { pathToView } from '@/lib/routes';

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// Tune this surface here — no JSX diving needed. Sort pill labels resolve via i18n `labelKey`.
const CONFIG = {
  activityLimit: 20,            // max rows shown in the Recent Activity tab
  dueDateWarnDays: 3,           // days ahead at which the due-date label turns orange
  activitySortField: 'updatedAt', // sort key for activity; falls back to 'id'
  assignedSortDefault: 'priority', // default sort for the Assigned tab
  sortOptions: [                // pills rendered above the Assigned list
    { key: 'priority', labelKey: 'deliver.myWorks.sort.priority' },
    { key: 'dueDate',  labelKey: 'deliver.myWorks.sort.dueDate' },
    { key: 'recent',   labelKey: 'deliver.myWorks.sort.recent' },
  ],
};

// Priority sort order (lower = shown first) and dot token map.
const PRIORITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const PRIORITY_DOT   = {
  CRITICAL: 'bg-semantic-danger',
  HIGH:     'bg-semantic-warning',
  MEDIUM:   'bg-neutral-300',
  LOW:      'bg-neutral-200',
};

// Returns a short, localized relative time string: "2h ago", "3d ago", or a short date past 7 days.
function relativeTime(dateStr, t) {
  if (!dateStr) return '';
  const m = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (m < 1) return t('deliver.myWorks.justNow');
  if (m < 60) return `${m}${t('deliver.myWorks.minutesAgoSuffix')}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}${t('deliver.myWorks.hoursAgoSuffix')}`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}${t('deliver.myWorks.daysAgoSuffix')}` : new Date(dateStr).toLocaleDateString();
}

// Returns { text, urgent } for a due date, or null if none. `t` localizes the relative labels;
// the absolute (>warn-window) branch keeps the locale-aware numeric date.
function dueDateMeta(dateStr, t) {
  if (!dateStr) return null;
  const days = Math.ceil(
    (new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000
  );
  if (days < 0) return { text: `${Math.abs(days)}${t('deliver.myWorks.overdueSuffix')}`, urgent: true };
  if (days === 0) return { text: t('deliver.myWorks.dueTodayLabel'), urgent: true };
  if (days <= CONFIG.dueDateWarnDays) return { text: `${t('deliver.myWorks.dueInPrefix')}${days}${t('deliver.myWorks.dueInSuffix')}`, urgent: false };
  return { text: new Date(dateStr).toLocaleDateString(), urgent: false };
}

// Sorts a copy of items by the given sort key.
function sortItems(items, by) {
  return [...items].sort((a, b) => {
    if (by === 'priority') {
      return (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
    }
    if (by === 'dueDate') {
      const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return da - db; // earliest due date first; no-date items sink to the bottom
    }
    // recent: descending updatedAt / id
    const av = String(a[CONFIG.activitySortField] ?? a.id ?? '');
    const bv = String(b[CONFIG.activitySortField] ?? b.id ?? '');
    return bv.localeCompare(av);
  });
}

// Shared work-item row — used across Assigned, Starred, and Activity tabs.
function WorkRow({ item, onSelect, onPressKey, starred = false, compact = false, iv = () => true, statusResolver = null }) {
  const { t } = useI18n();
  const due = dueDateMeta(item.dueDate, t);
  const dotColor = PRIORITY_DOT[item.priority] || PRIORITY_DOT.MEDIUM;
  const statusCat = statusResolver ? statusResolver.categoryOf(item.type, item.status) : statusToCategory(item.status);
  const lapse = computeLapse(item.statusChangedAt, statusResolver?.metaFor(item.type, item.status) ?? null);
  const showLapse = statusCat !== 'done' && (lapse.state === 'at_risk' || lapse.state === 'breached');
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
      {iv('priority') && <span className={cn('h-2 w-2 rounded-full flex-shrink-0', dotColor)} aria-hidden="true" />}
      {starred && <Star className="h-3.5 w-3.5 text-brand-orange fill-current flex-shrink-0" aria-hidden="true" />}
      <TypeBadge type={item.type} compact={compact} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{item.title}</p>
        <p className="text-xs text-neutral-600 dark:text-neutral-400 font-mono">{item.autoId || item.id}</p>
      </div>
      {iv('status') && <StatusBadge category={statusCat}>{item.status}</StatusBadge>}
      {showLapse && <LapseBadge lapse={lapse} compact />}
      {iv('dueDate') && due && (
        <span className={cn(
          'text-xs font-medium whitespace-nowrap',
          due.urgent ? 'text-semantic-danger' : 'text-semantic-warning'
        )}>
          {due.text}
        </span>
      )}
      {iv('assignee') && item.assigneeId && (
        <span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">{item.assigneeId}</span>
      )}
    </div>
  );
}

// My Works view — personal workspace showing a user's assigned, starred, mentioned, and active items.
export default function MyWorksView({
  loading = false,
  myItems,
  workItems,
  notifications,
  myWorksTab,
  currentUser,
  setMyWorksTab,
  setSelectedItem,
  setIsCreateOpen,
  setView,
  onPressKey,
  cardPrefs,
  statusResolver,
}) {
  const { t } = useI18n();
  const [sort, setSort] = useState(CONFIG.assignedSortDefault);

  if (loading && workItems.length === 0) {
    return (
      <div className="p-6">
        <Skeleton className="h-7 w-44 mb-6" />
        <ListSkeleton rows={6} />
      </div>
    );
  }
  const iv = cardPrefs?.isVisible ?? (() => true);

  // Compute tab data once to avoid repeated inline .filter() calls in JSX.
  const starredItems = workItems.filter(i => i.starred);
  const mentions = notifications.filter(n => n.type === 'MENTION');

  const activityAll = workItems
    .filter(i => i.createdBy === currentUser?.id || i.assigneeId === currentUser?.id)
    .sort((a, b) => {
      const av = String(a[CONFIG.activitySortField] ?? a.id ?? '');
      const bv = String(b[CONFIG.activitySortField] ?? b.id ?? '');
      return bv.localeCompare(av);
    });
  const activityItems = activityAll.slice(0, CONFIG.activityLimit);
  const activityOverflow = activityAll.length - activityItems.length;

  const sortedItems = sortItems(myItems, sort);

  const tabs = [
    { key: 'assigned', label: t('deliver.myWorks.tab.assigned'), count: myItems.length },
    { key: 'starred',  label: t('deliver.myWorks.tab.starred'),  count: starredItems.length },
    { key: 'mentions', label: t('deliver.myWorks.tab.mentions'), count: mentions.length },
    { key: 'activity', label: t('deliver.myWorks.tab.activity') },
  ];

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-brand-navy mb-1">{t('deliver.myWorks.title')}</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">{t('deliver.myWorks.subtitle')}</p>

      {/* Tab bar */}
      <div role="tablist" className="flex gap-1 mb-5 border-b border-neutral-200 dark:border-neutral-700">
        {tabs.map(tab => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={myWorksTab === tab.key}
            onClick={() => setMyWorksTab(tab.key)}
            className={cn(
              'text-sm font-medium px-4 py-2 border-b-2 transition-colors',
              myWorksTab === tab.key
                ? 'border-brand-navy text-brand-navy'
                : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            )}
          >
            {tab.label}{tab.count != null ? ` (${tab.count})` : ''}
          </button>
        ))}
      </div>

      {/* Assigned */}
      {myWorksTab === 'assigned' && (
        myItems.length === 0
          ? <EmptyState icon={User} title={t('deliver.myWorks.assignedEmptyTitle')}
              subtitle={t('deliver.myWorks.assignedEmptySubtitle')}
              action={<Button variant="secondary" size="sm" onClick={() => setIsCreateOpen(true)}>{t('deliver.myWorks.createWorkItem')}</Button>} />
          : <>
              {/* Sort pills */}
              <div className="flex items-center gap-1.5 mb-3">
                <span className="text-xs text-neutral-600 dark:text-neutral-400">{t('deliver.myWorks.sort')}</span>
                {CONFIG.sortOptions.map(s => (
                  <button
                    key={s.key}
                    onClick={() => setSort(s.key)}
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-full font-medium transition-colors',
                      sort === s.key
                        ? 'bg-brand-navy text-white'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    )}
                  >
                    {t(s.labelKey)}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {sortedItems.map(item => (
                  <WorkRow key={item.id} item={item} onSelect={setSelectedItem} onPressKey={onPressKey} iv={iv} statusResolver={statusResolver} />
                ))}
              </div>
            </>
      )}

      {/* Starred */}
      {myWorksTab === 'starred' && (
        starredItems.length === 0
          ? <EmptyState icon={Star} title={t('deliver.myWorks.starredEmptyTitle')}
              subtitle={t('deliver.myWorks.starredEmptySubtitle')} />
          : <div className="space-y-2">
              {starredItems.map(item => (
                <WorkRow key={item.id} item={item} onSelect={setSelectedItem} onPressKey={onPressKey} starred iv={iv} statusResolver={statusResolver} />
              ))}
            </div>
      )}

      {/* Mentions */}
      {myWorksTab === 'mentions' && (
        mentions.length === 0
          ? <EmptyState icon={AtSign} title={t('deliver.myWorks.mentionsEmptyTitle')}
              subtitle={t('deliver.myWorks.mentionsEmptySubtitle')} />
          : <div className="space-y-2">
              {mentions.map(n => {
                const linkedItem = n.itemId ? workItems.find(i => i.id === n.itemId) : null;
                const linkView = (!linkedItem && n.link) ? pathToView(n.link) : null;
                const isClickable = Boolean(linkedItem || linkView);
                function handleMentionClick() {
                  if (linkedItem) { setSelectedItem(linkedItem); return; }
                  if (linkView && setView) setView(linkView);
                }
                return (
                  <div
                    key={n.id}
                    role={isClickable ? 'button' : undefined}
                    tabIndex={isClickable ? 0 : undefined}
                    onClick={isClickable ? handleMentionClick : undefined}
                    onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleMentionClick(); } } : undefined}
                    className={cn(
                      'bg-white dark:bg-neutral-800 border rounded-lg p-4',
                      !n.read ? 'border-brand-navy-tint/30' : 'border-neutral-200 dark:border-neutral-700',
                      isClickable && 'cursor-pointer transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy-tint/40'
                    )}
                  >
                    <p className="text-sm text-neutral-900 dark:text-neutral-100">{n.message}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">{relativeTime(n.createdAt, t)}</p>
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
          ? <EmptyState icon={ClipboardList} title={t('deliver.myWorks.activityEmptyTitle')}
              subtitle={t('deliver.myWorks.activityEmptySubtitle')}
              action={<Button variant="secondary" size="sm" onClick={() => setIsCreateOpen(true)}>{t('deliver.myWorks.createWorkItem')}</Button>} />
          : <div className="space-y-2">
              {activityItems.map(i => (
                <WorkRow key={i.id} item={i} onSelect={setSelectedItem} onPressKey={onPressKey} compact iv={iv} statusResolver={statusResolver} />
              ))}
              {activityOverflow > 0 && (
                <p className="text-xs text-neutral-600 dark:text-neutral-400 text-center pt-2">
                  {t('deliver.myWorks.showingPrefix')}{CONFIG.activityLimit}{t('deliver.myWorks.mostRecent')}{activityOverflow}{t('deliver.myWorks.more')}
                </p>
              )}
            </div>
      )}
    </div>
  );
}
