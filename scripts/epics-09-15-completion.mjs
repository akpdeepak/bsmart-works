import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const results = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const check = (epic, name, pass, detail) => results.push({ epic, name, pass: Boolean(pass), detail });

const messaging = read('works-backend/src/main/java/com/bcits/works/messaging/InternalMessagingController.java');
const messagingTests = read('works-backend/src/test/java/com/bcits/works/messaging/InternalMessagingControllerTest.java');
const messengerView = read('works-frontend/src/views/messenger-view.jsx');
check(9, 'work-aware messaging is tenant-scoped and review-first',
  messaging.includes('workspaceId') && messaging.includes('AuthenticatedUser')
    && messaging.includes('/summarize') && messaging.includes('/extract-actions')
    && messagingTests.includes('crossTenantDenied') && messengerView.includes('extract-actions-btn'),
  'contextual conversations, authenticated tenancy, AI drafts, and executable actions are present');

const detail = read('works-frontend/src/components/works/organisms/work-item-detail-panel.jsx');
const brief = read('works-frontend/src/lib/work-item-execution-brief.js');
check(10, 'work-item execution brief is source-backed',
  brief.includes('citations') && brief.includes('displayKey') && detail.includes('buildWorkItemExecutionBrief'),
  'detail surfaces display keys, execution signals, and citations');

const project = read('works-frontend/src/lib/project-command-center.js');
const projectsView = read('works-frontend/src/views/projects-view.jsx');
check(11, 'project command center is explainable',
  project.includes('citations') && project.includes('nextActions') && projectsView.includes('buildProjectCommandCenter'),
  'health, risks, citations, and next actions are derived from scoped project data');

const engineering = read('works-frontend/src/lib/engineering-activity.js');
const engineeringTests = read('works-frontend/src/lib/engineering-activity.test.js');
check(12, 'engineering intelligence preserves no-surveillance guardrails',
  engineering.includes('citations') && engineeringTests.includes('leaderboard')
    && engineeringTests.includes('lines of code'),
  'release-readiness evidence is summarized without individual ranking');

const shell = read('works-frontend/src/app/AppShell.jsx');
const palette = read('works-frontend/src/components/works/organisms/command-palette.jsx');
const commandBar = read('works-frontend/src/components/works/organisms/ai-command-bar.jsx');
check(13, 'AI command layer is globally reachable and governed',
  shell.includes('<AiCommandBar') && commandBar.includes("event.key.toLowerCase() === 'j'")
    && palette.includes('Ask AI') && commandBar.includes('aiClient.parseCommand'),
  'Cmd/Ctrl+J and command-palette fallback route through the server AI command endpoint');

const answer = read('works-backend/src/main/java/com/bcits/works/ai/AnswerEngineService.java');
const answerTests = read('works-backend/src/test/java/com/bcits/works/ai/AnswerEngineServiceTest.java');
const assistController = read('works-backend/src/main/java/com/bcits/works/ai/AiAssistController.java');
check(14, 'answer engine is scoped, cited, and deterministic on fallback',
  answer.includes('projects.findByWorkspaceId(workspaceId)')
    && answer.includes('findByWorkspaceIdOrderByNameAsc(workspaceId)')
    && answer.includes('List<AnswerSource> sources') && answer.includes('out.fallback()')
    && answerTests.includes('testAskReturnsLowConfidenceWithoutSources')
    && assistController.includes('@PostMapping({"/kb/ask", "/ask"})'),
  'workspace retrieval, citations, confidence, and safe insufficient-information behavior are pinned');

const artifact = read('works-backend/src/main/java/com/bcits/works/ai/AiArtifactController.java');
const assist = read('works-backend/src/main/java/com/bcits/works/ai/AiAssistService.java');
const studio = read('works-frontend/src/views/ai-studio-view.jsx');
const editor = read('works-frontend/src/components/BlockEditor.jsx');
check(15, 'canvas artifacts are governed, editable, and source-visible',
  artifact.includes('rbac.require(authenticatedUser.id(), workspaceId, "view_items")')
    && assist.includes('generateArtifact') && studio.includes('artifactsClient.generate')
    && studio.includes('<BlockEditor') && editor.includes('onChange'),
  'generation uses authenticated RBAC and the AI Control Plane before rendering editable blocks');

let failed = false;
for (const result of results) {
  const marker = result.pass ? 'PASS' : 'FAIL';
  console.log(`[${marker}] EPIC ${result.epic} - ${result.name}: ${result.detail}`);
  if (!result.pass) failed = true;
}

if (failed) {
  console.error('\nEPIC 9-15 code completion gate failed. Fix production evidence before updating roadmap status.');
  process.exit(1);
}
