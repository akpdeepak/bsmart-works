package com.bcits.works.reporting;
import com.bcits.works.projects.api.Sprint;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.invocation.Invocation;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockingDetails;
import static org.mockito.Mockito.when;

/**
 * Characterization coverage for the role dashboard queries: each dashboard's result keys, the
 * empty-vs-populated branches (health percentages, null singletons), and the tenant boundary —
 * every SQL statement issued must scope by {@code workspace_id} and carry the workspace as a bind
 * parameter (RB-40 §1).
 */
@Tag("unit")
class RoleDashboardQueryServiceTest {

    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final RoleDashboardQueryService service = new RoleDashboardQueryService(jdbc);

    @BeforeEach
    void stubEmptyDefaults() {
        when(jdbc.queryForList(anyString(), any(Object[].class))).thenReturn(List.of());
        when(jdbc.queryForObject(anyString(), eq(Long.class), any(Object[].class))).thenReturn(0L);
    }

    /** Every statement this service issues must be workspace-scoped and bind the workspace id. */
    private void assertEveryQueryWasWorkspaceScoped(String workspaceId) {
        List<Invocation> calls = mockingDetails(jdbc).getInvocations().stream()
            .filter(inv -> inv.getMethod().getName().startsWith("queryFor")).toList();
        assertThat(calls).isNotEmpty();
        for (Invocation inv : calls) {
            String sql = (String) inv.getArgument(0);
            assertThat(sql).containsIgnoringCase("workspace_id = ?");
            List<Object> binds = new java.util.ArrayList<>();
            for (int a = 1; a < inv.getArguments().length; a++) {
                Object arg = inv.getArguments()[a];
                if (arg instanceof Object[] varargs) {
                    binds.addAll(java.util.Arrays.asList(varargs));
                } else {
                    binds.add(arg);
                }
            }
            assertThat(binds).as("binds of: %s", sql).contains(workspaceId);
        }
    }

    // ── Developer ───────────────────────────────────────────────────────────────

    @Test
    void developerDashboard_emptyWorkspaceProducesTheEmptyShape() {
        Map<String, Object> out = service.getDeveloperDashboard("dev-1", "WS-1");

        assertThat(out)
            .containsEntry("myOpenItemCount", 0)
            .containsEntry("weeklyMinutes", 0)
            .containsKeys("myOpenItems", "mySprintItems", "recentWorklogs", "dailyMinutes",
                "blockers", "overdueItems", "pendingReviews", "devSyncHighlights");
        assertThat(out.get("activeSprint")).isNull();
        assertEveryQueryWasWorkspaceScoped("WS-1");
    }

    @Test
    void developerDashboard_populatedWorkspaceSurfacesItemsSprintAndLoggedTime() {
        List<Map<String, Object>> myItems = List.of(
            Map.of("id", "WI-1", "title", "Fix bug", "priority", "CRITICAL"),
            Map.of("id", "WI-2", "title", "Write docs", "priority", "LOW"));
        when(jdbc.queryForList(contains("wi.assignee_id = ?"), any(Object[].class)))
            .thenReturn(myItems);
        when(jdbc.queryForList(contains("s.status = 'ACTIVE' GROUP BY s.id LIMIT 1"), any(Object[].class)))
            .thenReturn(List.of(Map.of("id", "SPR-1", "name", "Sprint 9")));
        when(jdbc.queryForList(contains("COALESCE(SUM(wl.time_spent_minutes), 0) as total_minutes"),
            any(Object[].class))).thenReturn(List.of(Map.of("total_minutes", 420L)));

        Map<String, Object> out = service.getDeveloperDashboard("dev-1", "WS-1");

        assertThat(out.get("myOpenItemCount")).isEqualTo(2);
        assertThat(out.get("weeklyMinutes")).isEqualTo(420L);
        assertThat((Map<String, Object>) out.get("activeSprint")).containsEntry("id", "SPR-1");
    }

    // ── Scrum master ────────────────────────────────────────────────────────────

    @Test
    void scrumMasterDashboard_computesSprintHealthFromTheFirstActiveSprint() {
        when(jdbc.queryForList(contains("WHERE p.workspace_id = ? AND s.status = 'ACTIVE' GROUP BY s.id"),
            any(Object[].class)))
            .thenReturn(List.of(new HashMap<>(Map.of("total_items", 4L, "done_items", 1L))));

        Map<String, Object> out = service.getScrumMasterDashboard("WS-1");

        assertThat(out.get("sprintHealth")).isEqualTo(25);
        assertThat(out).containsKeys("activeSprints", "velocityTrend", "teamCapacity",
            "scopeChanges", "highRiskItems", "risksSummary");
        assertEveryQueryWasWorkspaceScoped("WS-1");
    }

    @Test
    void scrumMasterDashboard_zeroItemSprintIsFullyHealthyAndNoSprintMeansNoHealth() {
        when(jdbc.queryForList(contains("s.status = 'ACTIVE' GROUP BY s.id"), any(Object[].class)))
            .thenReturn(List.of(new HashMap<>(Map.of("total_items", 0L, "done_items", 0L))));
        assertThat(service.getScrumMasterDashboard("WS-1").get("sprintHealth")).isEqualTo(100);

        when(jdbc.queryForList(contains("s.status = 'ACTIVE' GROUP BY s.id"), any(Object[].class)))
            .thenReturn(List.of());
        assertThat(service.getScrumMasterDashboard("WS-1")).doesNotContainKey("sprintHealth");
    }

