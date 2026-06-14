package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for the pure, stateless heuristics extracted from {@link AiAssistService}.
 * These functions are referentially transparent (no database / control plane / events) and
 * double as the deterministic AI fallbacks (RB-40 §2), so they are tested directly (RB-10 §7).
 */
@Tag("unit")
class AiHeuristicsTest {

    // ── priority / type / status classification ──────────────────────────────────

    @Test
    void heuristicPriority_mapsSeverityKeywords() {
        assertThat(AiHeuristics.heuristicPriority("Production outage", "")).isEqualTo("Critical");
        assertThat(AiHeuristics.heuristicPriority("Login bug", "error on submit")).isEqualTo("High");
        assertThat(AiHeuristics.heuristicPriority("Fix typo", "")).isEqualTo("Low");
        assertThat(AiHeuristics.heuristicPriority("Add a settings page", "")).isEqualTo("Medium");
        assertThat(AiHeuristics.heuristicPriority(null, null)).isEqualTo("Medium");
    }

    @Test
    void detectType_returnsCanonicalUppercaseKeys() {
        assertThat(AiHeuristics.detectType("login crash bug")).isEqualTo("BUG");
        assertThat(AiHeuristics.detectType("as a user i want")).isEqualTo("STORY");
        assertThat(AiHeuristics.detectType("big epic")).isEqualTo("EPIC");
        assertThat(AiHeuristics.detectType("production incident")).isEqualTo("INCIDENT");
        assertThat(AiHeuristics.detectType("plain work")).isEqualTo("TASK");
    }

    @Test
    void detectStatus_mapsKeywordsOrNull() {
        assertThat(AiHeuristics.detectStatus("move to in progress")).isEqualTo("In Progress");
        assertThat(AiHeuristics.detectStatus("mark done")).isEqualTo("Done");
        assertThat(AiHeuristics.detectStatus("needs qa review")).isEqualTo("In Review");
        assertThat(AiHeuristics.detectStatus("put in backlog")).isEqualTo("Todo");
        assertThat(AiHeuristics.detectStatus("nothing here")).isNull();
    }

    // ── command-bar parsing ──────────────────────────────────────────────────────

    @Test
    void parseSteps_splitsMultiActionEnglishCommand() {
        var steps = AiHeuristics.parseSteps(
            "Find P0 bugs assigned to me, move WEB-12 to In Progress and add comment Starting work today");
        assertThat(steps).hasSize(3);
        assertThat(steps.get(0).action()).isEqualTo(AiAssistService.ActionType.FIND.name());
        assertThat(steps.get(1).action()).isEqualTo(AiAssistService.ActionType.MOVE_STATUS.name());
        assertThat(steps.get(1).params()).containsEntry("workItemId", "WEB-12").containsEntry("status", "In Progress");
        assertThat(steps.get(2).action()).isEqualTo(AiAssistService.ActionType.COMMENT.name());
    }

    @Test
    void parseSteps_understandsHinglishAssign() {
        var steps = AiHeuristics.parseSteps("Bug WEB-1247 ko Rahul ko assign karo");
        assertThat(steps).hasSize(1);
        assertThat(steps.get(0).action()).isEqualTo(AiAssistService.ActionType.ASSIGN.name());
        assertThat(steps.get(0).params()).containsEntry("workItemId", "WEB-1247");
    }

    @Test
    void parseSteps_createExtractsEmailAndType() {
        var steps = AiHeuristics.parseSteps("Create bug: portal login fails, email priya@bcits.com");
        assertThat(steps.get(0).action()).isEqualTo(AiAssistService.ActionType.CREATE_ITEM.name());
        assertThat(steps.get(0).params()).containsEntry("type", "BUG");
    }

    @Test
    void parseSteps_emptyCommandFallsBackToUnknown() {
        var steps = AiHeuristics.parseSteps("");
        assertThat(steps).hasSize(1);
        assertThat(steps.get(0).action()).isEqualTo(AiAssistService.ActionType.UNKNOWN.name());
    }

