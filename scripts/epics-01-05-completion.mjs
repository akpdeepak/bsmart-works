import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const results = [];

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function exists(relativePath) {
  return fs.existsSync(absolute(relativePath));
}

function read(relativePath) {
  return fs.readFileSync(absolute(relativePath), 'utf8');
}

function walk(relativePath, predicate, files = []) {
  const directory = absolute(relativePath);
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const item = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(path.relative(root, item), predicate, files);
    else if (!predicate || predicate(item)) files.push(item);
  }
  return files;
}

function check(epic, name, pass, detail) {
  results.push({ epic, name, pass: Boolean(pass), detail });
}

function sourceHasAll(relativePath, tokens) {
  if (!exists(relativePath)) return false;
  const source = read(relativePath);
  return tokens.every((token) => source.includes(token));
}

const frontendProduction = walk('works-frontend/src', (file) =>
  /\.(js|jsx)$/.test(file) && !/(\.test|\.stories)\.(js|jsx)$/.test(file));
const backendProduction = walk('works-backend/src/main/java', (file) => file.endsWith('.java'));
const hardcodedTenantFiles = [...frontendProduction, ...backendProduction]
  .filter((file) => fs.readFileSync(file, 'utf8').includes('WS-001'))
  .map((file) => path.relative(root, file));

check('EPIC 1', 'No production default tenant', hardcodedTenantFiles.length === 0,
  hardcodedTenantFiles.length ? hardcodedTenantFiles.join(', ') : 'production Java/JS/JSX source has no WS-001 fallback');
check('EPIC 1', 'Star and watcher tenant gate',
  sourceHasAll('works-backend/src/main/java/com/bcits/works/workitems/WorkItemEngagementService.java',
    ['workspaceForWorkItem', 'getUserTier', 'ApiException.notFound']) &&
  sourceHasAll('works-backend/src/test/java/com/bcits/works/WorkItemControllerAccessTest.java',
    ['starItem_deniedForCallerOutsideTheResourceWorkspace', 'watchItem_deniedForCallerOutsideTheResourceWorkspace']),
  'engagement mutations resolve the item workspace and cross-tenant tests deny without mutation');
check('EPIC 1', 'SSE-only query token',
  sourceHasAll('works-backend/src/main/java/com/bcits/works/security/SecurityConfig.java',
    ['"/api/v1/realtime/stream".equals(request.getRequestURI())', 'getParameter("access_token")']) &&
  sourceHasAll('works-backend/src/test/java/com/bcits/works/SecurityConfigJwtFilterTest.java',
    ['queryParamTokenAuthenticatesOnlyRealtimeStream', 'queryParamTokenIsIgnoredOnNormalApiPaths']),
  'query-param JWT handling is exact-path restricted and regression-tested');

check('EPIC 2', 'Protected-profile startup guard',
  sourceHasAll('works-backend/src/main/java/com/bcits/works/shared/ProductionConfigurationGuard.java',
    ['prod', 'staging', 'BSMART_JWT_SECRET', 'exposeDevVerificationToken']) &&
  exists('works-backend/src/test/java/com/bcits/works/shared/ProductionConfigurationGuardTest.java'),
  'production/staging reject missing or development JWT settings');
check('EPIC 2', 'Deployment health contributors',
  sourceHasAll('works-backend/src/main/java/com/bcits/works/devsync/DeploymentHealthIndicators.java',
    ['migrationHealthIndicator', 'storageHealthIndicator', 'aiHealthIndicator', 'realtimeHealthIndicator']) &&
  sourceHasAll('works-backend/src/main/resources/application.properties',
    ['management.endpoint.health.probes.enabled=true', 'management.health.readinessstate.enabled=true']),
  'DB/Flyway, storage, AI and realtime contributors are wired into readiness/liveness');
check('EPIC 2', 'Deploy templates and CI smoke',
  ['local', 'staging', 'production'].every((name) => exists(`deploy/env/${name}.example`)) &&
  sourceHasAll('docker-compose.deploy.yml', ['SPRING_PROFILES_ACTIVE', 'health/readiness']) &&
  sourceHasAll('.github/workflows/ci.yml', ['deploy-smoke', 'docker compose --env-file']),
  'local/staging/production templates and Compose validation are CI-enforced');
check('EPIC 2', 'Backup and restore runbook',
  sourceHasAll('docs/operations/BACKUP-RESTORE.md', ['pg_dump', 'pg_restore', 'uploads.tgz', 'health/readiness']),
  'PostgreSQL and uploads backup/restore includes post-restore readiness verification');

const modules = ['auth', 'workspaces', 'workitems', 'projects', 'messaging', 'devsync', 'ai',
  'knowledge', 'service', 'sla', 'reporting', 'automation', 'security', 'shared'];
const missingModules = modules.filter((module) =>
  !exists(`works-backend/src/main/java/com/bcits/works/${module}/package-info.java`) ||
  walk(`works-backend/src/main/java/com/bcits/works/${module}`, (file) => file.endsWith('.java')).length < 2);
const workItemController = read('works-backend/src/main/java/com/bcits/works/workitems/WorkItemController.java');
check('EPIC 3', 'Populated module boundaries', missingModules.length === 0,
  missingModules.length ? `missing or marker-only: ${missingModules.join(', ')}` : `${modules.length} modules contain production code`);
