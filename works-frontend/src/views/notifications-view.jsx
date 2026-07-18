import { useState } from 'react';
import { AlertTriangle, Bell, Check, ClipboardCheck, Clock, Link2, MessageSquareReply, UserPlus } from 'lucide-react';
import { PageLayout } from '@/components/works/templates/page-layout';
import { Button } from '@/components/works/button';
import { api } from '@/lib/apiClient';
import { pathToView } from '@/lib/routes';
import { getActionableInboxItems, groupInboxItems, toInboxItem } from '@/lib/smart-inbox';
import { AsyncBoundary } from '@/components/works/atoms/async-boundary';
import { Skeleton, ListSkeleton } from '@/components/works/atoms/skeleton';
import { Tabs, TabList, Tab, TabPanel } from '@/components/works/atoms/tabs';
import { Toggle } from '@/components/works/atoms/toggle';
import { getNotifPrefs, setNotifPrefs } from '@/lib/notification-prefs';

const SNOOZE_OPTIONS = [
  { label: '1h', ms: 60 * 60 * 1000 },
  { label: '4h', ms: 4 * 60 * 60 * 1000 },
  { label: '8h', ms: 8 * 60 * 60 * 1000 },
  { label: 'Tomorrow', ms: null },
];

const ACTION_ICON = {
  approve: ClipboardCheck,
  reply: MessageSquareReply,
  review: Bell,
  assign: UserPlus,
  escalate: AlertTriangle,
};

const TONE_CLASS = {
  danger: 'text-semantic-danger bg-semantic-danger/10',
  warning: 'text-semantic-warning bg-semantic-warning/10',
  success: 'text-semantic-success bg-semantic-success/10',
  info: 'text-brand-navy bg-brand-navy/10 dark:text-brand-navy-tint dark:bg-brand-navy/20',
  neutral: 'text-neutral-600 bg-neutral-100 dark:text-neutral-300 dark:bg-neutral-700',
};

function snoozeUntilFor(option) {
  if (option.ms !== null) {
    return new Date(Date.now() + option.ms).toISOString();
  }
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);
  return tomorrow.toISOString();
}

