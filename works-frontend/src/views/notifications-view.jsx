import { Bell, Check } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { Skeleton, ListSkeleton } from '@/components/works/atoms/skeleton';

// Notifications view — extracted from the App.jsx monolith (UX finding A3/H2). Behaviour-preserving:
// the parent still owns the notifications data and fetchers; this module renders them and triggers
// the same mark-read calls. Lint-clean (no eslint-disable) so a11y/token rules apply.
export default function NotificationsView({
  loading = false,
  notifications,
  unreadCount,
  currentUser,
  fetchNotifications,
  fetchUnreadCount,
  setUnreadCount,
  onError = () => {},
}) {
  if (loading && notifications.length === 0) {
    return (
      <div className="p-8 max-w-2xl">
        <Skeleton className="h-7 w-36 mb-6" />
        <ListSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-brand-navy">Notifications</h1>
        {unreadCount > 0 && (
          <button onClick={() => {
            api.raw(`/notifications/mark-all-read?userId=${currentUser.id}`, { method: 'PUT' })
              .then(() => { fetchNotifications(); setUnreadCount(0); })
              .catch(onError);
          }} className="text-sm text-brand-navy-tint hover:underline">Mark all as read</button>
        )}
      </div>
      {notifications.length === 0
        ? <EmptyState icon={Bell} title="You're all caught up"
            subtitle="Notifications about assignments, comments, and mentions will appear here." />
        : (
          <div className="space-y-2">
            {notifications.map(n => (
              <div key={n.id}
                className={`bg-white dark:bg-neutral-800 border rounded-xl p-4 flex gap-3 items-start transition-colors ${!n.read ? 'border-brand-navy-tint/30 bg-semantic-info-surface/30' : 'border-neutral-200 dark:border-neutral-700'}`}>
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!n.read ? 'bg-brand-orange' : 'bg-transparent'}`}></div>
                <div className="flex-1">
                  <p className="text-sm text-neutral-900 dark:text-neutral-100">{n.message}</p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</p>
                </div>
                {!n.read && (
                  <button onClick={() => {
                    api.raw(`/notifications/${n.id}/read`, { method: 'PUT' })
                      .then(() => { fetchNotifications(); fetchUnreadCount(); })
                      .catch(onError);
                  }} className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-brand-navy mt-0.5" aria-label="Mark as read"><Check className="h-3.5 w-3.5" aria-hidden="true" /></button>
                )}
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}
