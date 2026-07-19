import { useMemo, useState } from 'react';
import {
  AlertTriangle, Bell, Check, ClipboardCheck, Clock, ExternalLink, Link2,
  MessageSquareReply, Sparkles, UserPlus,
} from 'lucide-react';
import { PageLayout } from '@/components/works/templates/page-layout';
import { Button } from '@/components/works/button';
import { PushSettingsPanel } from '@/components/works/organisms/push-settings-panel';
import { AsyncBoundary } from '@/components/works/atoms/async-boundary';
import { Skeleton, ListSkeleton } from '@/components/works/atoms/skeleton';
import { Tabs, TabList, Tab, TabPanel } from '@/components/works/atoms/tabs';
import { api } from '@/lib/apiClient';
import { parseEntityRoute, pathToView } from '@/lib/routes';
import { groupInboxItems } from '@/lib/smart-inbox';

const ACTION_ICON = {
  approve: ClipboardCheck,
  reply: MessageSquareReply,
  review: Bell,
  assign: UserPlus,
  escalate: AlertTriangle,
};

const TONE_CLASS = {
  APPROVE: 'text-semantic-warning bg-semantic-warning/10',
  REPLY: 'text-brand-navy bg-semantic-info-surface dark:text-brand-navy-tint',
  REVIEW: 'text-neutral-700 bg-neutral-100 dark:text-neutral-200 dark:bg-neutral-700',
  ASSIGN: 'text-semantic-success bg-semantic-success/10',
  ESCALATE: 'text-semantic-danger bg-semantic-danger/10',
};

function snoozeUntil(value) {
  if (value === 'tomorrow') {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    next.setHours(8, 0, 0, 0);
    return next.toISOString();
  }
  return new Date(Date.now() + Number(value) * 60 * 60 * 1000).toISOString();
}

function scopedActionPath(path, workspaceId) {
  if (!path?.startsWith('/support-chat/')) return path;
  const join = path.includes('?') ? '&' : '?';
  return `${path}${join}workspaceId=${encodeURIComponent(workspaceId)}`;
}

async function requireOk(path, options) {
  const response = await api.raw(path, options);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response;
}

