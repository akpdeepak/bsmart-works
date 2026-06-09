import { useState } from 'react';
import { Bell, Check, UserPlus, MessageSquare, ArrowRight, AlertTriangle, Zap, Settings } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { EmptyState } from '@/components/works/atoms/empty-state';

const TYPE_CONFIG = {
  ASSIGN:        { icon: UserPlus,      label: 'Assignment', color: 'text-brand-navy-tint' },
  COMMENT:       { icon: MessageSquare, label: 'Comment',    color: 'text-neutral-400' },
  STATUS_CHANGE: { icon: ArrowRight,    label: 'Status',     color: 'text-neutral-400' },
  SLA_BREACH:    { icon: AlertTriangle, label: 'SLA Breach', color: 'text-semantic-danger' },
  AUTOMATION:    { icon: Zap,           label: 'Automation', color: 'text-brand-orange' },
};

const FILTERS = ['ALL', 'ASSIGN', 'COMMENT', 'STATUS_CHANGE', 'SLA_BREACH', 'AUTOMATION'];

const relativeTime = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

// Notifications view — extracted from the App.jsx monolith (UX finding A3/H2). Props preserved from
// the original; onNavigate and onOpenSettings are optional additions for source-item linking.
export default function NotificationsView({
  notifications,
  unreadCount,
  currentUser,
  fetchNotifications,
  fetchUnreadCount,
  setUnreadCount,
  onNavigate,
  onOpenSettings,
}) {
  const [filter, setFilter] = useState('ALL');
  const visible = filter === 'ALL' ? notifications : notifications.filter((n) => n.type === filter);

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-brand-navy">Notifications</h1>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button onClick={() => {
              api.raw(`/notifications/mark-all-read?userId=${currentUser.id}`, { method: 'PUT' })
                .then(() => { fetchNotifications(); setUnreadCount(0); });
            }} className="text-sm text-brand-navy-tint hover:underline">Mark all as read</button>
          )}
          {onOpenSettings && (
            <button onClick={onOpenSettings} aria-label="Notification settings"
              className="text-neutral-600 dark:text-neutral-400 hover:text-brand-navy transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded">
              <Settings className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-5" role="group" aria-label="Filter notifications by type">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-brand-navy text-white'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}>
            {f === 'ALL' ? 'All' : (TYPE_CONFIG[f]?.label ?? f)}
          </button>
        ))}
      </div>

      {visible.length === 0
        ? <EmptyState icon={Bell} title="You're all caught up"
            subtitle="Notifications about assignments, comments, and mentions will appear here." />
        : (
          <div className="space-y-2">
            {visible.map((n) => {
              const cfg = TYPE_CONFIG[n.type];
              const TypeIcon = cfg?.icon ?? Bell;
              return (
                <div key={n.id}
                  className={`bg-white dark:bg-neutral-800 border rounded-xl p-4 flex gap-3 items-start transition-colors ${!n.read ? 'border-brand-navy-tint/30 bg-semantic-info-surface/30' : 'border-neutral-200 dark:border-neutral-700'}`}>
                  <div className="mt-0.5 flex-shrink-0">
                    <TypeIcon className={`h-4 w-4 ${cfg?.color ?? 'text-neutral-400'}`} aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {n.link && onNavigate
                      ? (
                        <button type="button"
                          className="text-sm text-neutral-900 text-left hover:text-brand-navy transition-colors w-full focus-visible:outline-none"
                          onClick={() => onNavigate(n.link)}>
                          {n.message}
                        </button>
                      )
                      : <p className="text-sm text-neutral-900">{n.message}</p>
                    }
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1"
                      title={n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}>
                      {relativeTime(n.createdAt)}
                    </p>
                  </div>
                  {!n.read && (
                    <button onClick={() => {
                      api.raw(`/notifications/${n.id}/read`, { method: 'PUT' })
                        .then(() => { fetchNotifications(); fetchUnreadCount(); });
                    }} className="flex-shrink-0 text-neutral-600 dark:text-neutral-400 hover:text-brand-navy mt-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded" aria-label="Mark as read">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )
      }
    </div>
  );
}
