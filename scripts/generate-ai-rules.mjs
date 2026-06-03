#!/usr/bin/env node
/*
 * Generates every per-tool AI instruction file from the canonical `ai-rules/` source.
 * The generated files are what the tools actually read; `ai-rules/` is the only thing you edit.
 *
 * Usage (run from the repo root):
 *   node scripts/generate-ai-rules.mjs            # (re)write all generated files
 *   node scripts/generate-ai-rules.mjs --check     # exit 1 if any generated file is stale (CI)
 *
 * It transforms, it does not copy: a short always-on core goes to the repo-wide slots,
 * and each rule book is emitted as a path-scoped slice for the tools that support globs.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'ai-rules');

// --- Adjust these two if the repo layout differs ---------------------------
const BACKEND_GLOB  = 'works-backend/**/*.java, works-backend/pom.xml, works-backend/src/main/resources/db/migration/**';
const FRONTEND_GLOB = 'works-frontend/**';
// ---------------------------------------------------------------------------

const read = (p) => readFileSync(join(SRC, p), 'utf8').trim();

const orchestrator  = read('00-ORCHESTRATOR.md');   // the always-on core
const sourceOfTruth = read('SOURCE-OF-TRUTH.md');
const rb = {
  '05': read('rulebooks/05-TASK-EXECUTION.md'),
  '10': read('rulebooks/10-ENGINEERING.md'),
  '20': read('rulebooks/20-PRODUCT.md'),
  '30': read('rulebooks/30-DESIGN.md'),
  '40': read('rulebooks/40-GOVERNANCE.md'),
};

const SEP = '\n\n---\n\n';
const FULL = [orchestrator, sourceOfTruth, rb['05'], rb['10'], rb['20'], rb['30'], rb['40']].join(SEP);

const header = (tool) =>
  `<!-- GENERATED FROM ai-rules/ — do not edit by hand.\n` +
  `     Edit the source in ai-rules/ and run: node scripts/generate-ai-rules.mjs\n` +
  `     This file is the ${tool} view of the same rules. -->\n\n`;

const mdc  = (desc) => `---\ndescription: ${desc}\nalwaysApply: true\n---\n\n`;
const inst = (applyTo) => `---\napplyTo: "${applyTo}"\n---\n\n`;

// path -> content
const outputs = {
  // Claude Code & cross-tool agents read a full root file (they handle large context)
  'CLAUDE.md':       header('Claude Code') + FULL + '\n',
  'AGENTS.md':       header('cross-tool AGENTS.md') + FULL + '\n',
  '.windsurfrules':  header('Windsurf') + FULL + '\n',

  // Cursor: always-on core
  '.cursor/rules/bsmart.mdc':
    mdc('bSmart Works core rules (orchestrator) — always applied') + header('Cursor') + orchestrator + '\n',

  // Copilot: SHORT repo-wide core (NOT the monolith) + path-scoped slices
  '.github/copilot-instructions.md':
    header('GitHub Copilot (repo-wide core)') + orchestrator + '\n',
  '.github/instructions/delivery-process.instructions.md':
    inst('**') + header('GitHub Copilot (task execution)') + rb['05'] + '\n',
  '.github/instructions/backend.instructions.md':
    inst(BACKEND_GLOB) + header('GitHub Copilot (backend)') + rb['10'] + '\n',
  '.github/instructions/frontend.instructions.md':
    inst(FRONTEND_GLOB) + header('GitHub Copilot (frontend/design)') + rb['30'] + '\n',
  '.github/instructions/product.instructions.md':
    inst('**') + header('GitHub Copilot (product)') + rb['20'] + '\n',
  '.github/instructions/governance.instructions.md':
    inst('**') + header('GitHub Copilot (governance/security)') + rb['40'] + '\n',
};

const check = process.argv.includes('--check');
const stale = [];
for (const [rel, content] of Object.entries(outputs)) {
  const abs = join(ROOT, rel);
  if (check) {
    const current = existsSync(abs) ? readFileSync(abs, 'utf8') : null;
    if (current !== content) stale.push(rel);
  } else {
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
    console.log('wrote', rel);
  }
}

if (check) {
  if (stale.length) {
    console.error('STALE — run `node scripts/generate-ai-rules.mjs` and commit:\n  ' + stale.join('\n  '));
    process.exit(1);
  }
  console.log('OK — all generated files are in sync with ai-rules/.');
}
