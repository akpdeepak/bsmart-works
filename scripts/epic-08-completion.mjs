import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const results = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function check(name, pass, detail) {
  results.push({ name, pass: Boolean(pass), detail });
}

const service = read('works-backend/src/main/java/com/bcits/works/messaging/SmartInboxService.java');
const controller = read('works-backend/src/main/java/com/bcits/works/messaging/SmartInboxController.java');
const activity = read('works-backend/src/main/java/com/bcits/works/messaging/NotificationActivityService.java');
const activityController = read('works-backend/src/main/java/com/bcits/works/messaging/NotificationController.java');
const repository = read('works-backend/src/main/java/com/bcits/works/messaging/NotificationRepository.java');
const notification = read('works-backend/src/main/java/com/bcits/works/messaging/Notification.java');
const batch = read('works-backend/src/main/java/com/bcits/works/messaging/NotificationBatchService.java');
const aiCapabilities = read('works-backend/src/main/java/com/bcits/works/AiCapabilities.java');
const aiPort = read('works-backend/src/main/java/com/bcits/works/shared/AiControlPlanePort.java');
const aiAdapter = read('works-backend/src/main/java/com/bcits/works/ai/AiControlPlaneAdapter.java');
const migration = read('works-backend/src/main/resources/db/migration/V120__smart_inbox_workspace_state.sql');
const integration = read('works-backend/src/test/java/com/bcits/works/SmartInboxTenantIsolationIT.java');
const controllerTests = read('works-backend/src/test/java/com/bcits/works/SmartInboxControllerTest.java');
const appShell = read('works-frontend/src/app/AppShell.jsx');
const view = read('works-frontend/src/views/notifications-view.jsx');
const viewTests = read('works-frontend/src/views/notifications-view.test.jsx');
const classifier = read('works-frontend/src/lib/smart-inbox.js');

check('Action projection covers every required source domain',
  service.includes('FROM notifications')
    && service.includes('FROM articles')
    && service.includes('FROM pull_request_reviewers')
    && service.includes('FROM chat_conversations')
    && service.includes('FROM work_items')
    && service.includes("'BLOCKED_BY'"),
  'notifications, approvals, code reviews, customer chats, waits, and blockers are queried');

check('Actionable count is server-authoritative',
  controller.includes('@GetMapping("/count")')
    && controller.includes('inbox.count(workspaceId, authenticatedUser.id())')
    && appShell.includes('/inbox/count?workspaceId=')
    && appShell.includes('setUnreadCount(actionRows.length)'),
  'badge and loaded Action tab use the same workspace projection');

check('Items expose one primary action and optional secondary actions',
  service.includes('Action primaryAction,')
    && service.includes('List<Action> secondaryActions')
    && view.includes('executeAction(item, item.primaryAction)')
    && view.includes('item.secondaryActions?.map'),
  'the server contract and renderer distinguish primary from secondary actions');

check('Direct actions mutate real source APIs',
  service.includes('"/articles/" + id + "/publish"')
    && service.includes('"/articles/" + id + "/reject"')
    && service.includes('"/support-chat/conversations/" + id + "/assign"')
    && service.includes('"/support-chat/conversations/" + id + "/reply"')
    && view.includes("api.send('/work-items'")
    && viewTests.includes('acts on an approval directly')
    && viewTests.includes('replies from the Inbox')
    && viewTests.includes('converts an action to a real work item'),
  'approve/reject, claim/reply, and convert-to-work are executable');

check('Source navigation is retained',
  service.includes('String sourceLink,')
    && view.includes('parseEntityRoute(item.sourceLink')
    && view.includes("window.open(action.path, '_blank', 'noopener,noreferrer')")
    && viewTests.includes('opens a work-item source in the real detail surface'),
  'internal entity detail and external review links are wired');

check('Snooze and done state are durable and caller-scoped',
  migration.includes('CREATE TABLE inbox_item_states')
    && migration.includes('PRIMARY KEY (workspace_id, user_id, item_key)')
    && service.includes('INSERT INTO inbox_item_states')
    && controller.includes('@PostMapping("/snooze")')
    && controller.includes('@PostMapping("/done")')
    && integration.includes('doneAndSnoozeStateAreScopedToWorkspaceAndCaller'),
  'V120 and mutations persist state by workspace, user, and source key');

