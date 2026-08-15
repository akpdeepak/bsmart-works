import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const bytes = (path) => Buffer.byteLength(read(path));
const lines = (path) => read(path).split('\n').length;

test('generated current state reflects executable repository facts', () => {
  const path = 'ai-rules/current-state.generated.json';
  assert.ok(existsSync(join(ROOT, path)), `${path} must be generated`);
  const state = JSON.parse(read(path));

  assert.equal(state.schemaVersion, 1);
  assert.equal(state.backend.springBoot, '4.1.0');
  assert.equal(state.backend.java, '21');
  assert.ok(state.backend.domainPackages.includes('auth'));
  const migrationVersions = readdirSync(join(ROOT, 'works-backend/src/main/resources/db/migration'))
    .map((name) => Number(name.match(/^V(\d+)__/)?.[1]))
    .filter(Number.isFinite);
  const flywayHighWater = Math.max(...migrationVersions);
  assert.equal(state.database.flywayHighWater, flywayHighWater);
  assert.equal(state.database.nextMigration, flywayHighWater + 1);
  assert.match(state.sourceDigest, /^[0-9a-f]{64}$/);
});

test('provider instruction outputs are compact, scoped, and complete', () => {
  const required = [
    'AGENTS.md',
    'CLAUDE.md',
    'works-backend/AGENTS.md',
    'works-frontend/AGENTS.md',
    'docs/AGENTS.md',
    '.claude/rules/backend.md',
    '.claude/rules/frontend.md',
    '.claude/rules/governance.md',
    '.agents/rules/core.md',
    '.agents/rules/backend.md',
    '.agents/rules/frontend.md',
    '.agents/rules/governance.md',
    '.cursor/rules/backend.mdc',
    '.cursor/rules/frontend.mdc',
  ];

  for (const path of required) {
    assert.ok(existsSync(join(ROOT, path)), `missing generated provider file: ${path}`);
  }

  assert.ok(bytes('AGENTS.md') <= 12_288, 'root AGENTS.md exceeds the 12 KiB project budget');
  assert.ok(lines('AGENTS.md') <= 120, 'root AGENTS.md exceeds 120 lines');
  assert.ok(lines('CLAUDE.md') <= 40, 'root CLAUDE.md must be an import plus Claude-specific notes');
  assert.match(read('CLAUDE.md'), /^@AGENTS\.md/m);

  for (const path of required.filter((path) => path.startsWith('.agents/rules/'))) {
    assert.ok(bytes(path) <= 12_000, `${path} exceeds Antigravity's 12,000-character rule limit`);
  }
  const gitignore = read('.gitignore');
  assert.doesNotMatch(gitignore, /^\.claude\/$/m);
  assert.match(gitignore, /!\.claude\/rules\//);
});

test('policy registry distinguishes automated, review, and target-state controls', () => {
  const registry = JSON.parse(read('ai-rules/policy-registry.json'));
  const allowed = new Set(['auto-block', 'auto-warn', 'required-review', 'target-state']);

  assert.equal(registry.schemaVersion, 1);
  assert.ok(registry.rules.length >= 8);
  for (const rule of registry.rules) {
    assert.match(rule.id, /^BSW-[A-Z]+-[0-9]{3}$/);
    assert.ok(allowed.has(rule.enforcement), `${rule.id} has invalid enforcement`);
    assert.ok(rule.source);
    if (rule.enforcement === 'auto-block') assert.ok(rule.check, `${rule.id} needs a blocking check`);
  }
});

test('task state validates required resumability fields', async () => {
  const { validateTaskState } = await import('../lib/task-contract.mjs');
  const state = {
    protocol: 'bsmart-task/v1',
    task: 'GH-487',
    state: 'GREEN',
    owner: { app: 'codex', model: 'gpt-5', runId: 'run-1' },
    lease: {
      heartbeatAt: '2026-07-19T10:00:00.000Z',
      expiresAt: '2026-07-19T12:00:00.000Z',
    },
    git: {
      baseSha: 'a'.repeat(40),
      branch: 'feat/gh-487-attention',
      headSha: 'b'.repeat(40),
    },
    reservedPaths: ['works-frontend/src/features/today/**'],
    acceptance: [{ id: 'AC-1', status: 'passed', evidence: 'TodayView.test.jsx' }],
    validation: [{ command: 'npm test', status: 'passed', evidence: 'run-1' }],
    nextAction: 'Request review',
  };

  assert.deepEqual(validateTaskState(state), []);
  assert.ok(validateTaskState({ protocol: 'bsmart-task/v1' }).length >= 6);
});

test('path reservation overlap is conservative and deterministic', async () => {
  const { pathsOverlap } = await import('../lib/task-contract.mjs');

  assert.equal(
    pathsOverlap(
      ['works-backend/src/main/java/com/bcits/works/auth/**'],
      ['works-backend/src/main/java/com/bcits/works/auth/AuthController.java'],
    ),
    true,
  );
  assert.equal(
    pathsOverlap(
      ['works-backend/src/main/java/com/bcits/works/auth/**'],
      ['works-frontend/src/**'],
    ),
    false,
  );
});

test('task markers parse and state transitions reject unsafe jumps', async () => {
  const { extractJsonMarker, validateTransition } = await import('../lib/task-contract.mjs');
  const body = '<!-- bsmart-task-state\n{"protocol":"bsmart-task/v1","state":"CLAIMED"}\n-->';
  assert.equal(extractJsonMarker(body, 'bsmart-task-state').state, 'CLAIMED');
  assert.equal(validateTransition('READY', 'CLAIMED'), null);
  assert.equal(validateTransition('RED', 'GREEN'), null);
  assert.match(validateTransition('CLAIMED', 'MERGED'), /not allowed/);
  assert.equal(validateTransition('GREEN', 'CLAIMED', { allowTakeover: true }), null);
  assert.match(validateTransition('DONE', 'CLAIMED', { allowTakeover: true }), /not allowed/);
});

test('PR evidence enforces acceptance-to-validation and TDD mappings', async () => {
  const { validatePrEvidence } = await import('../lib/task-contract.mjs');
  const evidence = {
    protocol: 'bsmart-pr/v1',
    task: 'GH-487',
    planUrl: 'https://github.com/akpdeepak/bsmart-works/issues/487',
    acceptance: [{ id: 'AC-1', evidence: ['TEST-1'] }],
    validation: [{ id: 'TEST-1', command: 'npm test', status: 'passed' }],
    tdd: {
      applicable: true,
      red: { command: 'npm test', evidence: 'expected failure' },
      green: { command: 'npm test', evidence: 'passed' },
      finalGreen: { command: 'npm test', evidence: 'passed after refactor' },
    },
  };

  assert.deepEqual(validatePrEvidence(evidence), []);
  assert.ok(validatePrEvidence({ ...evidence, validation: [] }).length > 0);
});

test('backend guardrails discover controllers recursively', () => {
  const guardrails = read('scripts/guardrails.sh');
  assert.match(guardrails, /find "\$BE"[^\n]+-name '\*Controller\.java'/);
  assert.doesNotMatch(guardrails, /"\$BE"\/\*Controller\.java/);
});

test('transaction boundaries stay out of every controller package', () => {
  const root = join(ROOT, 'works-backend/src/main/java');
  const pending = [root];
  const violations = [];
  while (pending.length) {
    const dir = pending.pop();
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) pending.push(path);
      else if (entry.name.endsWith('Controller.java') && /@Transactional/.test(readFileSync(path, 'utf8'))) {
        violations.push(path.slice(ROOT.length + 1));
      }
    }
  }
  assert.deepEqual(violations, []);
});

