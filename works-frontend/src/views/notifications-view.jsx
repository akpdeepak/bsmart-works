import { useState } from 'react';
import { Bell, Check, Link2 } from 'lucide-react';
import { PageLayout } from '@/components/works/templates/page-layout';
import { Button } from '@/components/works/button';
import { api } from '@/lib/apiClient';
import { pathToView } from '@/lib/routes';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { Skeleton, ListSkeleton } from '@/components/works/atoms/skeleton';
import { Tabs, TabList, Tab, TabPanel } from '@/components/works/atoms/tabs';
import { Toggle } from '@/components/works/atoms/toggle';
import { getNotifPrefs, setNotifPrefs } from '@/lib/notification-prefs';

// Notifications view — extracted from the App.jsx monolith (UX finding A3/H2). Behaviour-preserving:
// the parent still owns the notifications data and fetchers; this module renders them and triggers
// the same mark-read calls. Lint-clean (no eslint-disable) so a11y/token rules apply.
//
// Audit #28: notification cards are now clickable. Top-level view links (/sla, /compliance, etc.)
// navigate immediately via setView; entity links (/items/WI-123) are deep-linked — they work once
// Stage 2 entity routing lands in App.jsx. Mark-read updates local state instead of re-fetching
// the full list on every click.
//
// WI-26: adds a "Preferences" tab for mute, quiet-hours, and snooze controls.

// Snooze offsets in milliseconds.
const SNOOZE_OPTIONS = [
  { label: '1h',       ms: 60 * 60 * 1000 },
  { label: '4h',       ms: 4 * 60 * 60 * 1000 },
  { label: '8h',       ms: 8 * 60 * 60 * 1000 },
  { label: 'Tomorrow', ms: null },  // handled specially — midnight of the next day
];

function snoozeUntilFor(option) {
  if (option.ms !== null) {
    return new Date(Date.now() + option.ms).toISOString();
  }
  // "Tomorrow" = start of next calendar day at 08:00 local
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
      {/* Mute all */}
      <section aria-labelledby="pref-mute-heading">
        <h2 id="pref-mute-heading" className="text-base font-semibold text-neutral-900 mb-3">
          Mute notifications
        </h2>
        <Toggle
          checked={prefs.muted}
          onChange={(v) => update({ muted: v })}
          aria-label="Mute all notifications"
        >
          Mute all notifications
        </Toggle>
        <p className="text-xs text-neutral-600 mt-1 ml-11">
          No toasts or badges while muted.
        </p>
      </section>

      {/* Quiet hours */}
      <section aria-labelledby="pref-quiet-heading">
        <h2 id="pref-quiet-heading" className="text-base font-semibold text-neutral-900 mb-3">
          Quiet hours
        </h2>
        <Toggle
          checked={prefs.quietHoursEnabled}
          onChange={(v) => update({ quietHoursEnabled: v })}
          aria-label="Enable quiet hours"
        >
          Enable quiet hours
        </Toggle>
        {prefs.quietHoursEnabled && (
          <div className="mt-3 flex items-center gap-3 ml-11" role="group" aria-label="Quiet hours time range">
            <label className="text-sm text-neutral-700 flex items-center gap-2">
              From
              <input
                type="time"
                value={prefs.quietStart}
                onChange={(e) => update({ quietStart: e.target.value })}
                className="input text-sm"
                aria-label="Quiet hours start time"
              />
            </label>
            <label className="text-sm text-neutral-700 flex items-center gap-2">
              To
              <input
                type="time"
                value={prefs.quietEnd}
                onChange={(e) => update({ quietEnd: e.target.value })}
                className="input text-sm"
                aria-label="Quiet hours end time"
              />
            </label>
          </div>
        )}
        <p className="text-xs text-neutral-600 mt-1 ml-11">
          Spans midnight if start is after end (e.g. 22:00 – 08:00).
        </p>
      </section>

      {/* Snooze */}
      <section aria-labelledby="pref-snooze-heading">
        <h2 id="pref-snooze-heading" className="text-base font-semibold text-neutral-900 mb-3">
          Snooze
        </h2>
        <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Snooze for duration">
          <span className="text-sm text-neutral-700 mr-1">Snooze for</span>
          {SNOOZE_OPTIONS.map(opt => (
            <Button
              key={opt.label}
              variant="secondary"
              size="sm"
              onClick={() => update({ snoozeUntil: snoozeUntilFor(opt) })}
            >
              {opt.label}
            </Button>
          ))}
        </div>
        {isSnoozed && (
          <p className="text-xs text-neutral-600 mt-2">
            Snoozed until {new Date(prefs.snoozeUntil).toLocaleString()}.
          </p>
        )}
      </section>

      {/* Restore */}
      {showRestore && (
        <section>
          <Button
            variant="secondary"
            onClick={() => update({ muted: false, snoozeUntil: null })}
          >
            Restore notifications
          </Button>
          <p className="text-xs text-neutral-600 mt-1">Clears mute and any active snooze.</p>
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
      <PageLayout>
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
    >
      <Tabs defaultValue="inbox">
        <TabList aria-label="Notifications sections">
          <Tab value="inbox">Inbox</Tab>
          <Tab value="preferences">Preferences</Tab>
        </TabList>

        <TabPanel value="inbox">
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
        </TabPanel>

        <TabPanel value="preferences">
          <PreferencesPanel />
        </TabPanel>
      </Tabs>
    </PageLayout>
  );
}
