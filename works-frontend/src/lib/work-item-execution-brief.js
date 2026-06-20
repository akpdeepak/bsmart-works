const UNKNOWN = 'Not set';

function compactCount(count, singular, plural = `${singular}s`) {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}

function formatDate(value) {
  if (!value) return 'No due date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No due date';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function findUserName(users = [], id) {
  if (!id) return 'Unassigned';
  const user = users.find((u) => u.id === id);
  return user?.fullName || user?.name || user?.email || id;
}

function hasLinkedCode(item = {}, links = []) {
  if (item.devSyncLinked || item.codeLinked || item.pullRequestUrl || item.branchName) return true;
  return links.some((link) => {
    const text = [
      link.type,
      link.relation,
      link.title,
      link.url,
      link.targetType,
    ].filter(Boolean).join(' ').toLowerCase();
    return /\b(git|github|gitlab|bitbucket|commit|branch|pull request|pr)\b/.test(text);
  });
}

export function buildWorkItemExecutionBrief({
  item = {},
  users = [],
  comments = [],
  links = [],
  attachments = [],
  activity = [],
  children = [],
} = {}) {
  const key = item.displayKey || item.autoId || item.id || UNKNOWN;
  const status = item.status || UNKNOWN;
  const priority = item.priority || UNKNOWN;
  const owner = findUserName(users, item.assigneeId);
  const dueDate = formatDate(item.dueDate);
  const visibility = item.customerVisible || item.portalVisible || item.externalVisible
    ? 'Customer-visible'
    : 'Internal only';
  const sla = item.slaTarget
    ? `${item.slaBreachFlag ? 'SLA breached' : 'SLA target'} ${formatDate(item.slaTarget)}`
    : 'No SLA target';
  const devSync = hasLinkedCode(item, links) ? 'Linked code available' : 'No linked code yet';

  const citations = ['work item fields'];
  if (comments.length) citations.push(compactCount(comments.length, 'comment'));
  if (activity.length) citations.push(compactCount(activity.length, 'activity event'));
  if (links.length) citations.push(compactCount(links.length, 'link'));
  if (attachments.length) citations.push(compactCount(attachments.length, 'file'));
  if (children.length) citations.push(compactCount(children.length, 'sub-item'));

  return {
    key,
    status,
    priority,
    owner,
    dueDate,
    visibility,
    sla,
    devSync,
    citations,
    summary: `${key} is ${status} with ${priority} priority, owned by ${owner}, due ${dueDate}.`,
  };
}
