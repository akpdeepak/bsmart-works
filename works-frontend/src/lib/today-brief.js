const MAX_ATTENTION = 5;

const ROLE_LABELS = {
  developer: 'Developer',
  'scrum-master': 'Scrum Master',
  'product-owner': 'Product Owner',
  'support-agent': 'Support Agent',
  executive: 'Leadership',
  admin: 'Admin',
};

const ROLE_ACTIONS = {
  developer: { label: 'Plan my day', view: 'myworks' },
  'scrum-master': { label: 'Review board', view: 'board' },
  'product-owner': { label: 'Groom backlog', view: 'backlog' },
  'support-agent': { label: 'Open support inbox', view: 'supportinbox' },
  executive: { label: 'Open portfolio', view: 'projects' },
  admin: { label: 'Manage workspace', view: 'workspace' },
};

const ROLE_SECONDARY_ACTIONS = {
  developer: { label: 'Open sprint', view: 'sprint' },
  'scrum-master': { label: 'Open sprint', view: 'sprint' },
  'product-owner': { label: 'Open releases', view: 'releases' },
  'support-agent': { label: 'Open service desk', view: 'service' },
  executive: { label: 'Open releases', view: 'releases' },
  admin: { label: 'Open security', view: 'security' },
};

const ROLE_QUIET_WINS = {
  developer: 'No urgent personal queue pressure is visible right now.',
  'scrum-master': 'Sprint signals are calm enough for focused facilitation.',
  'product-owner': 'Backlog and release signals are not showing immediate pressure.',
  'support-agent': 'No customer conversation needs urgent attention right now.',
  executive: 'Portfolio signals are steady enough for a measured review.',
  admin: 'Workspace administration has no urgent signal in this view.',
};

function asDateOnly(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function isOverdue(value, today) {
  const due = asDateOnly(value);
  if (!due) return false;
  return due < today;
}

function isHighPriority(item) {
  return ['CRITICAL', 'HIGH'].includes(String(item?.priority || '').toUpperCase());
}

function itemTitle(item, fallback) {
  return item?.title || item?.name || item?.subject || item?.summary || fallback;
}

function withId(prefix, item, index) {
  return item?.id ? `${prefix}-${item.id}` : `${prefix}-${index}`;
}

function cap(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.id || `${item.title}-${item.reason}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, MAX_ATTENTION);
}

function developerAttention(data, today) {
  const blockers = data?.blockers || [];
  const items = data?.myOpenItems || [];
  const pendingReviews = data?.pendingReviews || [];
  const devSyncHighlights = data?.devSyncHighlights || [];
  return cap([
    ...blockers.map((blocker, index) => ({
      id: withId('blocker', blocker, index),
      title: itemTitle(blocker, 'Blocked work item'),
      reason: blocker.blocking_title
        ? `Blocked by ${blocker.blocking_title}.`
        : 'Blocked work needs clearing before flow can continue.',
      tone: 'danger',
      view: 'myworks',
    })),
    ...pendingReviews.map((review, index) => ({
      id: withId('review', review, index),
      title: itemTitle(review, 'Code review request'),
      reason: `Approval is waiting in ${review.repo || 'the code review queue'}.`,
      tone: 'warning',
      view: 'developer',
    })),
    ...items.filter((item) => isOverdue(item.due_date || item.dueDate, today)).map((item, index) => ({
      id: withId('overdue', item, index),
      title: itemTitle(item, 'Overdue work item'),
      reason: 'Overdue and assigned to you.',
      tone: 'danger',
      view: 'myworks',
    })),
    ...items.filter(isHighPriority).map((item, index) => ({
      id: withId('priority', item, index),
      title: itemTitle(item, 'High-priority work item'),
      reason: 'High-priority work in your queue.',
      tone: 'warning',
      view: 'myworks',
    })),
    ...devSyncHighlights
      .filter((highlight) => !pendingReviews.some((review) => review.id === highlight.id))
      .map((highlight, index) => ({
        id: withId('devsync', highlight, index),
        title: itemTitle(highlight, 'DevSync update'),
        reason: `${highlight.status || 'Code'} activity changed and may affect today's work.`,
        tone: 'neutral',
        view: 'developer',
      })),
  ]);
}

