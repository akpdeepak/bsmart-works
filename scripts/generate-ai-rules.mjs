#!/usr/bin/env node
/*
 * Generates compact, provider-native AI instruction projections from `ai-rules/`.
 * Canonical policy remains in `ai-rules/`; generated files are never authoritative.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'ai-rules');
const read = (path) => readFileSync(join(SRC, path), 'utf8').trim();
const core = read('AGENT-CORE.md');
const rb = {
  delivery: read('rulebooks/05-TASK-EXECUTION.md'),
  engineering: read('rulebooks/10-ENGINEERING.md'),
  product: read('rulebooks/20-PRODUCT.md'),
  design: read('rulebooks/30-DESIGN.md'),
  governance: read('rulebooks/40-GOVERNANCE.md'),
};

const header = (tool) =>
  `<!-- GENERATED FROM ai-rules/ — do not edit by hand.\n` +
  `     Run: node scripts/generate-ai-rules.mjs\n` +
  `     Provider projection: ${tool}. -->\n\n`;
const joinRules = (...parts) => `${parts.join('\n\n---\n\n')}\n`;
const claudeRule = (paths, content) =>
  `---\npaths:\n${paths.map((path) => `  - "${path}"`).join('\n')}\n---\n\n${content}\n`;
const cursorRule = (description, globs, content, alwaysApply = false) =>
  `---\ndescription: ${description}\nglobs: ${globs || '""'}\nalwaysApply: ${alwaysApply}\n---\n\n${content}\n`;
const copilotRule = (applyTo, content) => `---\napplyTo: "${applyTo}"\n---\n\n${content}\n`;
const scopedIntro = (domain, source) =>
  `# ${domain}\n\nCanonical detail: \`${source}\`. These rules apply only when this domain is in scope.`;
const deliverySummary = `# Task execution\n\nFor every task, record bounded scope, ordered steps, acceptance criteria, and validation before execution. Coding work uses RED → GREEN → REFACTOR. Repository changes use a linked GitHub task and PR; high-risk data, security, tenant, RBAC, AI, or irreversible migration work requires the documented checkpoint. Canonical detail: \`ai-rules/rulebooks/05-TASK-EXECUTION.md\`.`;

const outputs = {
  'AGENTS.md': header('Codex and cross-tool root') + core + '\n',
  'CLAUDE.md':
    `@AGENTS.md\n\n` +
    `## Claude Code\n\n` +
    `Use the path-scoped rules in \`.claude/rules/\`. Treat instructions as guidance; repository hooks and CI are the enforcement layer.\n`,
  '.windsurfrules': header('Windsurf root') + core + '\n',

  'works-backend/AGENTS.md': header('Codex backend scope') + joinRules(
    scopedIntro('Backend rules', 'ai-rules/rulebooks/10-ENGINEERING.md'),
    rb.engineering,
    rb.governance,
  ),
  'works-frontend/AGENTS.md': header('Codex frontend scope') + joinRules(
    scopedIntro('Frontend rules', 'ai-rules/rulebooks/30-DESIGN.md'),
    rb.design,
    deliverySummary,
  ),
  'docs/AGENTS.md': header('Codex documentation scope') + joinRules(
    scopedIntro('Documentation and product rules', 'ai-rules/rulebooks/20-PRODUCT.md'),
    rb.product,
    deliverySummary,
  ),
  'works-backend/CLAUDE.md': '@AGENTS.md\n',
  'works-frontend/CLAUDE.md': '@AGENTS.md\n',
  'docs/CLAUDE.md': '@AGENTS.md\n',

  '.claude/rules/delivery.md': claudeRule(
    ['ai-rules/**', '.github/**', 'scripts/**', 'docs/implementation/**'],
    deliverySummary,
  ),
  '.claude/rules/backend.md': claudeRule(
    ['works-backend/**/*.java', 'works-backend/pom.xml', 'works-backend/src/main/resources/db/migration/**'],
    rb.engineering,
  ),
  '.claude/rules/frontend.md': claudeRule(['works-frontend/**'], rb.design),
  '.claude/rules/governance.md': claudeRule(
    ['works-backend/src/main/java/**/*Security*.java', 'works-backend/src/main/java/**/auth/**', 'works-backend/src/main/resources/db/migration/**'],
    rb.governance,
  ),

  '.agents/README.md':
    '# Google Antigravity workspace rules\n\n' +
    'Configure `rules/core.md` as **Always On**. Configure backend, frontend, governance, and delivery as **Model Decision** or with the matching workspace globs. Each generated rule remains below Antigravity’s 12,000-character limit.\n',
  '.agents/rules/core.md': header('Google Antigravity — Always On') + core + '\n',
  '.agents/rules/delivery.md': header('Google Antigravity — Model Decision') + deliverySummary + '\n',
  '.agents/rules/backend.md': header('Google Antigravity — backend Glob') + rb.engineering + '\n',
  '.agents/rules/frontend.md': header('Google Antigravity — frontend Glob') + rb.design + '\n',
  '.agents/rules/governance.md': header('Google Antigravity — governance Model Decision') + rb.governance + '\n',

  '.cursor/rules/bsmart.mdc': cursorRule('bSmart Works compact core', '', core, true),
  '.cursor/rules/backend.mdc': cursorRule(
    'Backend engineering rules',
    'works-backend/**/*.java,works-backend/pom.xml,works-backend/src/main/resources/db/migration/**',
    rb.engineering,
  ),
  '.cursor/rules/frontend.mdc': cursorRule('Frontend and design rules', 'works-frontend/**', rb.design),
  '.cursor/rules/governance.mdc': cursorRule(
    'Governance, tenant, security, and AI rules',
    'works-backend/src/main/java/**/auth/**,works-backend/src/main/resources/db/migration/**',
    rb.governance,
  ),

  '.github/copilot-instructions.md': header('GitHub Copilot compact root') + core + '\n',
  '.github/instructions/delivery-process.instructions.md': copilotRule(
    'ai-rules/**,.github/**,scripts/**,docs/implementation/**',
    deliverySummary,
  ),
  '.github/instructions/backend.instructions.md': copilotRule(
    'works-backend/**/*.java,works-backend/pom.xml,works-backend/src/main/resources/db/migration/**',
    rb.engineering,
  ),
  '.github/instructions/frontend.instructions.md': copilotRule('works-frontend/**', rb.design),
  '.github/instructions/product.instructions.md': copilotRule(
    'docs/implementation/**,docs/product/**,README.md',
    rb.product,
  ),
  '.github/instructions/governance.instructions.md': copilotRule(
    'works-backend/src/main/java/**/auth/**,works-backend/src/main/resources/db/migration/**,SECURITY.md',
    rb.governance,
  ),
};

const failures = [];
const assertBudget = (condition, message) => {
  if (!condition) failures.push(message);
};
assertBudget(Buffer.byteLength(outputs['AGENTS.md']) <= 12_288, 'AGENTS.md exceeds 12 KiB');
assertBudget(outputs['AGENTS.md'].split('\n').length <= 120, 'AGENTS.md exceeds 120 lines');
assertBudget(outputs['CLAUDE.md'].split('\n').length <= 40, 'CLAUDE.md exceeds 40 lines');
for (const [path, content] of Object.entries(outputs)) {
  if (path.startsWith('.agents/rules/')) {
    assertBudget(content.length <= 12_000, `${path} exceeds 12,000 characters`);
  }
}
if (failures.length) {
  console.error(`AI instruction generation failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

const check = process.argv.includes('--check');
const stale = [];
for (const [relativePath, content] of Object.entries(outputs)) {
  const absolutePath = join(ROOT, relativePath);
  if (check) {
    const current = existsSync(absolutePath) ? readFileSync(absolutePath, 'utf8') : null;
    if (current !== content) stale.push(relativePath);
  } else {
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, content);
    console.log(`wrote ${relativePath}`);
  }
}

if (check) {
  if (stale.length) {
    console.error(`STALE — run \`node scripts/generate-ai-rules.mjs\` and commit:\n  ${stale.join('\n  ')}`);
    process.exit(1);
  }
  console.log('OK — provider instruction projections are synchronized and within budget.');
}
