function isOpenItem(item, isDone) {
  return !isDone?.(item);
}

function linkedCode(items = []) {
  return items.filter((item) => (
    item.devSyncLinked
    || item.codeLinked
    || item.pullRequestUrl
    || item.branchName
    || item.repositoryUrl
  )).length;
}

function isSlaRisk(item, isDone) {
  if (item.slaBreachFlag) return true;
  if (!item.slaTarget || !isOpenItem(item, isDone)) return false;
  const target = new Date(item.slaTarget);
  return !Number.isNaN(target.getTime()) && target.getTime() < Date.now();
}

function countType(items, type, isDone) {
  return items.filter((item) => (item.type || '').toUpperCase() === type && isOpenItem(item, isDone)).length;
}

function countOneOfTypes(items, types, isDone) {
  const set = new Set(types);
  return items.filter((item) => set.has((item.type || '').toUpperCase()) && isOpenItem(item, isDone)).length;
}

export function buildProjectCommandCenter({ 
  project = {}, 
  items = [], 
  metrics = {}, 
  isDone = () => false,
  projectHealth = null,
  projectRisks = null,
  projectDecisions = null
} = {}) {
  const total = items.length;
  const done = items.filter(isDone).length;
  const progress = metrics?.completionPct != null
    ? Math.round(metrics.completionPct)
    : total > 0 ? Math.round((done / total) * 100) : 0;
  const blocked = items.filter((item) => item.blocked || (item.status || '').toLowerCase() === 'blocked').length;
  
  const risks = projectRisks ? projectRisks.filter(r => r.status === 'OPEN').length : countType(items, 'RISK', isDone);
  const issues = countOneOfTypes(items, ['ISSUE', 'BUG', 'INCIDENT'], isDone);
  const dependencies = countType(items, 'DEPENDENCY', isDone);
  const decisions = projectDecisions ? projectDecisions.filter(d => d.status === 'PROPOSED').length : countType(items, 'DECISION', isDone);
  const slaRisk = items.filter((item) => isSlaRisk(item, isDone)).length;
  const devSync = linkedCode(items);

  let health = projectHealth ? projectHealth.status.replace('_', ' ') : 'On track';
  let healthTone = projectHealth?.status === 'OFF_TRACK' ? 'danger' 
                 : projectHealth?.status === 'AT_RISK' ? 'warning' 
                 : 'success';
  let explanation = projectHealth ? projectHealth.explanation : `${progress}% complete with no blocking signals in the current work set.`;
  
  if (!projectHealth) {
    if (slaRisk > 0 || blocked > 0) {
      health = 'At risk';
      healthTone = 'danger';
      explanation = `${blocked} blocker${blocked === 1 ? '' : 's'} and ${slaRisk} SLA risk${slaRisk === 1 ? '' : 's'} need attention.`;
    } else if (risks + issues + dependencies > 0) {
      health = 'Needs attention';
      healthTone = 'warning';
      explanation = `${risks} risk${risks === 1 ? '' : 's'}, ${issues} issue${issues === 1 ? '' : 's'}, and ${dependencies} dependenc${dependencies === 1 ? 'y' : 'ies'} are open.`;
    }
  }

  const nextActions = [];
  if (blocked > 0) nextActions.push('Clear blockers with named owners.');
  if (slaRisk > 0) nextActions.push('Prepare customer/SLA recovery update.');
  if (risks > 0) nextActions.push('Review top project risks.');
  if (decisions > 0) nextActions.push('Close pending decisions.');
  if (nextActions.length === 0) nextActions.push('Keep execution cadence and publish the next customer update.');

  const citations = ['project fields', `${total} work items`];
  if (metrics && Object.keys(metrics).length > 0) citations.push('project metrics');
  if (devSync > 0) citations.push(`${devSync} DevSync-linked item${devSync === 1 ? '' : 's'}`);

  return {
    projectId: project.id,
    health,
    healthTone,
    explanation,
    progress,
    blocked,
    risks,
    issues,
    dependencies,
    decisions,
    slaRisk,
    devSync,
    nextActions: nextActions.slice(0, 3),
    citations,
  };
}
