package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * The iteration-11 capability engine. The parsing/ranking/heuristic helpers are pure and tested
 * directly; the orchestration methods are tested with a mocked control plane so AI-on vs fallback
 * behaviour is exercised without a database (RB-10 §7).
 */
@Tag("unit")
class AiAssistServiceTest {

    // ── pure helpers ───────────────────────────────────────────────────────────

    @Test
    void heuristicPriority_mapsSeverityKeywords() {
        assertThat(AiAssistService.heuristicPriority("Production outage", "")).isEqualTo("Critical");
        assertThat(AiAssistService.heuristicPriority("Login bug", "error on submit")).isEqualTo("High");
        assertThat(AiAssistService.heuristicPriority("Fix typo", "")).isEqualTo("Low");
        assertThat(AiAssistService.heuristicPriority("Add a settings page", "")).isEqualTo("Medium");
    }

    @Test
    void detectType_and_detectStatus() {
        // Canonical uppercase keys (V68 type redesign) — these are persisted on create.
        assertThat(AiAssistService.detectType("login crash bug")).isEqualTo("BUG");
        assertThat(AiAssistService.detectType("as a user i want")).isEqualTo("STORY");
        assertThat(AiAssistService.detectType("plain task")).isEqualTo("TASK");
        assertThat(AiAssistService.detectStatus("move to in progress")).isEqualTo("In Progress");
        assertThat(AiAssistService.detectStatus("mark done")).isEqualTo("Done");
        assertThat(AiAssistService.detectStatus("nothing here")).isNull();
    }

    @Test
    void parseSteps_splitsMultiActionEnglishCommand() {
        // The iteration-11 multi-action example.
        var steps = AiAssistService.parseSteps(
            "Find P0 bugs assigned to me, move WEB-12 to In Progress and add comment Starting work today");
        assertThat(steps).hasSize(3);
        assertThat(steps.get(0).action()).isEqualTo(AiAssistService.ActionType.FIND.name());
        assertThat(steps.get(1).action()).isEqualTo(AiAssistService.ActionType.MOVE_STATUS.name());
        assertThat(steps.get(1).params()).containsEntry("workItemId", "WEB-12").containsEntry("status", "In Progress");
        assertThat(steps.get(2).action()).isEqualTo(AiAssistService.ActionType.COMMENT.name());
    }

    @Test
    void parseSteps_understandsHinglishAssign() {
        // 'Bug WEB-1247 ko Rahul ko assign karo' — the multilingual command example.
        var steps = AiAssistService.parseSteps("Bug WEB-1247 ko Rahul ko assign karo");
        assertThat(steps).hasSize(1);
        assertThat(steps.get(0).action()).isEqualTo(AiAssistService.ActionType.ASSIGN.name());
        assertThat(steps.get(0).params()).containsEntry("workItemId", "WEB-1247");
    }

    @Test
    void parseSteps_createExtractsEmailAndType() {
        var steps = AiAssistService.parseSteps("Create bug: portal login fails, email priya@bcits.com");
        assertThat(steps.get(0).action()).isEqualTo(AiAssistService.ActionType.CREATE_ITEM.name());
        assertThat(steps.get(0).params()).containsEntry("type", "BUG");
    }

    @Test
    void parseSteps_unknownCommandFallsBack() {
        var steps = AiAssistService.parseSteps("");
        assertThat(steps).hasSize(1);
        assertThat(steps.get(0).action()).isEqualTo(AiAssistService.ActionType.UNKNOWN.name());
    }

    @Test
    void rankSimilar_ranksByWordOverlap() {
        WorkItem a = item("WEB-1", "login page broken", "");
        WorkItem b = item("WEB-2", "dashboard chart colour", "");
        var ranked = AiAssistService.rankSimilar(List.of(a, b), "login broken", 5);
        assertThat(ranked).first().isEqualTo(a);
    }

    @Test
    void biggestSwingIndex_findsLargestDelta() {
        assertThat(AiAssistService.biggestSwingIndex(List.of(10.0, 11.0, 4.0, 5.0))).isEqualTo(2);
        assertThat(AiAssistService.biggestSwingIndex(List.of(5.0))).isEqualTo(-1);
        assertThat(AiAssistService.biggestSwingIndex(List.of(5.0, 5.0, 5.0))).isEqualTo(-1);
    }

    @Test
    void slaRisk_scalesWithPriorityAndAge() {
        assertThat(AiAssistService.slaRisk("Critical", 5)).isEqualTo("HIGH");
        assertThat(AiAssistService.slaRisk("Low", 1)).isEqualTo("LOW");
        assertThat(AiAssistService.slaRisk("Medium", 60)).isEqualTo("MEDIUM");
    }