function scrumMasterAttention(data) {
  const highRisk = data?.highRiskItems || [];
  const scopeChanges = data?.scopeChanges || [];
  const activeSprint = data?.activeSprints?.[0];
  const sprintHealth = data?.sprintHealth
    ?? (activeSprint?.total_items > 0 ? Math.round((activeSprint.done_items || 0) * 100 / activeSprint.total_items) : null);

  return cap([
    ...(sprintHealth !== null && sprintHealth < 50 ? [{
      id: 'sprint-health',
      title: activeSprint?.name || 'Sprint health is low',
      reason: `Sprint completion is at ${sprintHealth}%.`,
      tone: 'danger',
      view: 'sprint',
    }] : []),
    ...highRisk.map((item, index) => ({
      id: withId('risk', item, index),
      title: itemTitle(item, 'High-risk sprint item'),
      reason: `${item.priority || 'High'} priority item needs facilitation.`,
      tone: String(item.priority).toUpperCase() === 'CRITICAL' ? 'danger' : 'warning',
      view: 'board',
    })),
    ...scopeChanges.map((item, index) => ({
      id: withId('scope', item, index),
      title: itemTitle(item, 'Scope change'),
      reason: 'Scope changed during the sprint.',
      tone: 'warning',
      view: 'sprint',
    })),
  ]);
}

function productOwnerAttention(data, today) {
  const ungroomed = data?.ungroomedItems || [];
  const upcoming = data?.upcomingReleases || [];
  const approvals = data?.approvals || [];
  return cap([
    ...approvals.map((approval, index) => ({
      id: withId('approval', approval, index),
      title: itemTitle(approval, 'Article approval'),
      reason: approval.reviewer_due_date
        ? `Approval is waiting; review due ${approval.reviewer_due_date}.`
        : 'Approval is waiting for your review.',
      tone: 'warning',
      view: 'knowledge',
    })),
    ...upcoming.filter((release) => isOverdue(release.release_date, today)).map((release, index) => ({
      id: withId('release-overdue', release, index),
      title: itemTitle(release, 'Release date needs review'),
      reason: 'Release date has passed and readiness needs review.',
      tone: 'danger',
      view: 'releases',
    })),
    ...upcoming.filter((release) => {
      const releaseDate = asDateOnly(release.release_date);
      if (!releaseDate) return false;
      const days = Math.ceil((releaseDate - today) / 86400000);
      return days >= 0 && days <= 14;
    }).map((release, index) => ({
      id: withId('release-soon', release, index),
      title: itemTitle(release, 'Upcoming release'),
      reason: 'Release is due within 14 days.',
      tone: 'warning',
      view: 'releases',
    })),
    ...ungroomed.slice(0, MAX_ATTENTION).map((item, index) => ({
      id: withId('ungroomed', item, index),
      title: itemTitle(item, 'Ungroomed backlog item'),
      reason: 'Backlog item needs grooming before planning.',
      tone: isHighPriority(item) ? 'warning' : 'neutral',
      view: 'backlog',
    })),
  ]);
}

function slaRiskAttention(data) {
  return (data?.slaRisks || []).map((risk, index) => ({
    id: withId('sla', risk, index),
    title: itemTitle(risk, 'SLA risk'),
    reason: risk.state === 'BREACHED'
      ? `${risk.metric || 'Service'} SLA is breached.`
      : `${risk.metric || 'Service'} SLA is due within 24 hours.`,
    tone: risk.state === 'BREACHED' ? 'danger' : 'warning',
    view: 'sla',
  }));
}

function executiveAttention(data) {
  const overdueActions = data?.overdueActions || [];
  const raid = data?.raidSummary || [];
  const risks = raid.find((item) => item.type === 'risks')?.open ?? 0;
  const issues = raid.find((item) => item.type === 'issues')?.open ?? 0;
  const health = data?.overallHealth ?? null;

  return cap([
    ...slaRiskAttention(data),
    ...(health !== null && health < 50 ? [{
      id: 'portfolio-health',
      title: 'Portfolio health below target',
      reason: `Overall health is at ${health}%.`,
      tone: 'danger',
      view: 'projects',
    }] : []),
    ...overdueActions.map((item, index) => ({
      id: withId('overdue-action', item, index),
      title: itemTitle(item, 'Overdue leadership action'),
      reason: item.due_date ? `Due ${item.due_date}.` : 'Leadership action is overdue.',
      tone: 'danger',
      view: 'projects',
    })),
    ...(risks + issues > 0 ? [{
      id: 'raid-open',
      title: 'Open risks and issues',
      reason: `${risks} risks and ${issues} issues need review.`,
      tone: risks + issues > 5 ? 'danger' : 'warning',
      view: 'reports',
    }] : []),
  ]);
}

