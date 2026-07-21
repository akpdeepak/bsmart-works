#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import {
  extractJsonMarker,
  isLeaseActive,
  pathsOverlap,
  validateTaskState,
  validateTransition,
} from './lib/task-contract.mjs';

const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
const eventPath = process.env.GITHUB_EVENT_PATH;
if (!token || !repository) {
  console.error('GITHUB_TOKEN and GITHUB_REPOSITORY are required.');
  process.exit(2);
}

const api = `https://api.github.com/repos/${repository}`;
const headers = {
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'X-GitHub-Api-Version': '2022-11-28',
};
async function request(path, options = {}) {
  const response = await fetch(`${api}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers ?? {}) },
  });
  if (options.allow404 && response.status === 404) return null;
  if (!response.ok) throw new Error(`${options.method ?? 'GET'} ${path}: ${response.status} ${await response.text()}`);
  if (response.status === 204) return null;
  return response.json();
}
async function requestAll(path) {
  const items = [];
  let page = 1;
  while (true) {
    const separator = path.includes('?') ? '&' : '?';
    const batch = await request(`${path}${separator}per_page=100&page=${page}`);
    items.push(...batch);
    if (batch.length < 100) return items;
    page += 1;
  }
}
async function ensureLabel(name, color, description) {
  const encoded = encodeURIComponent(name);
  const existing = await request(`/labels/${encoded}`, { allow404: true });
  if (!existing) {
    await request('/labels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color, description }),
    });
  }
}
async function postComment(issueNumber, body) {
  await request(`/issues/${issueNumber}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  });
}
async function comments(issueNumber) {
  return requestAll(`/issues/${issueNumber}/comments`);
}
function latestStateFromComments(items, excludedId = null) {
  for (const comment of [...items].reverse()) {
    if (comment.id === excludedId) continue;
    try {
      const state = extractJsonMarker(comment.body ?? '', 'bsmart-task-state');
      if (state) return state;
    } catch {
      // An invalid older comment is not an active lease; its own workflow run reports the error.
    }
  }
  return null;
}
async function replaceManagedLabels(issueNumber, desired) {
  const issue = await request(`/issues/${issueNumber}`);
  const current = issue.labels.map((label) => typeof label === 'string' ? label : label.name);
  const unmanaged = current.filter((label) => !label.startsWith('agent:') && !label.startsWith('state:'));
  await request(`/issues/${issueNumber}/labels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ labels: [...new Set([...unmanaged, ...desired])] }),
  });
}
async function expireLeases() {
  const issues = await requestAll('/issues?state=open&labels=agent%3Aclaimed');
  await ensureLabel('agent:available', 'bfdadc', 'No active AI writer lease');
  await ensureLabel('state:ready', '0e8a16', 'Ready to be claimed');
  for (const issue of issues.filter((item) => !item.pull_request)) {
    const state = latestStateFromComments(await comments(issue.number));
    if (state && !isLeaseActive(state)) {
      await replaceManagedLabels(issue.number, ['agent:available', 'state:ready']);
      await postComment(issue.number, 'The previous AI writer lease expired. Fetch the latest branch and record a takeover state before continuing.');
    }
  }
}

if (process.argv.includes('--expire')) {
  await expireLeases();
  console.log('OK — expired lease scan completed.');
  process.exit(0);
}

if (!eventPath) {
  console.error('GITHUB_EVENT_PATH is required for issue-comment coordination.');
  process.exit(2);
}
const event = JSON.parse(readFileSync(eventPath, 'utf8'));
const issueNumber = event.issue?.number;
const commentBody = event.comment?.body ?? '';
if (!issueNumber || !commentBody.includes('bsmart-task-state')) {
  console.log('No machine-readable task state in this event.');
  process.exit(0);
}

let state;
try {
  state = extractJsonMarker(commentBody, 'bsmart-task-state');
} catch (error) {
  await postComment(issueNumber, `Task state rejected: ${error.message}`);
  process.exit(1);
}
const failures = validateTaskState(state);
if (state.task !== `GH-${issueNumber}`) failures.push(`task must match GH-${issueNumber}`);

const prior = latestStateFromComments(await comments(issueNumber), event.comment.id);
if (prior) {
  const transitionFailure = validateTransition(prior.state, state.state, {
    allowTakeover: state.state === 'CLAIMED' && !isLeaseActive(prior),
  });
  if (transitionFailure) failures.push(transitionFailure);
}
if (failures.length) {
  await ensureLabel('agent:conflict', 'd73a4a', 'Task coordination or lease conflict');
  await replaceManagedLabels(issueNumber, ['agent:conflict', `state:${state.state.toLowerCase()}`]);
  await postComment(issueNumber, `Task state rejected:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

if (isLeaseActive(state) && !['DONE', 'MERGED', 'MAIN_VERIFIED'].includes(state.state)) {
  const activeIssues = await requestAll('/issues?state=open&labels=agent%3Aclaimed');
  const conflicts = [];
  for (const issue of activeIssues.filter((item) => !item.pull_request && item.number !== issueNumber)) {
    const other = latestStateFromComments(await comments(issue.number));
    if (other && isLeaseActive(other) && pathsOverlap(state.reservedPaths, other.reservedPaths ?? [])) {
      conflicts.push(`GH-${issue.number} (${other.owner?.app ?? 'unknown'} / ${other.git?.branch ?? 'unknown'})`);
    }
  }
  if (conflicts.length) {
    await ensureLabel('agent:conflict', 'd73a4a', 'Task coordination or lease conflict');
    await replaceManagedLabels(issueNumber, ['agent:conflict', `state:${state.state.toLowerCase()}`]);
    await postComment(issueNumber, `Lease rejected because reserved paths overlap: ${conflicts.join(', ')}`);
    process.exit(1);
  }
}

const stateLabel = `state:${state.state.toLowerCase()}`;
await ensureLabel(stateLabel, '1d76db', `Machine-readable task state: ${state.state}`);
if (['DONE', 'MERGED', 'MAIN_VERIFIED'].includes(state.state)) {
  await ensureLabel('agent:available', 'bfdadc', 'No active AI writer lease');
  await replaceManagedLabels(issueNumber, ['agent:available', stateLabel]);
} else if (isLeaseActive(state)) {
  await ensureLabel('agent:claimed', 'fbca04', 'Active AI writer lease');
  await replaceManagedLabels(issueNumber, ['agent:claimed', stateLabel]);
} else {
  await ensureLabel('agent:available', 'bfdadc', 'No active AI writer lease');
  await replaceManagedLabels(issueNumber, ['agent:available', stateLabel]);
}
console.log(`OK — accepted ${state.task} state ${state.state}.`);
