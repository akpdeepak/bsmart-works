#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const core = read('ai-rules/AGENT-CORE.md');
const registry = JSON.parse(read('ai-rules/policy-registry.json'));
const issue = read('.github/ISSUE_TEMPLATE/ai-task.yml');
const pr = read('.github/pull_request_template.md');
const coordination = read('.github/workflows/agent-coordination.yml');
const prContract = read('.github/workflows/pr-contract.yml');
const failures = [];
const require = (condition, message) => { if (!condition) failures.push(message); };

require(/every task/i.test(core) && /acceptance criteria/i.test(core) && /validation/i.test(core),
  'AGENT-CORE must require a plan, acceptance criteria, and validation for every task.');
require(/RED[\s\S]*GREEN[\s\S]*REFACTOR/i.test(core),
  'AGENT-CORE must preserve RED → GREEN → REFACTOR order.');
require(registry.rules.some((rule) => rule.id === 'BSW-TASK-001'),
  'Policy registry must contain the universal task-contract policy.');
require(registry.rules.some((rule) => rule.id === 'BSW-TDD-001'),
  'Policy registry must contain the coding TDD policy.');
require(/reserved paths/i.test(issue), 'AI task issue template must reserve paths.');
require(/bsmart-pr-evidence/.test(pr), 'PR template must carry bsmart-pr/v1 evidence.');
require(/github-task-coordinator\.mjs/.test(coordination), 'Task workflow must execute its validator.');
require(/validate-pr-evidence\.mjs/.test(prContract), 'PR workflow must execute its validator.');

if (failures.length) {
  console.error('BLOCK: task execution policy shape is incomplete:');
  failures.forEach((failure) => console.error(`  - ${failure}`));
  process.exit(1);
}
console.log('OK — task planning, TDD, coordination, and PR evidence contracts are connected.');