function supportAgentAttention(data) {
  const conversations = data?.conversations || [];
  const messages = data?.importantMessages || [];
  return cap([
    ...slaRiskAttention(data),
    ...conversations.filter((item) => item.status === 'ESCALATED').map((item, index) => ({
      id: withId('support-escalated', item, index),
      title: itemTitle(item, 'Escalated customer conversation'),
      reason: item.assigned_agent_id
        ? 'Customer escalation is assigned and waiting for progress.'
        : 'Customer escalation is waiting for an agent.',
      tone: 'danger',
      view: 'supportinbox',
    })),
    ...messages.map((message, index) => ({
      id: withId('support-message', message, index),
      title: itemTitle(message, 'Customer message'),
      reason: 'A customer sent a recent message in an unresolved conversation.',
      tone: 'warning',
      view: 'supportinbox',
    })),
    ...conversations.filter((item) => item.status === 'OPEN').map((item, index) => ({
      id: withId('support-open', item, index),
      title: itemTitle(item, 'Open customer conversation'),
      reason: 'Customer conversation is open and needs review.',
      tone: 'warning',
      view: 'supportinbox',
    })),
  ]);
}

function adminAttention(data) {
  const mfa = data?.mfaStats || { total: 0, mfa_enabled: 0 };
  const mfaPct = mfa.total > 0 ? Math.round((mfa.mfa_enabled || 0) * 100 / mfa.total) : 100;
  const auditLog = data?.recentAuditLog || [];
  const events = data?.totalEventsWeek ?? 0;

  return cap([
    ...(mfaPct < 80 ? [{
      id: 'mfa-adoption',
      title: 'MFA adoption below target',
      reason: `${mfaPct}% of workspace members have MFA enabled.`,
      tone: 'danger',
      view: 'workspace',
    }] : []),
    ...auditLog.map((item, index) => ({
      id: withId('audit', item, index),
      title: item.target_name || 'Recent role change',
      reason: 'Recent permission change should be checked.',
      tone: 'warning',
      view: 'security',
    })),
    ...(events === 0 ? [{
      id: 'quiet-platform',
      title: 'No platform activity this week',
      reason: 'A quiet workspace may need adoption follow-up.',
      tone: 'neutral',
      view: 'workspace',
    }] : []),
  ]);
}

function attentionFor(role, data, today) {
  switch (role) {
    case 'scrum-master':
      return scrumMasterAttention(data);
    case 'product-owner':
      return productOwnerAttention(data, today);
    case 'support-agent':
      return supportAgentAttention(data);
    case 'executive':
      return executiveAttention(data);
    case 'admin':
      return adminAttention(data);
    default:
      return developerAttention(data, today);
  }
}

function confidenceFor(role, attention) {
  if (attention.some((item) => item.tone === 'danger')) {
    return 'A few items need attention before the day gets noisy.';
  }
  if (attention.length > 0) {
    return 'There is a short queue to review, but the day is still manageable.';
  }
  return ROLE_QUIET_WINS[role] || 'No urgent signal is visible right now.';
}

export function buildTodayBrief(role, data, options = {}) {
  const normalizedRole = ROLE_LABELS[role] ? role : 'developer';
  const now = options.now || new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const attention = attentionFor(normalizedRole, data, today);

  return {
    role: normalizedRole,
    roleLabel: ROLE_LABELS[normalizedRole],
    dateLabel: new Intl.DateTimeFormat(options.locale || undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    }).format(now),
    confidence: confidenceFor(normalizedRole, attention),
    attention,
    attentionLimit: MAX_ATTENTION,
    primaryAction: ROLE_ACTIONS[normalizedRole],
    secondaryAction: ROLE_SECONDARY_ACTIONS[normalizedRole],
    quietWin: ROLE_QUIET_WINS[normalizedRole],
  };
}