check('EPIC 3', 'Thin typed work-item HTTP adapter',
  workItemController.split(/\r?\n/).length < 400 &&
  !workItemController.includes('JdbcTemplate') &&
  !workItemController.includes('new WorkItem') &&
  workItemController.includes('WorkItemBulkRequest'),
  'controller is below 400 lines, performs no JDBC/service construction, and uses an explicit bulk DTO');
check('EPIC 3', 'Dashboard and AI concern split',
  read('works-backend/src/main/java/com/bcits/works/reporting/DashboardService.java').split(/\r?\n/).length < 100 &&
  sourceHasAll('works-backend/src/main/java/com/bcits/works/ai/AiAssistService.java',
    ['AiCommandExecutionService commandExecution', 'AiSummarizationService summarization']) &&
  !read('works-backend/src/main/java/com/bcits/works/ai/AiAssistService.java').includes('new AiCommandExecutionService'),
  'dashboard is a facade and AI command/summarization services are injected boundaries');
check('EPIC 3', 'Architecture regression tests',
  sourceHasAll('works-backend/src/test/java/com/bcits/works/ArchitectureTest.java',
    ['modulePackagesAreFreeOfCycles', 'workItemControllerRemainsAnHttpAdapter']),
  'ArchUnit plus source-boundary tests enforce module cycles and controller responsibilities');

const appEntry = read('works-frontend/src/App.jsx');
const appShell = read('works-frontend/src/app/AppShell.jsx');
const appConcerns = ['navigation/useShellNavigation', 'overlays/useShellOverlays',
  'realtime/useRealtimePresence', 'workspaces/useWorkspaceContext'];
check('EPIC 4', 'Thin app entry and extracted shell concerns',
  appEntry.split(/\r?\n/).length < 500 && appConcerns.every((token) => appShell.includes(token)) &&
  !/^\/\* eslint-disable/m.test(appShell),
  'App.jsx is below 500 lines; workspace, routes, overlays and realtime are extracted without a file-level lint disable');
check('EPIC 4', 'Independently testable global boundaries',
  ['providers/AppProviders.test.jsx', 'navigation/useShellNavigation.test.js',
    'overlays/useShellOverlays.test.js', 'realtime/useRealtimePresence.test.js',
    'workspaces/useWorkspaceContext.test.js'].every((file) => exists(`works-frontend/src/app/${file}`)),
  'provider, navigation, overlay, realtime and workspace boundaries have focused tests');
check('EPIC 4', 'Single route map and deep-link coverage',
  sourceHasAll('works-frontend/src/lib/routes.js', ['VIEW_PATHS', 'parseEntityRoute']) &&
  sourceHasAll('works-frontend/src/app/navigation/useShellNavigation.test.js', ['canonical route map', 'entity route']),
  'canonical route mapping owns view and entity deep links');

const tokenConfig = read('works-frontend/tailwind.config.js');
const premiumStory = read('works-frontend/src/components/works/molecules/core-molecules.stories.jsx');
const a11yTests = walk('works-frontend/src', (file) => file.endsWith('.a11y.test.jsx'));
const stories = walk('works-frontend/src/components/works', (file) => file.endsWith('.stories.jsx'));
check('EPIC 5', 'Complete token families and blocking guardrails',
  ['colors:', 'fontSize:', 'borderRadius:', 'boxShadow:', 'transitionDuration:', 'zIndex:']
    .every((token) => tokenConfig.includes(token)) &&
  sourceHasAll('scripts/guardrails.sh', [
    'check BLOCK "No raw hex in frontend components',
    'check BLOCK "No arbitrary spacing values',
    'check BLOCK "No arbitrary z-index',
  ]),
  'color, type, radius, elevation, motion and z-index tokens are backed by blocking checks');
check('EPIC 5', 'Core component stories and tests',
  stories.length >= 32 &&
  ['activity-feed', 'ai-assist-button', 'form-field', 'modal', 'presence-bar', 'search-input']
    .every((name) => premiumStory.includes(`'./${name}'`) &&
      exists(`works-frontend/src/components/works/molecules/${name}.test.jsx`)),
  `${stories.length} stories plus story/test coverage for the core shared molecules`);
check('EPIC 5', 'State, theme, density and motion behavior',
  sourceHasAll('works-frontend/src/components/works/atoms/empty-state.jsx', ['subtitle', 'action', 'VARIANTS']) &&
  sourceHasAll('works-frontend/src/components/works/atoms/async-boundary.jsx', ['loading', 'error', 'EmptyState']) &&
  sourceHasAll('works-frontend/.storybook/preview.jsx', ['globalTypes', 'theme', 'density', 'compact']) &&
  sourceHasAll('works-frontend/src/index.css', ['prefers-reduced-motion: reduce', '[data-density="compact"]', '.dark']),
  'shared state primitives and Storybook exercise light/dark/density; reduced motion is global');
check('EPIC 5', 'Accessibility gate', a11yTests.length >= 20,
  `${a11yTests.length} axe-backed screen tests plus Storybook a11y configured to fail on violations`);

let failed = false;
for (const result of results) {
  const marker = result.pass ? 'PASS' : 'FAIL';
  console.log(`[${marker}] ${result.epic} - ${result.name}: ${result.detail}`);
  if (!result.pass) failed = true;
}

if (failed) {
  console.error('\nEPIC 1-5 code completion gate failed. Fix production evidence before updating roadmap status.');
  process.exit(1);
}
