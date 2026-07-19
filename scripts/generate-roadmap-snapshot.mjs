#!/usr/bin/env node
import { writeFileSync, appendFileSync } from 'node:fs';
import { extractJsonMarker, isLeaseActive } from './lib/task-contract.mjs';

const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY ?? 'akpdeepak/bsmart-works';
if (!token) {
  console.error('GITHUB_TOKEN is required to generate live roadmap state.');
  process.exit(2);
}
const headers = {
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'X-GitHub-Api-Version': '2022-11-28',
};
async function get(path) {
  const response = await fetch(`https://api.github.com/repos/${repository}${path}`, { headers });
  if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`);
  return response.json();
}
async function getAll(path) {
  const items = [];
  let page = 1;
  while (true) {
    const separator = path.includes('?') ? '&' : '?';
    const batch = await get(`${path}${separator}per_page=100&page=${page}`);
    items.push(...batch);
    if (batch.length < 100) return items;
    page += 1;
  }
}
async function latestTaskState(issueNumber) {
  const comments = await getAll(`/issues/${issueNumber}/comments`);
  for (const comment of [...comments].reverse()) {
    try {
      const state = extractJsonMarker(comment.body ?? '', 'bsmart-task-state');
      if (state) return state;
    } catch {
      // Invalid task-state comments are rejected by their own workflow and omitted here.
    }
  }
  return null;
}

const issues = (await getAll('/issues?state=all&labels=agent-task'))
  .filter((issue) => !issue.pull_request);
const tasks = [];
for (const issue of issues) {
  const state = await latestTaskState(issue.number);
  tasks.push({
    number: issue.number,
    title: issue.title,
    url: issue.html_url,
    githubState: issue.state,
    state: state?.state ?? 'READY',
    owner: state?.owner ?? null,
    leaseActive: state ? isLeaseActive(state) : false,
    branch: state?.git?.branch ?? null,
    headSha: state?.git?.headSha ?? null,
    nextAction: state?.nextAction ?? null,
    updatedAt: issue.updated_at,
  });
}
const counts = Object.fromEntries(
  [...new Set(tasks.map((task) => task.state))].sort()
    .map((state) => [state, tasks.filter((task) => task.state === state).length]),
);
const snapshot = {
  schemaVersion: 1,
  repository,
  generatedAt: new Date().toISOString(),
  source: 'GitHub issues, task-state comments, pull requests, checks, and merge events',
  counts,
  active: tasks.filter((task) => task.githubState === 'open'),
  completed: tasks.filter((task) => task.githubState === 'closed').slice(0, 25),
};
const json = `${JSON.stringify(snapshot, null, 2)}\n`;
const outputIndex = process.argv.indexOf('--output');
if (outputIndex >= 0) writeFileSync(process.argv[outputIndex + 1], json);
else process.stdout.write(json);

if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = snapshot.active.map((task) =>
    `| [GH-${task.number}](${task.url}) | ${task.state} | ${task.owner?.app ?? '—'} | ${task.nextAction ?? '—'} |`,
  );
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `# bSmart Works live roadmap\n\nGenerated ${snapshot.generatedAt} from GitHub events.\n\n` +
      `| Task | State | Owner app | Next action |\n|---|---|---|---|\n${rows.join('\n') || '| — | — | — | No active tasks |'}\n`,
  );
}