test('verification manifest has non-overlapping integration selectors', () => {
  const manifest = JSON.parse(read('scripts/verification-manifest.json'));
  const selectors = manifest.steps
    .filter((step) => step.kind === 'backend-integration')
    .flatMap((step) => step.selectors ?? []);
  assert.equal(new Set(selectors).size, selectors.length, 'integration selectors are duplicated');
  assert.ok(manifest.profiles.changed.length > 0);
  assert.ok(manifest.profiles.full.length > manifest.profiles.changed.length);
  assert.ok(manifest.profiles.release.includes('deploy-artifact-verification'));
});

test('changed-path classification selects only impacted verification domains', async () => {
  const { classifyPaths, selectStepIds } = await import('../lib/verification.mjs');
  const manifest = JSON.parse(read('scripts/verification-manifest.json'));

  assert.deepEqual(classifyPaths(['docs/README.md']).domains, ['docs']);
  const frontend = classifyPaths(['works-frontend/src/app.jsx']);
  assert.ok(frontend.domains.includes('frontend'));
  assert.equal(frontend.integration, false);
  const migration = classifyPaths([
    'works-backend/src/main/resources/db/migration/V120__example.sql',
  ]);
  assert.ok(migration.domains.includes('backend'));
  assert.equal(migration.integration, true);
  assert.equal(migration.risk, 'large');

  const docsSteps = selectStepIds(manifest, 'changed', ['docs/README.md']);
  assert.ok(docsSteps.includes('docs-links'));
  assert.ok(!docsSteps.includes('frontend-build'));
  assert.ok(!docsSteps.includes('backend-unit'));
  const backendSteps = selectStepIds(manifest, 'changed', ['works-backend/src/main/java/App.java']);
  assert.ok(backendSteps.includes('backend-unit'));
  const generatedRules = classifyPaths([
    'works-backend/AGENTS.md',
    'works-frontend/CLAUDE.md',
  ]);
  assert.deepEqual(generatedRules.domains, ['policy']);
  const deploy = classifyPaths(['.github/workflows/deploy.yml']);
  assert.equal(deploy.integration, false);
  const deploySteps = selectStepIds(manifest, 'changed', ['.github/workflows/deploy.yml']);
  assert.ok(deploySteps.includes('deploy-config'));
  assert.ok(!deploySteps.includes('deploy-artifact-verification'));
});

