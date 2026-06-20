const WORK_KEY_PATTERN = /\b[A-Z][A-Z0-9]+-\d+\b/;

const EVENT_LABELS = {
  BRANCH_CREATED: 'Branch created',
  COMMIT_PUSHED: 'Commit pushed',
  PR_OPENED: 'PR opened',
  PR_UPDATED: 'PR updated',
  PR_MERGED: 'PR merged',
  REVIEW_REQUESTED: 'Review requested',
  CI_FAILED: 'CI failed',
  CI_PASSED: 'CI passed',
  DEPLOYED: 'Deployed',
  RELEASED: 'Released',
};

const lower = (value) => String(value || '').toLowerCase();
const text = (value, fallback = 'Unknown') => String(value || fallback).trim();

export function formatEngineeringEventType(eventType) {
  const key = String(eventType || '').toUpperCase();
  return EVENT_LABELS[key] || key.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function inferWorkKey(activity) {
  const aggregate = text(activity.aggregateId, '');
  const message = text(activity.message || activity.title || activity.summary, '');
  return aggregate.match(WORK_KEY_PATTERN)?.[0] || message.match(WORK_KEY_PATTERN)?.[0] || null;
}

function normalizeRawEvent(activity, index) {
  const workItemId = activity.workItemId || inferWorkKey(activity);
  const eventType = activity.eventType || activity.type || 'CODE_ACTIVITY';
  const sourceId = activity.providerEventId || activity.id || activity.aggregateId || `raw-${index + 1}`;
  return {
    id: sourceId,
    label: formatEngineeringEventType(eventType),
    eventType: String(eventType).toUpperCase(),
    workItemId,
    linked: Boolean(workItemId),
    source: activity.provider || activity.source || 'Developer activity',
    when: activity.createdAt || activity.occurredAt || activity.timestamp || null,
    detail: activity.message || activity.title || activity.summary || activity.aggregateId || 'Raw activity captured',
  };
}

function nextActionForPr(pr) {
  if (lower(pr.status) === 'draft') return 'Wait until the draft is ready for review.';
  if (pr.ciStatus && lower(pr.ciStatus).includes('fail')) return 'Fix the failing CI signal before merge.';
  if (pr.reviewState && lower(pr.reviewState).includes('change')) return 'Address requested changes.';
  return 'Review requested; keep the work item moving with source context.';
}

export function buildEngineeringActivity({ todaysWork = [], reviewQueue = [], blockers = [], recentActivity = [] } = {}) {
  const rawEvents = recentActivity.map(normalizeRawEvent);
  const linkedEvents = rawEvents.filter((event) => event.linked);
  const unlinkedEvents = rawEvents.filter((event) => !event.linked);
  const failedCi = rawEvents.filter((event) => event.eventType.includes('CI') && event.eventType.includes('FAIL'));
  const deployments = rawEvents.filter((event) => event.eventType.includes('DEPLOY'));
  const merged = rawEvents.filter((event) => event.eventType.includes('MERGED'));

  const reviewFlow = reviewQueue.map((pr) => ({
    id: pr.id || `${pr.repo || 'repo'}-${pr.number || pr.title}`,
    title: pr.title || 'Pull request awaiting review',
    number: pr.number,
    repo: pr.repo,
    url: pr.url,
    workItemId: pr.workItemId || pr.linkedWorkItemId || null,
    status: lower(pr.status) === 'draft' ? 'Draft' : 'Waiting for review',
    nextAction: nextActionForPr(pr),
    source: `PR ${pr.number || pr.id || pr.title}`,
  }));

  const linkedWork = todaysWork.map((item) => ({
    id: item.id,
    title: item.title || 'Untitled work item',
    status: item.status || 'Unknown',
    priority: item.priority,
    evidenceCount: linkedEvents.filter((event) => event.workItemId === item.id).length,
    blocked: blockers.some((blocker) => blocker.id === item.id),
  }));

  const citations = ['Developer Workspace home'];
  if (reviewFlow.length > 0) citations.push(`${reviewFlow.length} review request${reviewFlow.length === 1 ? '' : 's'}`);
  if (rawEvents.length > 0) citations.push(`${rawEvents.length} raw activity event${rawEvents.length === 1 ? '' : 's'}`);
  if (todaysWork.length > 0) citations.push(`${todaysWork.length} active work item${todaysWork.length === 1 ? '' : 's'}`);
  if (blockers.length > 0) citations.push(`${blockers.length} blocker${blockers.length === 1 ? '' : 's'}`);

  const risks = [];
  if (failedCi.length > 0) risks.push(`${failedCi.length} CI signal${failedCi.length === 1 ? '' : 's'} need attention`);
  if (blockers.length > 0) risks.push(`${blockers.length} linked work item${blockers.length === 1 ? ' is' : 's are'} blocked`);
  if (unlinkedEvents.length > 0) risks.push(`${unlinkedEvents.length} activity event${unlinkedEvents.length === 1 ? '' : 's'} need manual linking`);

  const summary = risks.length > 0
    ? `Engineering flow needs attention: ${risks[0]}.`
    : reviewFlow.length > 0
      ? `Engineering flow is moving, with ${reviewFlow.length} review request${reviewFlow.length === 1 ? '' : 's'} waiting.`
      : 'Engineering flow has no immediate review, CI, deployment, or linking concerns.';

  return {
    summary,
    citations,
    reviewFlow,
    linkedWork,
    rawEvents,
    unlinkedEvents,
    releaseReadiness: {
      failedCi: failedCi.length,
      merged: merged.length,
      deployed: deployments.length,
      pendingReview: reviewFlow.length,
      status: failedCi.length > 0 ? 'Needs attention' : reviewFlow.length > 0 ? 'Review pending' : 'Ready',
    },
  };
}
