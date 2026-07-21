#!/usr/bin/env node
import { appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { classifyPaths } from './lib/verification.mjs';

const valueAfter = (flag) => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : null;
};
const base = valueAfter('--base');
const head = valueAfter('--head') ?? 'HEAD';
let paths = [];
if (valueAfter('--paths')) {
  paths = valueAfter('--paths').split(',').filter(Boolean);
} else if (base) {
  paths = execFileSync('git', ['diff', '--name-only', `${base}...${head}`], { encoding: 'utf8' })
    .trim().split('\n').filter(Boolean);
} else {
  paths = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' })
    .trim().split('\n').filter(Boolean).map((line) => line.slice(3));
}
const classification = classifyPaths(paths);
const outputs = {
  frontend: classification.domains.includes('frontend'),
  backend: classification.domains.includes('backend'),
  docs: classification.domains.includes('docs'),
  policy: classification.domains.includes('policy'),
  integration: classification.integration,
  frontend_security: classification.frontendSecurity,
  deploy: classification.deploy,
  jetbrains: classification.jetbrains,
  risk: classification.risk,
  paths: JSON.stringify(paths),
};
if (process.argv.includes('--github-output')) {
  if (!process.env.GITHUB_OUTPUT) throw new Error('GITHUB_OUTPUT is required');
  appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(outputs).map(([key, value]) => `${key}=${value}`).join('\n') + '\n');
} else {
  console.log(JSON.stringify({ ...classification, paths }, null, 2));
}
