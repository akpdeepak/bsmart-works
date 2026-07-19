const SHA = /^[0-9a-f]{40}$/;
const TASK = /^GH-\d+$/;
const STATES = new Set([
  'READY',
  'CLAIMED',
  'PLANNED',
  'RED',
  'GREEN',
  'VALIDATED',
  'REVIEW',
  'MERGED',
  'MAIN_VERIFIED',
  'DONE',
  'BLOCKED',
]);
const TRANSITIONS = new Map([
  ['READY', new Set(['CLAIMED', 'BLOCKED'])],
  ['CLAIMED', new Set(['PLANNED', 'READY', 'BLOCKED'])],
  ['PLANNED', new Set(['RED', 'GREEN', 'BLOCKED'])],
  ['RED', new Set(['GREEN', 'BLOCKED'])],
  ['GREEN', new Set(['RED', 'VALIDATED', 'BLOCKED'])],
  ['VALIDATED', new Set(['RED', 'REVIEW', 'BLOCKED'])],
  ['REVIEW', new Set(['GREEN', 'MERGED', 'BLOCKED'])],
  ['MERGED', new Set(['MAIN_VERIFIED', 'BLOCKED'])],
  ['MAIN_VERIFIED', new Set(['DONE', 'BLOCKED'])],
  ['DONE', new Set([])],
  ['BLOCKED', new Set(['CLAIMED', 'READY'])],
]);

const present = (value) => value !== undefined && value !== null && value !== '';
const isoDate = (value) => present(value) && !Number.isNaN(Date.parse(value));

export function validateTaskState(state) {
  const failures = [];
  if (state?.protocol !== 'bsmart-task/v1') failures.push('protocol must be bsmart-task/v1');
  if (!TASK.test(state?.task ?? '')) failures.push('task must use GH-<number>');
  if (!STATES.has(state?.state)) failures.push('state is invalid');
  if (!present(state?.owner?.app) || !present(state?.owner?.model) || !present(state?.owner?.runId)) {
    failures.push('owner app, model, and runId are required');
  }
  if (!isoDate(state?.lease?.heartbeatAt) || !isoDate(state?.lease?.expiresAt)) {
    failures.push('lease heartbeatAt and expiresAt must be ISO dates');
  } else if (Date.parse(state.lease.expiresAt) <= Date.parse(state.lease.heartbeatAt)) {
    failures.push('lease expiresAt must be after heartbeatAt');
  }
  if (!SHA.test(state?.git?.baseSha ?? '') || !SHA.test(state?.git?.headSha ?? '')) {
    failures.push('git baseSha and headSha must be full lowercase SHAs');
  }
  if (!present(state?.git?.branch)) failures.push('git branch is required');
  if (!Array.isArray(state?.reservedPaths) || state.reservedPaths.length === 0) {
    failures.push('at least one reserved path is required');
  }
  if (!Array.isArray(state?.acceptance) || state.acceptance.length === 0) {
    failures.push('acceptance evidence is required');
  }
  if (!Array.isArray(state?.validation) || state.validation.length === 0) {
    failures.push('validation evidence is required');
  }
  if (!present(state?.nextAction)) failures.push('nextAction is required');
  return failures;
}

export function validatePrEvidence(evidence) {
  const failures = [];
  if (evidence?.protocol !== 'bsmart-pr/v1') failures.push('protocol must be bsmart-pr/v1');
  if (!TASK.test(evidence?.task ?? '')) failures.push('task must use GH-<number>');
  if (!/^https:\/\/github\.com\/.+\/issues\/\d+$/.test(evidence?.planUrl ?? '')) {
    failures.push('planUrl must link to the GitHub task');
  }

  const validation = Array.isArray(evidence?.validation) ? evidence.validation : [];
  const validationIds = new Set(validation.map((item) => item.id));
  if (validation.length === 0) failures.push('validation evidence is required');
  for (const item of evidence?.acceptance ?? []) {
    if (!present(item.id)) failures.push('acceptance IDs are required');
    if (!Array.isArray(item.evidence) || item.evidence.length === 0) {
      failures.push(`${item.id ?? 'acceptance item'} has no evidence mapping`);
    } else if (item.evidence.some((id) => !validationIds.has(id))) {
      failures.push(`${item.id} references unknown validation evidence`);
    }
  }
  if (!Array.isArray(evidence?.acceptance) || evidence.acceptance.length === 0) {
    failures.push('acceptance criteria are required');
  }

  if (evidence?.tdd?.applicable === true) {
    for (const phase of ['red', 'green', 'finalGreen']) {
      if (!present(evidence.tdd?.[phase]?.command) || !present(evidence.tdd?.[phase]?.evidence)) {
        failures.push(`TDD ${phase} command and evidence are required`);
      }
    }
  } else if (evidence?.tdd?.applicable !== false || !present(evidence?.tdd?.reason)) {
    failures.push('TDD must be applicable or include a reason');
  }
  return failures;
}

export function extractJsonMarker(text, marker) {
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp(`<!--\\s*${escaped}\\s*([\\s\\S]*?)-->`));
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim());
  } catch (error) {
    throw new Error(`${marker} contains invalid JSON: ${error.message}`);
  }
}

const normalizeReservation = (value) => value
  .replace(/\\/g, '/')
  .replace(/\*\*.*$/, '')
  .replace(/\*.*$/, '')
  .replace(/\/$/, '');

export function pathsOverlap(left, right) {
  return left.some((leftPath) => {
    const a = normalizeReservation(leftPath);
    return right.some((rightPath) => {
      const b = normalizeReservation(rightPath);
      return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
    });
  });
}

export function validateTransition(from, to, { allowTakeover = false } = {}) {
  if (!STATES.has(from) || !STATES.has(to)) return `Unknown task state transition ${from} → ${to}`;
  if (from === to) return null;
  if (allowTakeover && to === 'CLAIMED' && !['MERGED', 'MAIN_VERIFIED', 'DONE'].includes(from)) {
    return null;
  }
  if (!TRANSITIONS.get(from)?.has(to)) return `Task transition ${from} → ${to} is not allowed`;
  return null;
}

export function isLeaseActive(state, now = new Date()) {
  return isoDate(state?.lease?.expiresAt) && Date.parse(state.lease.expiresAt) > now.getTime();
}
