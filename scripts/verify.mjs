#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { selectStepIds } from './lib/verification.mjs';

const ROOT = process.cwd();
const manifest = JSON.parse(readFileSync(join(ROOT, 'scripts/verification-manifest.json'), 'utf8'));
const valueAfter = (flag) => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : null;
};
const profile = valueAfter('--profile') ?? 'changed';
const explicitPaths = valueAfter('--paths');
const dryRun = process.argv.includes('--dry-run');

function gitOutput(args) {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}
function changedPaths() {
  if (explicitPaths) return explicitPaths.split(',').map((path) => path.trim()).filter(Boolean);
  const base = valueAfter('--base');
  const head = valueAfter('--head') ?? 'HEAD';
  if (base) return gitOutput(['diff', '--name-only', `${base}...${head}`]).split('\n').filter(Boolean);

  const status = gitOutput(['status', '--porcelain']);
  return status.split('\n').filter(Boolean).map((line) => {
    const path = line.slice(3);
    return path.includes(' -> ') ? path.split(' -> ').at(-1) : path;
  });
}

const paths = changedPaths();
const stepIds = selectStepIds(manifest, profile, paths);
const stepsById = new Map(manifest.steps.map((step) => [step.id, step]));
console.log(`Verification profile: ${profile}`);
console.log(`Changed paths: ${paths.length || 0}`);
console.log(`Steps: ${stepIds.join(', ')}`);
if (dryRun) process.exit(0);

let failures = 0;
for (const id of stepIds) {
  const step = stepsById.get(id);
  if (!step) {
    console.error(`Missing verification step definition: ${id}`);
    failures += 1;
    continue;
  }
  let command = step.command;
  if (process.platform === 'win32') command = command.replaceAll('./mvnw', 'mvnw.cmd');
  console.log(`\n▶ ${id}\n  ${command}`);
  const result = spawnSync(command, {
    cwd: ROOT,
    env: process.env,
    shell: true,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    failures += 1;
    console.error(`✗ ${id} failed with exit ${result.status ?? 'unknown'}`);
  } else {
    console.log(`✓ ${id}`);
  }
}

if (failures) {
  console.error(`\n${failures} verification step(s) failed.`);
  process.exit(1);
}
console.log(`\nAll ${stepIds.length} verification step(s) passed.`);