export default function NotificationsView({
  loading = false,
  activeWorkspaceId,
  inboxItems = [],
  setInboxItems = () => {},
  notifications = [],
  setNotifications = () => {},
  unreadCount = 0,
  setUnreadCount = () => {},
  fetchNotifications = () => Promise.resolve(),
  navigate = () => {},
  workItems = [],
  projects = [],
  setSelectedItem = () => {},
  onError = () => {},
}) {
  const [snoozeChoice, setSnoozeChoice] = useState({});
  const [inputItem, setInputItem] = useState(null);
  const [inputText, setInputText] = useState('');
  const [convertItem, setConvertItem] = useState(null);
  const [convertTitle, setConvertTitle] = useState('');
  const [convertProject, setConvertProject] = useState('');
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [busyKey, setBusyKey] = useState(null);
  const actionGroups = useMemo(() => groupInboxItems(inboxItems), [inboxItems]);
  const lowPriority = inboxItems.filter((item) => ['LOW', 'NORMAL'].includes(item.priority));
  const unreadActivity = notifications.some((notification) => !notification.read);

  function removeItem(key) {
    setInboxItems((current) => current.filter((item) => item.key !== key));
    setUnreadCount((count) => Math.max(0, (count || 0) - 1));
  }

  async function markDone(item) {
    setBusyKey(item.key);
    try {
      await requireOk(`/inbox/done?workspaceId=${encodeURIComponent(activeWorkspaceId)}`, {
        method: 'POST', body: JSON.stringify({ itemKey: item.key }),
      });
      removeItem(item.key);
    } catch (error) {
      onError(error);
    } finally {
      setBusyKey(null);
    }
  }

  async function snooze(item) {
    setBusyKey(item.key);
    try {
      await requireOk(`/inbox/snooze?workspaceId=${encodeURIComponent(activeWorkspaceId)}`, {
        method: 'POST',
        body: JSON.stringify({ itemKey: item.key, until: snoozeUntil(snoozeChoice[item.key] || '1') }),
      });
      removeItem(item.key);
    } catch (error) {
      onError(error);
    } finally {
      setBusyKey(null);
    }
  }

  function openSource(item) {
    const entity = parseEntityRoute(item.sourceLink?.split('?')[0]);
    if (entity?.kind === 'work-item') {
      const workItem = workItems.find((candidate) => candidate.id === entity.id);
      if (workItem) setSelectedItem(workItem);
      navigate('board');
      return;
    }
    if (item.sourceType === 'ARTICLE') return navigate('knowledge');
    if (item.sourceType === 'CUSTOMER_CHAT') return navigate('supportinbox');
    const view = pathToView(item.sourceLink?.split('?')[0]);
    if (view) navigate(view);
  }

  async function executeAction(item, action) {
    if (!action) return;
    if (action.kind === 'OPEN') return openSource(item);
    if (action.kind === 'EXTERNAL') {
      window.open(action.path, '_blank', 'noopener,noreferrer');
      return;
    }
    if (action.kind === 'INPUT') {
      setInputItem({ item, action });
      setInputText('');
      return;
    }
    if (action.kind === 'CONVERT') {
      setConvertItem(item);
      setConvertTitle(item.message || item.title);
      setConvertProject(projects[0]?.id || '');
      return;
    }
    setBusyKey(item.key);
    try {
      await api.send(scopedActionPath(action.path, activeWorkspaceId), { method: action.method });
      if (action.id === 'assign') await fetchNotifications();
      else await markDone(item);
    } catch (error) {
      onError(error);
    } finally {
      setBusyKey(null);
    }
  }

  async function submitReply(event) {
    event.preventDefault();
    if (!inputText.trim() || !inputItem) return;
    const { item, action } = inputItem;
    setBusyKey(item.key);
    try {
      await api.send(scopedActionPath(action.path, activeWorkspaceId), {
        method: action.method,
        body: { body: inputText.trim() },
      });
      setInputItem(null);
      setInputText('');
      await markDone(item);
    } catch (error) {
      onError(error);
    } finally {
      setBusyKey(null);
    }
  }

  async function submitConvert(event) {
    event.preventDefault();
    if (!convertItem || !convertTitle.trim() || !convertProject) return;
    setBusyKey(convertItem.key);
    try {
      await api.send('/work-items', {
        method: 'POST',
        body: { title: convertTitle.trim(), type: 'Task', priority: 'MEDIUM', projectId: convertProject },
      });
      const completed = convertItem;
      setConvertItem(null);
      await markDone(completed);
    } catch (error) {
      onError(error);
    } finally {
      setBusyKey(null);
    }
  }

  async function clearLowPriority() {
    try {
      const result = await api.send(`/inbox/bulk-done?workspaceId=${encodeURIComponent(activeWorkspaceId)}`, {
        method: 'POST', body: { itemKeys: lowPriority.map((item) => item.key) },
      });
      if (result.updated > 0) await fetchNotifications();
    } catch (error) {
      onError(error);
    }
  }

  async function loadSummary() {
    setSummaryLoading(true);
    try {
      setSummary(await api.send(`/inbox/missed-summary?workspaceId=${encodeURIComponent(activeWorkspaceId)}`, {
        method: 'POST',
      }));
    } catch (error) {
      onError(error);
    } finally {
      setSummaryLoading(false);
    }
  }

  async function markActivityRead(notification) {
    try {
      await requireOk(`/notifications/${notification.id}/read?workspaceId=${encodeURIComponent(activeWorkspaceId)}`, {
        method: 'PUT',
      });
      setNotifications((current) => current.map((item) => (
        item.id === notification.id ? { ...item, read: true } : item
      )));
    } catch (error) {
      onError(error);
    }
  }

  async function markAllActivityRead() {
    try {
      await requireOk(`/notifications/mark-all-read?workspaceId=${encodeURIComponent(activeWorkspaceId)}`, {
        method: 'PUT',
      });
      setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    } catch (error) {
      onError(error);
    }
  }

  function renderActivityCard(notification) {
    return (
      <div key={notification.id} className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
        <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${notification.read ? 'bg-transparent' : 'bg-brand-orange'}`} aria-hidden="true" />
        <Button unstyled type="button" onClick={() => openSource({ sourceLink: notification.link, sourceType: notification.link?.startsWith('/support') ? 'CUSTOMER_CHAT' : 'NOTIFICATION' })}
          className="min-w-0 flex-1 rounded text-left focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40">
          <span className="block text-sm text-neutral-900 dark:text-neutral-100">{notification.message}</span>
          <span className="mt-1 flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
            {notification.createdAt ? new Date(notification.createdAt).toLocaleString() : ''}
            {notification.link && <Link2 className="h-3 w-3" aria-label="Has source link" />}
          </span>
        </Button>
        {!notification.read && (
          <Button size="sm" variant="ghost" onClick={() => markActivityRead(notification)} aria-label="Mark activity read">
            <Check className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    );
  }

  if (loading && notifications.length === 0 && inboxItems.length === 0) {
    return <PageLayout><Skeleton className="mb-6 h-7 w-36" /><ListSkeleton rows={5} /></PageLayout>;
  }

  return (
    <PageLayout title="Inbox">
      <Tabs defaultValue="actions">
        <TabList aria-label="Inbox sections">
          <Tab value="actions">Actions {unreadCount > 0 ? `(${unreadCount})` : ''}</Tab>
          <Tab value="activity">Activity history</Tab>
          <Tab value="preferences">Preferences</Tab>
        </TabList>

        <TabPanel value="actions">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-4 dark:border-neutral-700">
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {inboxItems.length} actionable item{inboxItems.length === 1 ? '' : 's'}
              </p>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Only work that needs your response appears here.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {lowPriority.length > 0 && <Button variant="secondary" size="sm" onClick={clearLowPriority}>Clear low priority</Button>}
              <Button variant="secondary" size="sm" onClick={loadSummary} disabled={summaryLoading}>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                {summaryLoading ? 'Summarizing...' : 'Summarize missed activity'}
              </Button>
            </div>
          </div>

          {summary && (
            <section aria-labelledby="missed-summary" className="mb-5 border-l-4 border-brand-orange bg-neutral-50 p-4 dark:bg-neutral-800">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="missed-summary" className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Missed activity</h2>
                  <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">{summary.text}</p>
                </div>
                <span className="text-xs text-neutral-500">{summary.usedAi ? 'AI summary' : 'Deterministic summary'}</span>
              </div>
              {summary.sources?.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2" aria-label="Summary sources">
                  {summary.sources.map((source) => (
                    <li key={source.key}>
                      <Button size="sm" variant="ghost" onClick={() => openSource({ ...source, sourceType: source.key.split(':')[0].toUpperCase() })}>
                        <Link2 className="h-3.5 w-3.5" aria-hidden="true" /> {source.title}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <AsyncBoundary empty={actionGroups.length === 0} emptyIcon={Check}
            emptyTitle="Action inbox is clear"
            emptySubtitle="Approvals, replies, reviews, assignments, and escalations appear here when they need action.">
            <div className="space-y-4">
              {actionGroups.map((group) => {
                const Icon = ACTION_ICON[group.id] || Bell;
                return (
                  <section key={group.id} aria-labelledby={`inbox-${group.id}`} className="border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
                    <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 dark:border-neutral-700">
                      <div>
                        <h2 id={`inbox-${group.id}`} className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                          <Icon className="h-4 w-4 text-brand-navy dark:text-brand-navy-tint" aria-hidden="true" /> {group.label}
                        </h2>
                        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{group.description}</p>
                      </div>
                      <span className="text-xs font-semibold text-neutral-600">{group.items.length}</span>
                    </div>
                    <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
                      {group.items.map((item) => (
                        <div key={item.key} className="px-4 py-3">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TONE_CLASS[item.intent]}`}>{group.label}</span>
                                <span className="text-xs text-neutral-500">{item.sourceType?.replaceAll('_', ' ')}</span>
                                {item.createdAt && <span className="text-xs text-neutral-500">{new Date(item.createdAt).toLocaleString()}</span>}
                              </div>
                              <p className="mt-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p>
                              <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">{item.message}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Button size="sm" onClick={() => executeAction(item, item.primaryAction)} disabled={busyKey === item.key}>
                                {item.primaryAction?.kind === 'EXTERNAL' && <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />}
                                {item.primaryAction?.label || 'Open'}
                              </Button>
                              {item.secondaryActions?.map((action) => (
                                <Button key={action.id} size="sm" variant="secondary" onClick={() => executeAction(item, action)}>{action.label}</Button>
                              ))}
                              <select value={snoozeChoice[item.key] || '1'} onChange={(event) => setSnoozeChoice((current) => ({ ...current, [item.key]: event.target.value }))}
                                className="h-8 rounded-sm border border-neutral-300 bg-white px-2 text-xs dark:border-neutral-600 dark:bg-neutral-800"
                                aria-label={`Snooze duration for ${item.title}`}>
                                <option value="1">1 hour</option><option value="4">4 hours</option><option value="8">8 hours</option><option value="tomorrow">Tomorrow</option>
                              </select>
                              <Button size="sm" variant="ghost" onClick={() => snooze(item)} disabled={busyKey === item.key}>
                                <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Snooze
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => markDone(item)} disabled={busyKey === item.key}>
                                <Check className="h-3.5 w-3.5" aria-hidden="true" /> Done
                              </Button>
                            </div>
                          </div>

                          {inputItem?.item.key === item.key && (
                            <form onSubmit={submitReply} className="mt-3 flex flex-col gap-2 border-t border-neutral-100 pt-3 sm:flex-row dark:border-neutral-700">
                              <label className="sr-only" htmlFor={`reply-${item.key}`}>Reply</label>
                              <textarea id={`reply-${item.key}`} value={inputText} onChange={(event) => setInputText(event.target.value)}
                                className="input min-h-20 flex-1 text-sm" placeholder="Write a reply" required />
                              <div className="flex gap-2 sm:items-start">
                                <Button type="submit" size="sm">Send reply</Button>
                                <Button type="button" size="sm" variant="ghost" onClick={() => setInputItem(null)}>Cancel</Button>
                              </div>
                            </form>
                          )}

                          {convertItem?.key === item.key && (
                            <form onSubmit={submitConvert} className="mt-3 grid gap-2 border-t border-neutral-100 pt-3 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,16rem)_auto] dark:border-neutral-700">
                              <label className="sr-only" htmlFor={`convert-title-${item.key}`}>Work item title</label>
                              <input id={`convert-title-${item.key}`} className="input text-sm" value={convertTitle}
                                onChange={(event) => setConvertTitle(event.target.value)} required minLength={3} />
                              <label className="sr-only" htmlFor={`convert-project-${item.key}`}>Project</label>
                              <select id={`convert-project-${item.key}`} className="input text-sm" value={convertProject}
                                onChange={(event) => setConvertProject(event.target.value)} required>
                                <option value="">Select project</option>
                                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                              </select>
                              <div className="flex gap-2">
                                <Button type="submit" size="sm">Create task</Button>
                                <Button type="button" size="sm" variant="ghost" onClick={() => setConvertItem(null)}>Cancel</Button>
                              </div>
                            </form>
                          )}
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
          <div className="mb-4 flex justify-end">
            {unreadActivity && <Button size="sm" variant="secondary" onClick={markAllActivityRead}>Mark all activity read</Button>}
          </div>
          <AsyncBoundary empty={notifications.length === 0} emptyIcon={Bell} emptyTitle="No activity yet"
            emptySubtitle="Notification history remains here after Inbox actions are completed.">
            <div className="space-y-2">{notifications.map(renderActivityCard)}</div>
          </AsyncBoundary>
        </TabPanel>

        <TabPanel value="preferences"><PushSettingsPanel /></TabPanel>
      </Tabs>
    </PageLayout>
  );
}