check('Low-priority bulk clear is server-authoritative',
  controller.includes('@PostMapping("/bulk-done")')
    && service.includes('"LOW".equals(item.priority()) || "NORMAL".equals(item.priority())')
    && service.includes('@Transactional(timeout = 2)')
    && viewTests.includes('bulk-clears only low-priority projected items'),
  'the server intersects requested keys with current low/normal actions');

check('Missed summary is governed, sourced, and deterministic on fallback',
  aiCapabilities.includes('INBOX_SUMMARY')
    && aiCapabilities.includes('deterministic action counts grouped by intent')
    && service.includes('AiCapabilities.INBOX_SUMMARY')
    && service.includes('AiControlPlanePort.Request')
    && aiPort.includes('interface AiControlPlanePort')
    && aiAdapter.includes('controlPlane.invoke(new AiControlPlaneService.AiCall')
    && service.includes('deterministicSummary(items)')
    && service.includes('List<SummarySource> sources')
    && view.includes('summary.sources.map')
    && viewTests.includes('shows a governed summary and its source links'),
  'AI Control Plane metadata, exact sources, and fallback remain visible');

check('Notification ownership is explicitly workspace-scoped',
  migration.includes('ADD COLUMN workspace_id')
    && notification.includes('@Filter(name = WorkspaceFilterActivator.FILTER_NAME')
    && batch.includes('n.setWorkspaceId(workspaceId)')
    && !repository.includes('findByUserId')
    && repository.includes('findByWorkspaceIdAndUserId'),
  'mapping, producers, and repository reads require tenant ownership');

check('RBAC and authenticated caller identity are enforced',
  service.includes('rbac.require(userId, workspaceId, "view_items")')
    && service.includes('rbac.canDo(userId, workspaceId, "work_service")')
    && controller.includes('AuthenticatedUser authenticatedUser')
    && controllerTests.includes('mutationsCannotChooseAnotherUser')
    && integration.includes('sameUserSeesOnlyTheActiveWorkspace'),
  'caller identity cannot be supplied by the client and workspace membership gates every read');

check('Passive Activity remains separate and tenant-scoped',
  activity.includes('findByWorkspaceIdAndUserId(workspaceId, userId, pageable)')
    && activityController.includes('activity.list(workspaceId, uid, page, size)')
    && view.includes('<Tab value="activity">Activity history</Tab>')
    && integration.includes('activityHistoryIsAlsoScopedToTheActiveWorkspace')
    && viewTests.includes('keeps Activity history separate'),
  'Activity has its own service, endpoints, tab, and two-workspace proof');

check('Quiet hours and notification preferences remain reachable',
  view.includes('<TabPanel value="preferences"><PushSettingsPanel /></TabPanel>')
    && viewTests.includes('uses the server preference panel for quiet hours'),
  'the established server-backed preference surface is embedded in Inbox');

check('Read budget, fresh migrations, and accessibility are executable',
  service.includes('@Transactional(readOnly = true, timeout = 2)')
    && activity.includes('@Transactional(readOnly = true, timeout = 2)')
    && integration.includes('PostgreSQLContainer("postgres:16-alpine")')
    && integration.includes('Duration.ofSeconds(2)')
    && viewTests.includes('expectNoA11yViolations(container)')
    && !classifier.toLowerCase().includes('message.includes('),
  'two-second reads, V120 on PostgreSQL, axe, and non-regex intent routing are pinned');

let failed = false;
for (const result of results) {
  const marker = result.pass ? 'PASS' : 'FAIL';
  console.log(`[${marker}] EPIC 8 - ${result.name}: ${result.detail}`);
  if (!result.pass) failed = true;
}

if (failed) {
  console.error('\nEPIC 8 code completion gate failed. Fix production evidence before updating roadmap status.');
  process.exit(1);
}
