import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const results = [];

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function read(relativePath) {
  return fs.readFileSync(absolute(relativePath), 'utf8');
}

function check(name, pass, detail) {
  results.push({ name, pass: Boolean(pass), detail });
}

const routes = await import(pathToFileURL(absolute('works-frontend/src/lib/routes.js')));
const briefModel = await import(pathToFileURL(absolute('works-frontend/src/lib/today-brief.js')));
const attention = await import(pathToFileURL(absolute('works-frontend/src/lib/today-attention-state.js')));
const layouts = await import(pathToFileURL(absolute('works-frontend/src/lib/today-layouts.js')));

const appShell = read('works-frontend/src/app/AppShell.jsx');
const dashboardView = read('works-frontend/src/views/dashboard-view.jsx');
const dashboardTests = read('works-frontend/src/views/dashboard-view.test.jsx');
const controller = read('works-backend/src/main/java/com/bcits/works/reporting/DashboardController.java');
const queryService = read('works-backend/src/main/java/com/bcits/works/reporting/RoleDashboardQueryService.java');
const dashboardService = read('works-backend/src/main/java/com/bcits/works/reporting/DashboardService.java');
const accessTests = read('works-backend/src/test/java/com/bcits/works/DashboardControllerAccessTest.java');
const isolationTests = read('works-backend/src/test/java/com/bcits/works/WorkspaceTenantIsolationIT.java');
const aiController = read('works-backend/src/main/java/com/bcits/works/ai/AiAssistController.java');
const aiService = read('works-backend/src/main/java/com/bcits/works/ai/AiAssistService.java');
const aiBrief = read('works-frontend/src/components/works/organisms/today-ai-brief.jsx');
const layoutService = read('works-backend/src/main/java/com/bcits/works/TodayLayoutService.java');

check('Today is the authenticated home route',
  routes.VIEW_PATHS.dashboard === '/' && appShell.includes("case 'dashboard': fetchDashboard(dashboardRole)"),
  'dashboard resolves to / and loads the active Today role');

const developerQueries = queryService.slice(
  queryService.indexOf('getDeveloperDashboard'),
  queryService.indexOf('getScrumMasterDashboard'),
);
const developerWorkspacePredicates = (developerQueries.match(/(?:p|pr)\.workspace_id = \?/g) || []).length;
check('Developer Today is selected-workspace scoped',
  appShell.includes('/dashboards/developer?workspaceId=')
    && controller.includes('getDeveloperDashboard(\n            @RequestParam String workspaceId)')
    && developerWorkspacePredicates >= 10
    && isolationTests.includes('developerTodayUsesTheSelectedWorkspaceEvenForAMultiWorkspaceUser'),
  `${developerWorkspacePredicates} developer predicates plus an executable two-workspace case`);

const roleKeys = Object.keys(layouts.BUILTIN_TODAY_LAYOUTS);
const expectedRoles = ['developer', 'scrum-master', 'product-owner', 'support-agent', 'executive', 'admin'];
check('Six role-aware Today layouts exist',
  expectedRoles.every((role) => roleKeys.includes(role))
    && expectedRoles.every((role) => layoutService.includes(`"${role}"`)),
  `${roleKeys.length} production layouts: ${roleKeys.join(', ')}`);

const sevenSignals = Array.from({ length: 7 }, (_, index) => ({
  id: `WRK-${index}`,
  title: `Work ${index}`,
  priority: 'HIGH',
  status: 'In Progress',
}));
const cappedBrief = briefModel.buildTodayBrief('developer', { myOpenItems: sevenSignals });
check('Attention is actionable and capped at five',
  cappedBrief.attention.length === 5
    && dashboardView.includes('onSnooze?.(item)')
    && dashboardView.includes('onDismiss?.(item)')
    && dashboardView.includes('onNavigate?.(item.view)')
    && dashboardTests.includes('dismisses an attention signal')
    && dashboardTests.includes('snoozes an attention signal'),
  `${cappedBrief.attention.length} visible signals with open, snooze, and dismiss controls`);

