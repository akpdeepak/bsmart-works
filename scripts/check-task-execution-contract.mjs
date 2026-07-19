#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const taskRules = readFileSync(
  join(root, 'ai-rules/rulebooks/05-TASK-EXECUTION.md'),
  'utf8',
);
const orchestrator = readFileSync(
  join(root, 'ai-rules/00-ORCHESTRATOR.md'),
  'utf8',
);
const prTemplate = readFileSync(
  join(root, '.github/pull_request_template.md'),
  'utf8',
);

const failures = [];
const requireContract = (condition, message) => {
  if (!condition) failures.push(message);
};

requireContract(
  !/skip stages 2[–-]3/i.test(taskRules),
  'Every work lane must retain a right-sized scope, plan, acceptance-criteria, and validation step.',
);
requireContract(
  /every task[\s\S]{0,400}written execution plan[\s\S]{0,400}acceptance criteria[\s\S]{0,200}validation plan/i
    .test(orchestrator),
  'The Orchestrator must summarize the universal scope/plan/acceptance/validation invariant.',
);
requireContract(
  /coding-related[\s\S]{0,300}RED[^\n]*GREEN[^\n]*REFACTOR/i.test(orchestrator),
  'The Orchestrator must summarize RED → GREEN → REFACTOR for coding-related changes.',
);

const planStart = taskRules.indexOf('### Mandatory execution plan');
const planEnd = taskRules.indexOf('## Stage 3', planStart);
const planBlock = planStart >= 0 && planEnd > planStart
  ? taskRules.slice(planStart, planEnd)
  : '';

requireContract(
  planBlock.includes('Every task') && planBlock.includes('before execution'),
  'RB-05 must require a written execution plan for every task before execution.',
);
for (const field of [
  'Scope and boundaries',
  'Execution steps',
  'Acceptance criteria',
  'Validation plan',
]) {
  requireContract(
    planBlock.includes(field),
    `The mandatory execution plan must contain "${field}".`,
  );
}

const tddStart = taskRules.indexOf('### Coding tasks — test-first TDD');
const tddEnd = taskRules.indexOf('## Stage 4', tddStart);
const tddBlock = tddStart >= 0 && tddEnd > tddStart
  ? taskRules.slice(tddStart, tddEnd)
  : '';
const red = tddBlock.indexOf('**RED');
const green = tddBlock.indexOf('**GREEN');
const refactor = tddBlock.indexOf('**REFACTOR');

requireContract(
  red >= 0 && green > red && refactor > green,
  'Coding work must define RED → GREEN → REFACTOR in that order.',
);
requireContract(
  /RED[\s\S]*write[\s\S]*test[\s\S]*before implementation code/i.test(tddBlock),
  'RED must require writing the test before implementation code.',
);
requireContract(
  /RED[\s\S]*run[\s\S]*expected fail/i.test(tddBlock),
  'RED must require running the test and observing the expected failure.',
);

for (const heading of [
  '## Plan, acceptance criteria & validation',
  '## Test-first evidence (coding changes)',
]) {
  requireContract(
    prTemplate.includes(heading),
    `The PR template must contain "${heading}".`,
  );
}
for (const evidence of [
  'Scope and boundaries',
  'Acceptance criteria',
  'Validation plan',
  'RED evidence',
  'GREEN evidence',
]) {
  requireContract(
    prTemplate.includes(evidence),
    `The PR template must request "${evidence}".`,
  );
}
requireContract(
  orchestrator.includes('scripts/check-task-execution-contract.mjs'),
  'The Orchestrator enforcement table must bind the task-execution contract to its check.',
);

if (failures.length > 0) {
  console.error('BLOCK: task-execution contract is incomplete:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log('OK: scope-first planning and test-first execution contract is present.');
