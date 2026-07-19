#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { extractJsonMarker } from './lib/task-contract.mjs';

const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
const eventPath = process.env.GITHUB_EVENT_PATH;
if (!token || !repository || !eventPath) {
  console.error('GITHUB_TOKEN, GITHUB_REPOSITORY, and GITHUB_EVENT_PATH are required.');
  process.exit(2);
}
const event = JSON.parse(readFileSync(eventPath, 'utf8'));
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
async function latestTaskState(issueNumber) {
  const comments = await requestAll(`/issues/${issueNumber}/comments`);
  for (const comment of [...comments].reverse()) {
    try {
      const state = extractJsonMarker(comment.body ?? '', 'bsmart-task-state');
      if (state) return state;
    } catch {
      // Invalid comments are ignored; the coordination workflow reports them separately.
    }
  }
  return null;
}
async function postState(issueNumber, state) {
  const body = `<!-- bsmart-task-state\n${JSON.stringify(state, null, 2)}\n-->`;
  await request(`/issues/${issueNumber}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  });
}
const taskNumber = (evidence) => Number(evidence.task.replace('GH-', ''));
const automationOwner = { app: 'github-actions', model: 'deterministic-closeout', runId: process.env.GITHUB_RUN_ID ?? 'unknown' };
const shortLease = () => {
  const heartbeatAt = new Date();
  return { heartbeatAt: heartbeatAt.toISOString(), expiresAt: new Date(heartbeatAt.getTime() + 60_000).toISOString() };
};
function completionState(pr, evidence, prior, state, nextAction) {
  return {
    protocol: 'bsmart-task/v1',
    task: evidence.task,
    state,
    owner: automationOwner,
    lease: shortLease(),
    git: {
      baseSha: pr.base?.sha ?? prior?.git?.baseSha ?? '0'.repeat(40),
      branch: pr.head?.ref ?? prior?.git?.branch ?? 'merged',
      headSha: pr.merge_commit_sha ?? pr.head?.sha ?? prior?.git?.headSha ?? '0'.repeat(40),
    },
    reservedPaths: prior?.reservedPaths ?? ['repository-closeout'],
    acceptance: prior?.acceptance ?? evidence.acceptance,
    validation: prior?.validation ?? evidence.validation,
    nextAction,
  };
}

async function recordMerged(pr) {
  const evidence = extractJsonMarker(pr.body ?? '', 'bsmart-pr-evidence');
  if (!evidence) return;
  const issueNumber = taskNumber(evidence);
  const prior = await latestTaskState(issueNumber);
  if (['MERGED', 'MAIN_VERIFIED', 'DONE'].includes(prior?.state)) return;
  await postState(issueNumber, completionState(pr, evidence, prior, 'MERGED', 'Wait for successful CI on main'));
}
async function recordMainVerified(pr, mainSha) {
  const evidence = extractJsonMarker(pr.body ?? '', 'bsmart-pr-evidence');
  if (!evidence) return;
  const issueNumber = taskNumber(evidence);
  let prior = await latestTaskState(issueNumber);
  if (!prior || prior.state === 'DONE') return;
  if (prior.state !== 'MERGED') {
    await recordMerged(pr);
    prior = await latestTaskState(issueNumber);
  }
  const verified = completionState(
    { ...pr, merge_commit_sha: mainSha },
    evidence,
    prior,
    'MAIN_VERIFIED',
    'Close task after recording successful main verification',
  );
  await postState(issueNumber, verified);
  await postState(issueNumber, { ...verified, state: 'DONE', nextAction: 'None — task completed on verified main' });
  await request(`/issues/${issueNumber}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: 'closed', state_reason: 'completed' }),
  });
}

if (event.pull_request?.merged) {
  await recordMerged(event.pull_request);
  console.log('OK — merged task state recorded.');
} else if (
  event.workflow_run?.name === 'CI' &&
  event.workflow_run?.conclusion === 'success' &&
  event.workflow_run?.head_branch === 'main'
) {
  const sha = event.workflow_run.head_sha;
  const pulls = await request(`/commits/${sha}/pulls`);
  for (const pr of pulls.filter((item) => item.merged_at)) await recordMainVerified(pr, sha);
  console.log('OK — successful main CI closeout recorded.');
} else {
  console.log('No closeout action required for this event.');
}