    // ── Product owner ───────────────────────────────────────────────────────────

    @Test
    void productOwnerDashboard_reportsBacklogReleaseAndGroomingShape() {
        when(jdbc.queryForObject(contains("wi.sprint_id IS NULL"), eq(Long.class), any(Object[].class)))
            .thenReturn(7L);
        when(jdbc.queryForList(contains("UPPER(wi.type) = 'STORY'"), any(Object[].class)))
            .thenReturn(List.of(Map.of("total", 10L, "done", 4L)));

        Map<String, Object> out = service.getProductOwnerDashboard("WS-1", "po-1");

        assertThat(out.get("ungroomedCount")).isEqualTo(7L);
        assertThat((Map<String, Object>) out.get("featureStats")).containsEntry("done", 4L);
        assertThat(out).containsKeys("releases", "backlogByType", "priorityDistribution",
            "ungroomedItems", "upcomingReleases", "approvals");
        assertEveryQueryWasWorkspaceScoped("WS-1");
    }

    @Test
    void productOwnerDashboard_noStoriesMeansNullFeatureStats() {
        assertThat(service.getProductOwnerDashboard("WS-1", "po-1").get("featureStats")).isNull();
    }

    // ── Support agent ───────────────────────────────────────────────────────────

    @Test
    void supportAgentDashboard_flattensTheConversationCounters() {
        when(jdbc.queryForMap(anyString(), any(Object[].class))).thenReturn(Map.of(
            "escalated", 2L, "open", 5L, "assigned_to_me", 3L, "resolved_today", 1L));

        Map<String, Object> out = service.getSupportAgentDashboard("WS-1", "agent-1");

        assertThat(out)
            .containsEntry("escalatedCount", 2L)
            .containsEntry("openCount", 5L)
            .containsEntry("assignedToMeCount", 3L)
            .containsEntry("resolvedTodayCount", 1L)
            .containsKeys("conversations", "slaRisks", "importantMessages");
        assertEveryQueryWasWorkspaceScoped("WS-1");
    }

    // ── Executive ───────────────────────────────────────────────────────────────

    @Test
    void executiveDashboard_computesOverallHealthAndAlwaysIncludesSlaRisks() {
        when(jdbc.queryForList(contains("SELECT COUNT(*) as total, SUM(CASE WHEN status = 'Done'"),
            any(Object[].class)))
            .thenReturn(List.of(new HashMap<>(Map.of("total", 8L, "done", 6L))));

        Map<String, Object> out = service.getExecutiveDashboard("WS-1");

        assertThat(out.get("overallHealth")).isEqualTo(75);
        assertThat(out).containsKeys("projectPortfolio", "releaseSchedule", "raidSummary",
            "teamUtilization", "overdueActions", "slaRisks");
        assertEveryQueryWasWorkspaceScoped("WS-1");
    }

    @Test
    void executiveDashboard_anItemlessWorkspaceIsHealthyByDefinition() {
        when(jdbc.queryForList(contains("SELECT COUNT(*) as total, SUM(CASE WHEN status = 'Done'"),
            any(Object[].class)))
            .thenReturn(List.of(new HashMap<>(Map.of("total", 0L, "done", 0L))));

        assertThat(service.getExecutiveDashboard("WS-1").get("overallHealth")).isEqualTo(100);
    }

    // ── Admin ───────────────────────────────────────────────────────────────────

    @Test
    void adminDashboard_reportsMembershipSecurityAndActivityShape() {
        when(jdbc.queryForList(contains("MAX(e.occurred_at) as last_active"), any(Object[].class)))
            .thenReturn(List.of(Map.of("id", "u1"), Map.of("id", "u2"), Map.of("id", "u3")));
        when(jdbc.queryForList(contains("mfa_enabled"), any(Object[].class)))
            .thenReturn(List.of(Map.of("total", 3L, "mfa_enabled", 2L)));
        when(jdbc.queryForObject(contains("FROM events"), eq(Long.class), any(Object[].class)))
            .thenReturn(120L);

        Map<String, Object> out = service.getAdminDashboard("WS-1");

        assertThat(out.get("memberCount")).isEqualTo(3);
        assertThat(out.get("totalEventsWeek")).isEqualTo(120L);
        assertThat((Map<String, Object>) out.get("mfaStats")).containsEntry("mfa_enabled", 2L);
        assertThat(out).containsKeys("members", "roleDistribution", "recentAuditLog", "activityStats");
        assertEveryQueryWasWorkspaceScoped("WS-1");
    }

    @Test
    void adminDashboard_noMembersMeansNullMfaStats() {
        Map<String, Object> out = service.getAdminDashboard("WS-1");

        assertThat(out.get("memberCount")).isEqualTo(0);
        assertThat(out.get("mfaStats")).isNull();
    }
}