    @Test
    void splitClauses_splitsOnConjunctionsAndNullSafe() {
        assertThat(AiHeuristics.splitClauses(null)).isEmpty();
        assertThat(AiHeuristics.splitClauses("a and b, c then d"))
            .containsExactly("a", "b", "c", "d");
    }

    @Test
    void renderPlanSummary_numbersEachStep() {
        var steps = AiHeuristics.parseSteps("Create bug: login fails and find open items");
        String summary = AiHeuristics.renderPlanSummary(steps);
        assertThat(summary).startsWith("Here's what I'll do:").contains("1. ").contains("2. ");
    }

    // ── ranking ──────────────────────────────────────────────────────────────────

    @Test
    void rankSimilar_ranksByWordOverlap() {
        WorkItem a = item("WEB-1", "login page broken", "");
        WorkItem b = item("WEB-2", "dashboard chart colour", "");
        var ranked = AiHeuristics.rankSimilar(List.of(a, b), "login broken", 5);
        assertThat(ranked).first().isEqualTo(a);
    }

    @Test
    void rankArticles_ranksByWordOverlapAndExcludesNonMatches() {
        Article a = article("KB-1", "Reading the consumption report", "open the portal reports");
        Article b = article("KB-2", "Cooking recipes", "unrelated content");
        var ranked = AiHeuristics.rankArticles(List.of(a, b), "consumption report portal", 5);
        assertThat(ranked).containsExactly(a);
    }

    @Test
    void bestTeam_picksHighestOverlap_andFallsBackToFirst() {
        Team web = team("T-1", "Web Portal", "customer portal billing");
        Team infra = team("T-2", "Infra", "servers kubernetes");
        assertThat(AiHeuristics.bestTeam(List.of(web, infra), "portal billing issue")).isEqualTo(web);
        // No overlap → first team is the default.
        assertThat(AiHeuristics.bestTeam(List.of(web, infra), "zzz nomatch")).isEqualTo(web);
        assertThat(AiHeuristics.bestTeam(List.of(), "anything")).isNull();
    }

    // ── anomaly / SLA ─────────────────────────────────────────────────────────────

    @Test
    void biggestSwingIndex_findsLargestDelta() {
        assertThat(AiHeuristics.biggestSwingIndex(List.of(10.0, 11.0, 4.0, 5.0))).isEqualTo(2);
        assertThat(AiHeuristics.biggestSwingIndex(List.of(5.0))).isEqualTo(-1);
        assertThat(AiHeuristics.biggestSwingIndex(List.of(5.0, 5.0, 5.0))).isEqualTo(-1);
        assertThat(AiHeuristics.biggestSwingIndex(null)).isEqualTo(-1);
    }

    @Test
    void slaRisk_scalesWithPriorityAndAge() {
        assertThat(AiHeuristics.slaRisk("Critical", 5)).isEqualTo("HIGH");
        assertThat(AiHeuristics.slaRisk("Low", 1)).isEqualTo("LOW");
        assertThat(AiHeuristics.slaRisk("Medium", 60)).isEqualTo("MEDIUM");
        assertThat(AiHeuristics.slaRisk(null, 0)).isEqualTo("LOW");
    }

    // ── generation templates ──────────────────────────────────────────────────────

    @Test
    void renderTemplate_knownKindsReturnScaffold() {
        assertThat(AiHeuristics.renderTemplate("ac", "OTP login", Map.of())).contains("Acceptance criteria");
        assertThat(AiHeuristics.renderTemplate("acceptance_criteria", "login", Map.of())).contains("Acceptance criteria");
        assertThat(AiHeuristics.renderTemplate("test_cases", "x", Map.of())).contains("cross-tenant");
        assertThat(AiHeuristics.renderTemplate("tests", "x", Map.of())).contains("cross-tenant");
        assertThat(AiHeuristics.renderTemplate("comment", "ticket", Map.of())).contains("review and follow up");
        assertThat(AiHeuristics.renderTemplate("article", "topic", Map.of())).contains("Overview");
        assertThat(AiHeuristics.renderTemplate("release_notes", "v2", Map.of())).contains("Highlights");
        assertThat(AiHeuristics.blankScaffold("ac")).doesNotContain("Given a valid request");
        assertThat(AiHeuristics.blankScaffold("comment")).isEmpty();
    }