    @Test
    void renderTemplate_and_blankScaffold_differ() {
        assertThat(AiAssistService.renderTemplate("ac", "OTP login", Map.of())).contains("Acceptance criteria");
        assertThat(AiAssistService.renderTemplate("test_cases", "x", Map.of())).contains("cross-tenant");
        assertThat(AiAssistService.blankScaffold("ac")).doesNotContain("Given a valid request");
    }

    @Test
    void tokenize_dropsStopwordsAndShortTokens() {
        assertThat(AiAssistService.tokenize("the login is broken")).containsExactly("login", "broken");
    }

    // ── orchestration with a mocked control plane ────────────────────────────────

    private final AiControlPlaneService cp = mock(AiControlPlaneService.class);
    private final WorkItemRepository workItems = mock(WorkItemRepository.class);
    private final ProjectRepository projects = mock(ProjectRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final ArticleRepository articles = mock(ArticleRepository.class);
    private final KnowledgeSpaceRepository spaces = mock(KnowledgeSpaceRepository.class);
    private final TeamRepository teams = mock(TeamRepository.class);
    private final CommentRepository comments = mock(CommentRepository.class);
    private final EventService events = mock(EventService.class);
    private final RbacService rbac = mock(RbacService.class);

    private final AiAssistService assist = new AiAssistService(
        cp, workItems, projects, users, articles, spaces, teams, comments, events, rbac);

    private void aiOn() {
        when(cp.invoke(any())).thenAnswer(i -> {
            AiControlPlaneService.AiCall c = i.getArgument(0);
            return new AiControlPlaneService.AiOutcome(true, false, c.draft(), AiModelTier.SONNET, "ENABLED", 1, false);
        });
    }

    private void aiFallback() {
        when(cp.invoke(any())).thenReturn(AiControlPlaneService.AiOutcome.fallback("DISABLED_WORKSPACE"));
    }

    @Test
    void triage_aiOnSuggestsAssigneeFromSimilarItems() {
        aiOn();
        when(projects.findByWorkspaceId("ws")).thenReturn(List.of(project("PROJ-1")));
        WorkItem past = item("WEB-9", "login broken on portal", "");
        past.setAssigneeId("user-7");
        when(workItems.findByProjectId("PROJ-1")).thenReturn(List.of(past));
        when(users.findById("user-7")).thenReturn(java.util.Optional.of(user("user-7", "Rahul")));

        var s = assist.triage("ws", "me", "login broken", "portal login fails", null, true);
        assertThat(s.priority()).isEqualTo("High");
        assertThat(s.assigneeName()).isEqualTo("Rahul");
        assertThat(s.similar()).isNotEmpty();
        assertThat(s.meta().usedAi()).isTrue();
    }

    @Test
    void triage_fallbackDropsAssigneeSuggestion() {
        aiFallback();
        when(projects.findByWorkspaceId("ws")).thenReturn(List.of());
        var s = assist.triage("ws", "me", "login broken", "", null, true);
        assertThat(s.assigneeId()).isNull();
        assertThat(s.priority()).isEqualTo("Medium");   // workspace default on fallback
        assertThat(s.meta().fallback()).isTrue();
    }

    @Test
    void generate_fallbackReturnsBlankScaffold() {
        aiFallback();
        var d = assist.generate("ws", "me", "ac", Map.of("topic", "OTP"), true);
        assertThat(d.draft()).doesNotContain("Given a valid request");
        assertThat(d.meta().fallback()).isTrue();
    }

    @Test
    void generate_aiOnReturnsFullTemplate() {
        aiOn();
        var d = assist.generate("ws", "me", "ac", Map.of("topic", "OTP"), true);
        assertThat(d.draft()).contains("Acceptance criteria");
    }

    @Test
    void kbAsk_groundsAnswerInArticles() {
        aiOn();
        when(spaces.findByWorkspaceIdOrderByNameAsc("ws")).thenReturn(List.of(space("SP-1")));
        Article art = article("KB-1", "Reading your consumption report", "Open the portal and go to Reports.");
        when(articles.findBySpaceIdOrderByUpdatedAtDesc("SP-1")).thenReturn(List.of(art));

        var ans = assist.kbAsk("ws", "me", "how do I read my consumption report", true);
        assertThat(ans.citations()).extracting(m -> m.get("id")).contains("KB-1");
    }

    @Test
    void route_picksBestMatchingTeam() {
        aiOn();
        Team web = team("T-1", "Web Portal", "customer portal billing");
        Team infra = team("T-2", "Infra", "servers kubernetes");
        when(teams.findByWorkspaceIdOrderByNameAsc("ws")).thenReturn(List.of(web, infra));
        var r = assist.route("ws", "me", "portal billing issue", true);
        assertThat(r.get("teamName")).isEqualTo("Web Portal");
    }

    @Test
    void executePlan_createDeniedWithoutPermission() {
        org.mockito.Mockito.doThrow(ApiException.forbidden("no"))
            .when(rbac).require("me", "ws", "create_items");
        var step = new AiAssistService.PlanStep(AiAssistService.ActionType.CREATE_ITEM.name(),
            "create", Map.of("title", "x"), true);
        org.assertj.core.api.Assertions.assertThatThrownBy(
            () -> assist.executePlan("ws", "me", List.of(step))).isInstanceOf(ApiException.class);
        org.mockito.Mockito.verify(workItems, org.mockito.Mockito.never()).save(any());
    }

    @Test
    void executePlan_assign_resolvesUserWithinWorkspaceOnly() {
        // Prove that ASSIGN uses workspace-scoped user lookup (RB-40 §1), not a global findAll.
        WorkItem wi = item("WEB-1", "Login broken", "");
        when(workItems.findById("WEB-1")).thenReturn(java.util.Optional.of(wi));
        when(rbac.workspaceForProject("PROJ-1")).thenReturn("ws");
        org.mockito.Mockito.doNothing().when(rbac).require("me", "ws", "edit_any_item");
        User rahul = user("user-9", "Rahul");
        when(users.findByWorkspaceIdAndFullNameContaining("ws", "Rahul"))
                .thenReturn(List.of(rahul));

        var step = new AiAssistService.PlanStep(AiAssistService.ActionType.ASSIGN.name(),
                "assign", Map.of("workItemId", "WEB-1", "assigneeName", "Rahul"), true);
        var result = assist.executePlan("ws", "me", List.of(step));

        assertThat(result.get("executed")).isEqualTo(1);
        // Scoped lookup was used; global findAll must never be called
        org.mockito.Mockito.verify(users).findByWorkspaceIdAndFullNameContaining("ws", "Rahul");
        org.mockito.Mockito.verify(users, org.mockito.Mockito.never()).findAll();
    }

    // ── deterministicNlToBql (iter-10 Cap O fallback) ───────────────────────────

    @Test
    void deterministicNlToBql_emptyTextReturnsEmpty() {
        assertThat(AiAssistService.deterministicNlToBql("")).isEmpty();
    }

    @Test
    void deterministicNlToBql_mapsInProgressStatusKeyword() {
        String bql = AiAssistService.deterministicNlToBql("in progress items");
        assertThat(bql).contains("status").contains("In Progress");
    }

    @Test
    void deterministicNlToBql_mapsHighPriorityKeyword() {
        String bql = AiAssistService.deterministicNlToBql("high priority items");
        assertThat(bql).contains("priority").contains("High");
    }

    @Test
    void deterministicNlToBql_mapsUrgentToCritical() {
        String bql = AiAssistService.deterministicNlToBql("urgent tasks");
        assertThat(bql).contains("priority").contains("Critical");
    }

    @Test
    void deterministicNlToBql_mapsBugTypeKeyword() {
        String bql = AiAssistService.deterministicNlToBql("find bugs");
        assertThat(bql).contains("type").contains("BUG");
    }

    @Test
    void deterministicNlToBql_mapsAssignedToMeKeyword() {
        String bql = AiAssistService.deterministicNlToBql("items assigned to me");
        assertThat(bql).contains("assigneeId = @me");
    }

    @Test
    void deterministicNlToBql_mapsOverdueKeyword() {
        String bql = AiAssistService.deterministicNlToBql("overdue items");
        assertThat(bql).contains("dueDate").contains("today");
    }

    @Test
    void deterministicNlToBql_mapsTodayKeyword() {
        String bql = AiAssistService.deterministicNlToBql("created today");
        assertThat(bql).contains("today");
    }

    @Test
    void deterministicNlToBql_combinesMultipleClauses() {
        String bql = AiAssistService.deterministicNlToBql("in progress high priority bugs assigned to me");
        assertThat(bql).contains("status").contains("priority").contains("type").contains("assigneeId");
    }

    // ── fixtures ─────────────────────────────────────────────────────────────────

    private static WorkItem item(String id, String title, String desc) {
        WorkItem w = new WorkItem();
        w.setId(id);
        w.setTitle(title);
        w.setDescription(desc);
        w.setProjectId("PROJ-1");
        return w;
    }

    private static Project project(String id) {
        Project p = new Project();
        p.setId(id);
        return p;
    }

    private static User user(String id, String name) {
        User u = new User();
        u.setId(id);
        u.setFullName(name);
        return u;
    }

    private static Article article(String id, String title, String content) {
        Article a = new Article();
        a.setId(id);
        a.setTitle(title);
        a.setContent(content);
        return a;
    }

    private static KnowledgeSpace space(String id) {
        KnowledgeSpace s = new KnowledgeSpace();
        s.setId(id);
        return s;
    }

    private static Team team(String id, String name, String desc) {
        Team t = new Team();
        t.setId(id);
        t.setName(name);
        t.setDescription(desc);
        return t;
    }
}