test('CI has one integration job and one stable merge gate', () => {
  const workflow = read('.github/workflows/ci.yml');
  assert.equal((workflow.match(/^  backend-integration:/gm) ?? []).length, 1);
  assert.equal((workflow.match(/^  integration-tests:/gm) ?? []).length, 0);
  assert.equal((workflow.match(/^  merge-gate:/gm) ?? []).length, 1);
  assert.match(workflow, /name: merge-gate/);
  assert.match(workflow, /classify-changes\.mjs/);
});

test('one manifest-driven verifier owns changed, full, and release profiles', () => {
  const verifier = read('scripts/verify.mjs');
  const packageJson = JSON.parse(read('package.json'));
  const legacyShell = read('scripts/verify.sh');
  assert.match(verifier, /verification-manifest\.json/);
  assert.match(verifier, /selectStepIds/);
  assert.equal(packageJson.scripts.verify, 'node scripts/verify.mjs --profile changed');
  assert.match(legacyShell, /node scripts\/verify\.mjs/);
  assert.match(read('scripts/verification-manifest.json'), /bash scripts\/run-e2e\.sh/);
  assert.match(read('scripts/run-e2e.sh'), /trap cleanup EXIT/);
  assert.match(read('works-frontend/vite.config.js'), /process\.env\.VITE_PROXY_TARGET/);
});

test('unified verification preserves product-quality and completed-EPIC gates', () => {
  const manifest = read('scripts/verification-manifest.json');
  const ci = read('.github/workflows/ci.yml');
  for (const script of [
    'quality-gates.mjs',
    'uiux-premium-bar.mjs',
    'uiux-end-to-end-scope.mjs',
    'epics-01-05-completion.mjs',
    'epic-06-completion.mjs',
    'epic-07-completion.mjs',
    'epic-08-completion.mjs',
  ]) {
    assert.match(manifest, new RegExp(script.replaceAll('.', '\\.')));
  }
  assert.match(ci, /node scripts\/verify\.mjs --profile changed/);
});

test('GitHub task and PR workflows execute the real contract validators', () => {
  const taskTemplate = read('.github/ISSUE_TEMPLATE/ai-task.yml');
  const coordination = read('.github/workflows/agent-coordination.yml');
  const prContract = read('.github/workflows/pr-contract.yml');
  const prTemplate = read('.github/pull_request_template.md');

  assert.match(taskTemplate, /name: AI task contract/);
  assert.match(taskTemplate, /reserved paths/i);
  assert.match(coordination, /github-task-coordinator\.mjs/);
  assert.match(coordination, /issue_comment:/);
  assert.match(coordination, /schedule:/);
  assert.match(prContract, /validate-pr-evidence\.mjs/);
  assert.match(prContract, /pull_request:/);
  assert.match(prTemplate, /<!-- bsmart-pr-evidence/);
  assert.doesNotMatch(prTemplate, /\[ \] New list endpoints/);
});