    @Test
    void renderTemplate_unknownKindThrows400() {
        // Audit finding #17: callers that send an unrecognised kind (e.g. 'sprint_plan', 'standup_draft')
        // must receive a 400 immediately instead of silently getting the user-story scaffold.
        org.springframework.http.HttpStatus expectedStatus = org.springframework.http.HttpStatus.BAD_REQUEST;
        for (String bad : new String[]{"sprint_plan", "standup_draft", "completely_unknown_kind", "story"}) {
            var ex = org.junit.jupiter.api.Assertions.assertThrows(
                ApiException.class,
                () -> AiHeuristics.renderTemplate(bad, "some topic", Map.of()),
                "Expected ApiException for kind=" + bad
            );
            assertThat(ex.getStatus()).isEqualTo(expectedStatus);
            assertThat(ex.getCode()).isEqualTo("UNKNOWN_GENERATION_KIND");
            assertThat(ex.getMessage()).contains(bad);
        }
    }

    // ── tokenization / overlap / matches ─────────────────────────────────────────

    @Test
    void tokenize_dropsStopwordsAndShortTokens() {
        assertThat(AiHeuristics.tokenize("the login is broken")).containsExactly("login", "broken");
        assertThat(AiHeuristics.tokenize(null)).isEmpty();
    }

    @Test
    void overlap_countsSharedTerms() {
        assertThat(AiHeuristics.overlap(List.of("login", "broken"), List.of("login", "page"))).isEqualTo(1);
        assertThat(AiHeuristics.overlap(List.of(), List.of("x"))).isZero();
    }

    @Test
    void matches_isBlankQueryTrue_andTokenContains() {
        WorkItem w = item("WEB-1", "Login page broken", "");
        assertThat(AiHeuristics.matches(w, "")).isTrue();
        assertThat(AiHeuristics.matches(w, "login")).isTrue();
        assertThat(AiHeuristics.matches(w, "kubernetes")).isFalse();
    }

    // ── NL → BQL fallback ─────────────────────────────────────────────────────────

    @Test
    void deterministicNlToBql_emptyTextReturnsEmpty() {
        assertThat(AiHeuristics.deterministicNlToBql("")).isEmpty();
    }

    @Test
    void deterministicNlToBql_combinesMultipleClauses() {
        String bql = AiHeuristics.deterministicNlToBql("in progress high priority bugs assigned to me");
        assertThat(bql).contains("status").contains("priority").contains("type")
            .contains("assignee = currentUser()");
    }

    @Test
    void deterministicNlToBql_unassignedAndTimeWindows() {
        assertThat(AiHeuristics.deterministicNlToBql("unassigned items")).contains("assignee IS EMPTY");
        assertThat(AiHeuristics.deterministicNlToBql("created this week")).contains("startOfWeek()");
        assertThat(AiHeuristics.deterministicNlToBql("overdue items")).contains("dueDate").contains("today");
    }

    @Test
    void deterministicNlToBql_outputCompilesAsCanonicalBql() {
        BqlCompiler compiler = new BqlCompiler();
        for (String phrase : List.of(
                "in progress high priority bugs assigned to me",
                "unassigned overdue items",
                "items created this week",
                "critical bugs created today")) {
            String bql = AiHeuristics.deterministicNlToBql(phrase);
            BqlCompiler.Compiled c = compiler.compile(bql, "user-1");
            assertThat(c.sql()).isNotNull();
        }
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

    private static Article article(String id, String title, String content) {
        Article a = new Article();
        a.setId(id);
        a.setTitle(title);
        a.setContent(content);
        return a;
    }

    private static Team team(String id, String name, String desc) {
        Team t = new Team();
        t.setId(id);
        t.setName(name);
        t.setDescription(desc);
        return t;
    }
}
