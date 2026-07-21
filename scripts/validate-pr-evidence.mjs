#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { extractJsonMarker, validatePrEvidence } from './lib/task-contract.mjs';

const valueAfter = (flag) => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : null;
};
const eventPath = valueAfter('--event') ?? process.env.GITHUB_EVENT_PATH;
const bodyPath = valueAfter('--body-file');

let body = '';
let draft = false;
if (eventPath) {
  const event = JSON.parse(readFileSync(eventPath, 'utf8'));
  body = event.pull_request?.body ?? '';
  draft = event.pull_request?.draft === true;
} else if (bodyPath) {
  body = readFileSync(bodyPath, 'utf8');
} else {
  console.error('Usage: validate-pr-evidence.mjs --event <event.json> | --body-file <body.md>');
  process.exit(2);
}

if (draft && !process.argv.includes('--require-draft-complete')) {
  console.log('OK — draft PR may contain incomplete evidence; validation becomes blocking when ready.');
  process.exit(0);
}

let evidence;
try {
  evidence = extractJsonMarker(body, 'bsmart-pr-evidence');
} catch (error) {
  console.error(`BLOCK: ${error.message}`);
  process.exit(1);
}
if (!evidence) {
  console.error('BLOCK: PR body is missing the <!-- bsmart-pr-evidence ... --> JSON block.');
  process.exit(1);
}

const failures = validatePrEvidence(evidence);
for (const heading of ['## Summary', '## Scope', '## Validation']) {
  if (!body.includes(heading)) failures.push(`PR body is missing ${heading}`);
}
if (failures.length) {
  console.error(`BLOCK: PR evidence is incomplete:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`OK — PR evidence for ${evidence.task} maps acceptance criteria to validation.`);