const stateKeyA = attention.todayAttentionKey('WS-A', 'USR-1', 'developer');
const stateKeyB = attention.todayAttentionKey('WS-B', 'USR-1', 'developer');
const originalSignal = { id: 'WRK-1', title: 'Fix login', reason: 'Overdue.' };
const dismissed = attention.dismissTodayAttention(
  { dismissed: [], snoozed: {}, seen: [], lastVisitAt: null },
  originalSignal,
);
const changedVisible = attention.visibleTodayAttention(
  [{ ...originalSignal, reason: 'Priority changed.' }], dismissed, new Date('2026-07-19T09:00:00Z'));
check('Attention state is isolated and changed signals reappear',
  stateKeyA !== stateKeyB && changedVisible.length === 1
    && read('works-frontend/src/lib/today-attention-state.test.js').includes('marks signals added after the previous snapshot as new'),
  'state key includes workspace/user/role and signal fingerprints include current reason');

check('AI brief is caller-only, sourced, and fallback-visible',
  aiController.includes('assist.todayNudges(workspaceId, callerId, true)')
    && !aiController.includes('targetUserId')
    && aiService.includes('record TodayNudge(String text, String workItemId, String title)')
    && aiService.includes('out.fallback() || out.text() == null || out.text().isBlank() ? draft : out.text()')
    && aiBrief.includes('{data.summary ||')
    && aiBrief.includes('<AiMetaBadge')
    && aiBrief.includes('nudge.workItemId'),
  'authenticated caller scope, deterministic fallback, AI metadata, and exact work-item sources are rendered');

check('Support-agent Today uses the real service domain',
  controller.includes('@GetMapping("/support-agent")')
    && controller.includes('"work_service"')
    && queryService.includes('FROM chat_conversations WHERE workspace_id = ?')
    && dashboardView.includes('<SupportAgentToday')
    && accessTests.includes('supportDashboardRequiresServicePermissionAndKeepsCallerIdentity'),
  'workspace-scoped support conversations, service RBAC, and a rendered support cockpit are wired');

check('Daily model covers the source-domain signals',
  queryService.includes('"pendingReviews"')
    && queryService.includes('"approvals"')
    && queryService.includes('"slaRisks"')
    && queryService.includes('"importantMessages"')
    && queryService.includes('"devSyncHighlights"')
    && read('works-frontend/src/lib/today-brief.js').includes('Approval is waiting')
    && read('works-frontend/src/lib/today-brief.js').includes('SLA is')
    && read('works-frontend/src/lib/today-brief.js').includes('DevSync update'),
  'priorities, approvals/waits, blockers, SLA/customer/code risks, messages, and DevSync feed attention');

check('Today personalization remains server-backed',
  layoutService.includes('personal override (owner_id = caller)')
    && layoutService.includes('workspace role template (owner_id NULL)')
    && dashboardView.includes('saveTodayLayout?.(dashboardRole, draft)')
    && dashboardView.includes('saveTodayTemplate?.(dashboardRole, draft)'),
  'personal and workspace role layouts retain effective-layout persistence');

check('Dashboard reads carry the two-second budget',
  dashboardService.includes('@Transactional(readOnly = true, timeout = 2)')
    && isolationTests.includes('assertTimeout(Duration.ofSeconds(2)')
    && read('works-backend/src/test/java/com/bcits/works/reporting/DashboardServiceNfrGuardTest.java')
      .includes('transaction.timeout()).isEqualTo(2)'),
  'transaction timeout and real-Postgres timing assertion are both executable');

check('Today accessibility is executable',
  read('works-frontend/src/views/dashboard-view.a11y.test.jsx').includes('expectNoA11yViolations'),
  'the populated attention surface is covered by the shared axe gate');

let failed = false;
for (const result of results) {
  const marker = result.pass ? 'PASS' : 'FAIL';
  console.log(`[${marker}] EPIC 7 - ${result.name}: ${result.detail}`);
  if (!result.pass) failed = true;
}

if (failed) {
  console.error('\nEPIC 7 code completion gate failed. Fix production evidence before updating roadmap status.');
  process.exit(1);
}
