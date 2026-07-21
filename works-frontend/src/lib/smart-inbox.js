export const INBOX_GROUPS = [
  { id: 'approve', intent: 'APPROVE', label: 'Approve', description: 'Decisions and approvals waiting for you.' },
  { id: 'reply', intent: 'REPLY', label: 'Reply', description: 'Mentions and customer replies.' },
  { id: 'review', intent: 'REVIEW', label: 'Review', description: 'Code reviews and waiting or blocked work.' },
  { id: 'assign', intent: 'ASSIGN', label: 'Assign', description: 'Work needing ownership or assigned to you.' },
  { id: 'escalate', intent: 'ESCALATE', label: 'Escalate', description: 'SLA, compliance, and critical alerts.' },
];

const GROUP_BY_INTENT = Object.fromEntries(INBOX_GROUPS.map((group) => [group.intent, group]));

export function groupInboxItems(items = []) {
  return INBOX_GROUPS
    .map((group) => ({ ...group, items: items.filter((item) => item.intent === group.intent) }))
    .filter((group) => group.items.length > 0);
}

export function countActionableNotifications(items = []) {
  return items.length;
}

// Compatibility projection for Activity/My Works callers that still consume raw notifications.
export function classifyInboxItem(notification) {
  const type = String(notification?.type || '').toUpperCase();
  if (type === 'MENTION' || type === 'COMMENT') return { ...GROUP_BY_INTENT.REPLY, tone: 'info', actionLabel: 'Reply' };
  if (type === 'ASSIGNED' || type === 'SERVICE_REQUEST') return { ...GROUP_BY_INTENT.ASSIGN, tone: 'success', actionLabel: 'Open assignment' };
  if (type.startsWith('SLA_') || type.startsWith('COMPLIANCE_')) return { ...GROUP_BY_INTENT.ESCALATE, tone: 'danger', actionLabel: 'Review alert' };
  return { id: 'activity', label: 'Activity', description: 'Informational update.', tone: 'neutral', actionLabel: 'Open' };
}

export function toInboxItem(notification) {
  const group = classifyInboxItem(notification);
  return {
    ...notification,
    inboxGroup: group.id,
    inboxGroupLabel: group.label,
    inboxDescription: group.description,
    actionLabel: group.actionLabel,
    tone: group.tone,
    actionable: !notification?.read && group.id !== 'activity',
  };
}

export function getActionableInboxItems(notifications = []) {
  return notifications.map(toInboxItem).filter((item) => item.actionable);
}
