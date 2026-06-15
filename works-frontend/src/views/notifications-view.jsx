import { Bell, Check, Link2 } from 'lucide-react';
import { PageLayout } from '@/components/works/templates/page-layout';
import { api } from '@/lib/apiClient';
import { pathToView } from '@/lib/routes';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { Skeleton, ListSkeleton } from '@/components/works/atoms/skeleton';

// Notifications view — extracted from the App.jsx monolith (UX finding A3/H2). Behaviour-preserving:
// the parent still owns the notifications data and fetchers; this module renders them and triggers
// the same mark-read calls. Lint-clean (no eslint-disable) so a11y/token rules apply.
//
// Audit #28: notification cards are now clickable. Top-level view links (/sla, /compliance, etc.)
// navigate immediately via setView; entity links (/items/WI-123) are deep-linked — they work once
// Stage 2 entity routing lands in App.jsx. Mark-read updates local state instead of re-fetching
// the full list on every click.
export default function NotificationsView({
  loading = false,
  notifications,
  setNotifications,
  unreadCount,
  currentUser,
  setUnreadCount,
  setView,
  onError = () => {},
}) {
  function handleMarkRead(n) {
    api.raw(`/notifications/${n.id}/read`, { method: 'PUT' })
      .then(() => {
        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
        setUnreadCount(c => Math.max(0, (c || 0) - 1));
      })
      .catch(onError);
  }

  function handleCardClick(n) {
    if (!n.read) handleMarkRead(n);
    if (n.link) {
      const view = pathToView(n.link);
      if (view && setView) setView(view);
      // Entity links (/items/:id) fall through — they resolve after Stage 2 App.jsx changes.
    }
  }

  if (loading && notifications.length === 0) {
    return (
      <PageLayout width="reading">
        <Skeleton className="h-7 w-36 mb-6" />
        <ListSkeleton rows={5} />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Notifications"
      actions={unreadCount > 0 && (
        <button
          type="button"
          onClick={() => {
            api.raw(`/notifications/mark-all-read?userId=${currentUser.id}`, { method: 'PUT' })
              .then(() => {
                setNotifications(prev => prev.map(x => ({ ...x, read: true })));
                setUnreadCount(0);
              })
              .catch(onError);
          }}
          className="text-sm text-brand-navy-tint hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
        >Mark all as read</button>
      )}
      width="reading"
    >
      {notifications.length === 0
        ? <EmptyState icon={Bell} title="You're all caught up"
            subtitle="Notifications about assignments, comments, and mentions will appear here." />
        : (
          <div className="space-y-2">
            {notifications.map(n => {
              const hasLink = Boolean(n.link);
              const resolvedView = hasLink ? pathToView(n.link) : null;
              const isNavigable = Boolean(resolvedView);
              // Show a link indicator for entity deep-links (/items/…) even if not yet routable.
              const showLinkHint = hasLink && !resolvedView;
              return (
                <div
                  key={n.id}
                  role={isNavigable || showLinkHint ? 'button' : undefined}
                  tabIndex={isNavigable || showLinkHint ? 0 : undefined}
                  onClick={isNavigable || hasLink ? () => handleCardClick(n) : (!n.read ? () => handleMarkRead(n) : undefined)}
                  onKeyDown={isNavigable || hasLink ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCardClick(n); } } : undefined}
                  className={[
                    'bg-white dark:bg-neutral-800 border rounded-xl p-4 flex gap-3 items-start transition-colors',
                    !n.read ? 'border-brand-navy-tint/30 bg-semantic-info-surface/30' : 'border-neutral-200 dark:border-neutral-700',
                    (isNavigable || showLinkHint) ? 'cursor-pointer hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy-tint/40' : '',
                  ].join(' ')}
                >
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!n.read ? 'bg-brand-orange' : 'bg-transparent'}`} aria-hidden="true" />
                  <div className="flex-1">
                    <p className="text-sm text-neutral-900 dark:text-neutral-100">{n.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</p>
                      {showLinkHint && (
                        <span className="text-xs text-brand-navy-tint flex items-center gap-0.5" aria-label="Has deep link">
                          <Link2 className="h-3 w-3" aria-hidden="true" />
                        </span>
                      )}
                    </div>
                  </div>
                  {!n.read && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleMarkRead(n); }}
                      className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-brand-navy mt-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
                      aria-label="Mark as read"
                    ><Check className="h-3.5 w-3.5" aria-hidden="true" /></button>
                  )}
                </div>
              );
            })}
          </div>
        )
      }
    </PageLayout>
  );
}
