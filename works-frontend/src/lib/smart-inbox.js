export const INBOX_GROUPS = [
  { id: 'approve', label: 'Approve', description: 'Decisions and approvals waiting for you.' },
  { id: 'reply', label: 'Reply', description: 'Mentions, comments, and customer replies.' },
  { id: 'review', label: 'Review', description: 'Changes, reports, subscriptions, and code/work review.' },
  { id: 'assign', label: 'Assign', description: 'Work assigned to you or needing ownership.' },
  { id: 'escalate', label: 'Escalate', description: 'SLA, compliance, risk, and incident alerts.' },
];

const GROUP_BY_ID = Object.fromEntries(INBOX_GROUPS.map((group) => [group.id, group]));

function textFor(notification) {
  return `${notification?.type || ''} ${notification?.message || ''} ${notification?.link || ''}`.toLowerCase();
}

export function classifyInboxItem(notification) {
  const text = textFor(notification);

  if (text.match(/approv|decision|sign[- ]?off|publish/)) {
    return { ...GROUP_BY_ID.approve, tone: 'warning', actionLabel: 'Review approval' };
  }
  if (text.match(/mention|comment|reply|chat|customer|message/)) {
    return { ...GROUP_BY_ID.reply, tone: 'info', actionLabel: 'Reply' };
  }
  if (text.match(/review|watch|report|subscription|bql|code|pull request|pr\b/)) {
    return { ...GROUP_BY_ID.review, tone: 'neutral', actionLabel: 'Review' };
  }
  if (text.match(/assign|owner|ownership/)) {
    return { ...GROUP_BY_ID.assign, tone: 'success', actionLabel: 'Open assignment' };
  }
  if (text.match(/sla|breach|escalat|compliance|risk|incident|p0|critical/)) {
    return { ...GROUP_BY_ID.escalate, tone: 'danger', actionLabel: 'Escalate' };
  }

  return { id: 'activity', label: 'Activity', description: 'Informational update.', tone: 'neutral', actionLabel: 'Open' };
}

export function toInboxItem(notification, options = {}) {
  const group = classifyInboxItem(notification);
  const snoozed = Boolean(options.snoozedIds?.has?.(String(notification?.id)));

  return {
    ...notification,
    inboxGroup: group.id,
    inboxGroupLabel: group.label,
    inboxDescription: group.description,
    actionLabel: group.actionLabel,
    tone: group.tone,
    actionable: !notification?.read && !snoozed && group.id !== 'activity',
    snoozed,
  };
}

export function getActionableInboxItems(notifications = [], options = {}) {
  return notifications
    .map((notification) => toInboxItem(notification, options))
    .filter((item) => item.actionable);
}

export function groupInboxItems(items = []) {
  return INBOX_GROUPS
    .map((group) => ({
      ...group,
      items: items.filter((item) => item.inboxGroup === group.id),
    }))
    .filter((group) => group.items.length > 0);
}

export function countActionableNotifications(notifications = [], options = {}) {
  return getActionableInboxItems(notifications, options).length;
}