test('live roadmap state is GitHub-derived and historical guides are lifecycle-labelled', () => {
  const roadmapState = read('docs/implementation/ROADMAP-STATE.md');
  const currentState = read('CURRENT-STATE.md');
  const principles = read('docs/ENGINEERING-PRINCIPLES.md');
  const refactorPrompt = read('docs/REFACTOR_PROMPT.md');
  const transformation = read('docs/implementation/BSMART-TRANSFORMATION-ROADMAP.md');
  const sourceGuide = read('docs/implementation/source-documents/bSmart_Works_AI_Agent_Implementation_Instructions.md');
  const workflow = read('.github/workflows/roadmap-snapshot.yml');

  assert.match(roadmapState, /status: generated-view/);
  assert.doesNotMatch(roadmapState, /pending GitHub CI/);
  assert.match(currentState, /ai-rules\/current-state\.generated\.json/);
  assert.doesNotMatch(currentState, /V109/);
  assert.match(principles, /ai-rules\/.*canonical/);
  assert.doesNotMatch(principles, /CLAUDE\.md.*canonical/);
  assert.match(refactorPrompt, /status: historical/);
  assert.match(sourceGuide, /status: historical/);
  assert.doesNotMatch(transformation, /C:\\Users\\user\\Downloads/);
  assert.match(workflow, /generate-roadmap-snapshot\.mjs/);
  assert.match(read('scripts/generate-roadmap-snapshot.mjs'), /page \+= 1/);
});

test('merged task closeout is automated from PR and main CI events', () => {
  const workflow = read('.github/workflows/task-closeout.yml');
  const script = read('scripts/github-task-closeout.mjs');
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /workflow_run:/);
  assert.match(script, /MAIN_VERIFIED/);
  assert.match(script, /bsmart-pr-evidence/);
  assert.match(script, /issues\/.+comments/);
  assert.match(script, /page \+= 1/);
});

test('coverage gate measures business services', () => {
  const pom = read('works-backend/pom.xml');
  assert.match(pom, /<id>jacoco-service-check<\/id>[\s\S]*<include>\*\*\/\*Service\.class<\/include>/);
  assert.match(pom, /<id>jacoco-service-check<\/id>[\s\S]*<minimum>0\.48<\/minimum>/);
});

test('Mockito uses an explicit test JVM agent instead of nondeterministic self-attachment', () => {
  const pom = read('works-backend/pom.xml');
  assert.match(pom, /<artifactId>byte-buddy-agent<\/artifactId>/);
  assert.match(pom, /<argLine>@\{argLine\} -javaagent:[^<]*byte-buddy-agent/);
});

test('deployment accepts immutable release tags, tests artifacts, and requires health checks', () => {
  const deploy = read('.github/workflows/deploy.yml');
  assert.match(deploy, /release_tag:/);
  assert.match(deploy, /\^v\[0-9\]/);
  assert.doesNotMatch(deploy, /-DskipTests/);
  assert.match(deploy, /require BACKEND_HEALTH_URL/);
  assert.match(deploy, /require FRONTEND_HEALTH_URL/);
  assert.doesNotMatch(deploy, /HEALTH_URL != ''/);
});

test('load tests obtain credentials from environment secrets, never workflow inputs', () => {
  const workflow = read('.github/workflows/load-test.yml');
  assert.doesNotMatch(workflow, /^      auth_token:/m);
  assert.match(workflow, /secrets\.LOAD_TEST_AUTH_TOKEN/);
  assert.doesNotMatch(workflow, /inputs\.auth_token/);
});

test('third-party workflow actions and downloaded tools are integrity pinned', () => {
  for (const name of readdirSync(join(ROOT, '.github/workflows')).filter((name) => name.endsWith('.yml'))) {
    const workflow = read(`.github/workflows/${name}`);
    for (const match of workflow.matchAll(/uses:\s+([^\s]+)@([^\s#]+)/g)) {
      if (!match[1].startsWith('./')) {
        assert.match(match[2], /^[0-9a-f]{40}$/, `${name}: ${match[1]} must use an immutable SHA`);
      }
    }
  }
  const load = read('.github/workflows/load-test.yml');
  assert.match(load, /k6-v0\.54\.0-linux-amd64\.tar\.gz[\s\S]*sha256sum -c/);
  const ci = read('.github/workflows/ci.yml');
  assert.match(ci, /gitleaks_\$\{version\}_linux_x64\.tar\.gz[\s\S]*sha256sum -c/);
});

test('every Node-based workflow uses the canonical Node 22 runtime', () => {
  for (const name of readdirSync(join(ROOT, '.github/workflows')).filter((name) => name.endsWith('.yml'))) {
    const workflow = read(`.github/workflows/${name}`);
    for (const match of workflow.matchAll(/node-version:\s*['"]?([^'"\s]+)['"]?/g)) {
      assert.equal(match[1], '22', `${name}: expected Node 22, found ${match[1]}`);
    }
  }
});