function PreferencesPanel() {
  const [prefs, setPrefsState] = useState(getNotifPrefs);

  function update(partial) {
    setNotifPrefs(partial);
    setPrefsState(getNotifPrefs());
  }

  const isSnoozed = Boolean(prefs.snoozeUntil) && new Date() < new Date(prefs.snoozeUntil);
  const showRestore = prefs.muted || isSnoozed;

  return (
    <div className="space-y-6">
      <section aria-labelledby="pref-mute-heading">
        <h2 id="pref-mute-heading" className="mb-3 text-base font-semibold text-neutral-900">
          Mute notifications
        </h2>
        <Toggle checked={prefs.muted} onChange={(v) => update({ muted: v })} aria-label="Mute all notifications">
          Mute all notifications
        </Toggle>
        <p className="ml-11 mt-1 text-xs text-neutral-600">No toasts or badges while muted.</p>
      </section>

      <section aria-labelledby="pref-quiet-heading">
        <h2 id="pref-quiet-heading" className="mb-3 text-base font-semibold text-neutral-900">
          Quiet hours
        </h2>
        <Toggle checked={prefs.quietHoursEnabled} onChange={(v) => update({ quietHoursEnabled: v })} aria-label="Enable quiet hours">
          Enable quiet hours
        </Toggle>
        {prefs.quietHoursEnabled && (
          <div className="ml-11 mt-3 flex items-center gap-3" role="group" aria-label="Quiet hours time range">
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              From
              <input type="time" value={prefs.quietStart} onChange={(e) => update({ quietStart: e.target.value })}
                className="input text-sm" aria-label="Quiet hours start time" />
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              To
              <input type="time" value={prefs.quietEnd} onChange={(e) => update({ quietEnd: e.target.value })}
                className="input text-sm" aria-label="Quiet hours end time" />
            </label>
          </div>
        )}
        <p className="ml-11 mt-1 text-xs text-neutral-600">
          Spans midnight if start is after end, for example 22:00 to 08:00.
        </p>
      </section>

      <section aria-labelledby="pref-snooze-heading">
        <h2 id="pref-snooze-heading" className="mb-3 text-base font-semibold text-neutral-900">
          Snooze
        </h2>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Snooze for duration">
          <span className="mr-1 text-sm text-neutral-700">Snooze for</span>
          {SNOOZE_OPTIONS.map(opt => (
            <Button key={opt.label} variant="secondary" size="sm" onClick={() => update({ snoozeUntil: snoozeUntilFor(opt) })}>
              {opt.label}
            </Button>
          ))}
        </div>
        {isSnoozed && (
          <p className="mt-2 text-xs text-neutral-600">Snoozed until {new Date(prefs.snoozeUntil).toLocaleString()}.</p>
        )}
      </section>

      {showRestore && (
        <section>
          <Button variant="secondary" onClick={() => update({ muted: false, snoozeUntil: null })}>
            Restore notifications
          </Button>
          <p className="mt-1 text-xs text-neutral-600">Clears mute and any active snooze.</p>
        </section>
      )}
    </div>
  );
}

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
  const [snoozedIds, setSnoozedIds] = useState(() => new Set());
  const actionableItems = getActionableInboxItems(notifications, { snoozedIds });
  const actionGroups = groupInboxItems(actionableItems);
  const activityItems = notifications.map((notification) => toInboxItem(notification, { snoozedIds }));

  function handleMarkRead(n) {
    const wasActionable = toInboxItem(n, { snoozedIds }).actionable;
    api.raw(`/notifications/${n.id}/read`, { method: 'PUT' })
      .then(() => {
        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
        if (wasActionable) setUnreadCount(c => Math.max(0, (c || 0) - 1));
      })
      .catch(onError);
  }

  function handleSnooze(n) {
    setSnoozedIds(prev => {
      const next = new Set(prev);
      next.add(String(n.id));
      return next;
    });
    if (toInboxItem(n, { snoozedIds }).actionable) {
      setUnreadCount(c => Math.max(0, (c || 0) - 1));
    }
  }

  function handleCardClick(n) {
    if (!n.read) handleMarkRead(n);
    if (n.link) {
      const view = pathToView(n.link);
      if (view && setView) setView(view);
    }
  }

  function handleMarkAllRead() {
    api.raw(`/notifications/mark-all-read?userId=${currentUser.id}`, { method: 'PUT' })
      .then(() => {
        setNotifications(prev => prev.map(x => ({ ...x, read: true })));
        setUnreadCount(0);
      })
      .catch(onError);
  }

  function renderActivityCard(n) {
    const hasLink = Boolean(n.link);
    const resolvedView = hasLink ? pathToView(n.link) : null;
    const isNavigable = Boolean(resolvedView);
    const showLinkHint = hasLink && !resolvedView;

    return (
      <div key={n.id}
        role={isNavigable || showLinkHint ? 'button' : undefined}
        tabIndex={isNavigable || showLinkHint ? 0 : undefined}
        onClick={isNavigable || hasLink ? () => handleCardClick(n) : (!n.read ? () => handleMarkRead(n) : undefined)}
        onKeyDown={isNavigable || hasLink ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCardClick(n); } } : undefined}
        className={[
          'flex items-start gap-3 rounded-lg border bg-white p-4 transition-colors dark:bg-neutral-800',
          !n.read ? 'border-brand-navy-tint/30 bg-semantic-info-surface/30' : 'border-neutral-200 dark:border-neutral-700',
          (isNavigable || showLinkHint) ? 'cursor-pointer hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy-tint/40' : '',
        ].join(' ')}>
        <div className={`mt-2 h-2 w-2 flex-shrink-0 rounded-full ${!n.read ? 'bg-brand-orange' : 'bg-transparent'}`} aria-hidden="true" />
        <div className="flex-1">
          <p className="text-sm text-neutral-900 dark:text-neutral-100">{n.message}</p>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-xs text-neutral-600 dark:text-neutral-400">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</p>
            {showLinkHint && (
              <span className="flex items-center gap-0.5 text-xs text-brand-navy-tint" aria-label="Has deep link">
                <Link2 className="h-3 w-3" aria-hidden="true" />
              </span>
            )}
            {n.snoozed && <span className="text-xs font-medium text-neutral-500">Snoozed</span>}
          </div>
        </div>
        {!n.read && (
          <Button unstyled type="button" onClick={(e) => { e.stopPropagation(); handleMarkRead(n); }}
            className="mt-0.5 rounded text-xs text-neutral-600 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 dark:text-neutral-400"
            aria-label="Mark as read">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        )}
      </div>
    );
  }

  if (loading && notifications.length === 0) {
    return (
      <PageLayout>
        <AsyncBoundary loading skeleton={<><Skeleton className="mb-6 h-7 w-36" /><ListSkeleton rows={5} /></>} />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Inbox"
      actions={unreadCount > 0 && (
        <Button unstyled type="button" onClick={handleMarkAllRead}
          className="rounded text-sm text-brand-navy-tint hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40">
          Mark all as read
        </Button>
      )}
    >
      <Tabs defaultValue="actions">
        <TabList aria-label="Inbox sections">
          <Tab value="actions">Action inbox</Tab>
          <Tab value="activity">Activity history</Tab>
          <Tab value="preferences">Preferences</Tab>
        </TabList>

        <TabPanel value="actions">
          <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {actionableItems.length} actionable item{actionableItems.length === 1 ? '' : 's'}
              </p>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                Grouped by the action needed from you, with activity history kept separate.
              </p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Quiet controls</p>
              <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
                Snoozed items leave this action view but remain in activity history.
              </p>
            </div>
          </div>

          <AsyncBoundary
            empty={actionGroups.length === 0}
            emptyIcon={Check}
            emptyTitle="Action inbox is clear"
            emptySubtitle="Approvals, replies, reviews, assignments, and escalations will appear here when they need action."
          >
              <div className="space-y-4">
                {actionGroups.map(group => {
                  const Icon = ACTION_ICON[group.id] || Bell;
                  return (
                    <section key={group.id} aria-labelledby={`inbox-${group.id}`}
                      className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
                      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3 dark:border-neutral-700">
                        <div>
                          <h2 id={`inbox-${group.id}`} className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                            <Icon className="h-4 w-4 text-brand-navy dark:text-brand-navy-tint" aria-hidden="true" />
                            {group.label}
                          </h2>
                          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{group.description}</p>
                        </div>
                        <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">
                          {group.items.length}
                        </span>
                      </div>
                      <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
                        {group.items.map(item => (
                          <div key={item.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TONE_CLASS[item.tone] || TONE_CLASS.neutral}`}>
                                  {item.inboxGroupLabel}
                                </span>
                                {item.createdAt && <span className="text-xs text-neutral-500">{new Date(item.createdAt).toLocaleString()}</span>}
                              </div>
                              <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">{item.message}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant="secondary" onClick={() => handleCardClick(item)}>
                                {item.actionLabel}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleSnooze(item)}>
                                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                                Snooze
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleMarkRead(item)}>
                                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                Done
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
          </AsyncBoundary>
        </TabPanel>

        <TabPanel value="activity">
          <AsyncBoundary
            empty={activityItems.length === 0}
            emptyIcon={Bell}
            emptyTitle="No activity yet"
            emptySubtitle="Notifications about assignments, comments, mentions, and system updates will appear here."
          >
            <div className="space-y-2">{activityItems.map(renderActivityCard)}</div>
          </AsyncBoundary>
        </TabPanel>

        <TabPanel value="preferences">
          <PreferencesPanel />
        </TabPanel>
      </Tabs>
    </PageLayout>
  );
}
