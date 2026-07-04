package com.bcits.works;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.ApiException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for WorkflowRuleEngine — verifies conditions, validators, and post-functions.
 * No Spring context; all dependencies mocked.
 */
@Tag("unit")
class WorkflowRuleEngineTest {

    private WorkflowRepository workflowRepo;
    private WorkflowTransitionRepository transitionRepo;
    private WorkflowStatusRepository statusRepo;
    private FieldDefRepository fieldDefRepo;
    private RbacService rbac;
    private JdbcTemplate jdbc;
    private WorkflowRuleEngine engine;

    private static final String WS_ID      = "WS-TEST";
    private static final String ITEM_ID    = "WI-001";
    private static final String USER_ID    = "USR-001";
    private static final String ASSIGNEE   = "USR-002";
    private static final String WF_ID      = "WF-001";
    private static final String STATUS_A   = "WFS-OPEN";
    private static final String STATUS_B   = "WFS-DONE";
    private static final String TRANS_ID   = "WFT-001";

    @BeforeEach
    void setUp() {
        workflowRepo  = mock(WorkflowRepository.class);
        transitionRepo = mock(WorkflowTransitionRepository.class);
        statusRepo    = mock(WorkflowStatusRepository.class);
        fieldDefRepo  = mock(FieldDefRepository.class);
        rbac          = mock(RbacService.class);
        jdbc          = mock(JdbcTemplate.class);
        engine = new WorkflowRuleEngine(workflowRepo, transitionRepo, statusRepo, fieldDefRepo, rbac, jdbc);
    }

    // ── No workflow configured → no-op ─────────────────────────────────────────

    @Test
    void noWorkflow_noOpForStatusChange() {
        when(jdbc.queryForObject(contains("SELECT type"), eq(String.class), eq(ITEM_ID))).thenReturn("Task");
        when(workflowRepo.findByWorkspaceIdAndItemType(WS_ID, "Task")).thenReturn(List.of());
        when(workflowRepo.findByWorkspaceId(WS_ID)).thenReturn(List.of());

        assertThatCode(() -> engine.enforceTransitionRules(ITEM_ID, "Open", "Done", USER_ID, WS_ID))
                .doesNotThrowAnyException();
    }

    @Test
    void nullFromStatus_noOp() {
        assertThatCode(() -> engine.enforceTransitionRules(ITEM_ID, null, "Done", USER_ID, WS_ID))
                .doesNotThrowAnyException();
    }

    @Test
    void sameStatus_noOp() {
        assertThatCode(() -> engine.enforceTransitionRules(ITEM_ID, "Open", "Open", USER_ID, WS_ID))
                .doesNotThrowAnyException();
    }

    // ── IS_ASSIGNEE condition ──────────────────────────────────────────────────

    @Test
    void condition_isAssignee_passesWhenUserIsAssignee() {
        setupTransition("""
            [{"type":"IS_ASSIGNEE"}]
            """, "[]", "[]");
        when(jdbc.queryForObject(contains("assignee_id"), eq(String.class), eq(ITEM_ID))).thenReturn(USER_ID);

        assertThatCode(() -> engine.enforceTransitionRules(ITEM_ID, "Open", "Done", USER_ID, WS_ID))
                .doesNotThrowAnyException();
    }

    @Test
    void condition_isAssignee_failsWhenUserIsNotAssignee() {
        setupTransition("""
            [{"type":"IS_ASSIGNEE"}]
            """, "[]", "[]");
        when(jdbc.queryForObject(contains("assignee_id"), eq(String.class), eq(ITEM_ID))).thenReturn(ASSIGNEE);

        assertThatThrownBy(() -> engine.enforceTransitionRules(ITEM_ID, "Open", "Done", USER_ID, WS_ID))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("assignee");
    }

    // ── HAS_MIN_TIER condition ─────────────────────────────────────────────────

    @Test
    void condition_hasMinTier_passesWhenTierSufficient() {
        setupTransition("""
            [{"type":"HAS_MIN_TIER","tier":3}]
            """, "[]", "[]");
        when(rbac.getUserTier(USER_ID, WS_ID)).thenReturn(3);

        assertThatCode(() -> engine.enforceTransitionRules(ITEM_ID, "Open", "Done", USER_ID, WS_ID))
                .doesNotThrowAnyException();
    }

    @Test
    void condition_hasMinTier_failsWhenTierInsufficient() {
        setupTransition("""
            [{"type":"HAS_MIN_TIER","tier":4}]
            """, "[]", "[]");
        when(rbac.getUserTier(USER_ID, WS_ID)).thenReturn(2);

        assertThatThrownBy(() -> engine.enforceTransitionRules(ITEM_ID, "Open", "Done", USER_ID, WS_ID))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("role");
    }

    // ── REQUIRE_COMMENT validator ─────────────────────────────────────────────

    @Test
    void validator_requireComment_passesWhenCommentExists() {
        setupTransition("[]", """
            [{"type":"REQUIRE_COMMENT"}]
            """, "[]");
        when(jdbc.queryForObject(contains("COUNT(*)"), eq(Integer.class), eq(ITEM_ID))).thenReturn(1);

        assertThatCode(() -> engine.enforceTransitionRules(ITEM_ID, "Open", "Done", USER_ID, WS_ID))
                .doesNotThrowAnyException();
    }

    @Test
    void validator_requireComment_failsWhenNoComments() {
        setupTransition("[]", """
            [{"type":"REQUIRE_COMMENT"}]
            """, "[]");
        when(jdbc.queryForObject(contains("COUNT(*)"), eq(Integer.class), eq(ITEM_ID))).thenReturn(0);

        assertThatThrownBy(() -> engine.enforceTransitionRules(ITEM_ID, "Open", "Done", USER_ID, WS_ID))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("comment");
    }

    // ── ASSIGN_TO_CURRENT_USER post-function ──────────────────────────────────

    @Test
    void postFunction_assignToCurrentUser_updatesAssignee() {
        setupTransition("[]", "[]", """
            [{"type":"ASSIGN_TO_CURRENT_USER"}]
            """);

        engine.executePostFunctions(ITEM_ID, "Open", "Done", USER_ID, WS_ID);

        verify(jdbc).update(contains("UPDATE work_items SET assignee_id"), eq(USER_ID), eq(ITEM_ID));
    }

    // ── FIELD_EQUALS condition — workspace-scoped field lookup (RB-40 §1) ─────

    @Test
    void condition_fieldEquals_passesWhenFieldMatchesExpectedValueInWorkspace() {
        setupTransition("""
            [{"type":"FIELD_EQUALS","fieldKey":"priority","value":"HIGH"}]
            """, "[]", "[]");
        // getCustomFieldValue must scope field_def by workspace_id — return "HIGH" only for WS_ID.
        when(jdbc.queryForObject(contains("fd.workspace_id"), eq(String.class),
                eq(ITEM_ID), eq("priority"), eq(WS_ID))).thenReturn("HIGH");

        assertThatCode(() -> engine.enforceTransitionRules(ITEM_ID, "Open", "Done", USER_ID, WS_ID))
                .doesNotThrowAnyException();
    }

    @Test
    void condition_fieldEquals_failsWhenFieldValueDoesNotMatch() {
        setupTransition("""
            [{"type":"FIELD_EQUALS","fieldKey":"priority","value":"HIGH"}]
            """, "[]", "[]");
        when(jdbc.queryForObject(contains("fd.workspace_id"), eq(String.class),
                eq(ITEM_ID), eq("priority"), eq(WS_ID))).thenReturn("LOW");

        assertThatThrownBy(() -> engine.enforceTransitionRules(ITEM_ID, "Open", "Done", USER_ID, WS_ID))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("priority");
    }

    // ── REQUIRE_FIELD validator — workspace-scoped field lookup (RB-40 §1) ───

    @Test
    void validator_requireField_passesWhenFieldFilledInWorkspace() {
        setupTransition("[]", """
            [{"type":"REQUIRE_FIELD","fieldKey":"resolution"}]
            """, "[]");
        when(jdbc.queryForObject(contains("fd.workspace_id"), eq(String.class),
                eq(ITEM_ID), eq("resolution"), eq(WS_ID))).thenReturn("Fixed");

        assertThatCode(() -> engine.enforceTransitionRules(ITEM_ID, "Open", "Done", USER_ID, WS_ID))
                .doesNotThrowAnyException();
    }

    @Test
    void validator_requireField_failsWhenFieldBlankInWorkspace() {
        setupTransition("[]", """
            [{"type":"REQUIRE_FIELD","fieldKey":"resolution"}]
            """, "[]");
        when(jdbc.queryForObject(contains("fd.workspace_id"), eq(String.class),
                eq(ITEM_ID), eq("resolution"), eq(WS_ID))).thenReturn(null);

        assertThatThrownBy(() -> engine.enforceTransitionRules(ITEM_ID, "Open", "Done", USER_ID, WS_ID))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("resolution");
    }

    // ── SET_FIELD post-function — workspace-scoped field_def lookup (RB-40 §1) ─

    @Test
    void postFunction_setField_scopesFieldDefLookupToWorkspace() {
        setupTransition("[]", "[]", """
            [{"type":"SET_FIELD","fieldKey":"stage","value":"review"}]
            """);
        // upsertCustomField must SELECT id FROM field_def WHERE field_key=? AND workspace_id=?
        when(jdbc.queryForObject(contains("workspace_id"), eq(String.class),
                eq("stage"), eq(WS_ID))).thenReturn("FD-001");

        engine.executePostFunctions(ITEM_ID, "Open", "Done", USER_ID, WS_ID);

        // The upsert must follow through with the resolved field def id.
        // Signature: update(sql, generatedId, workItemId, fieldDefId, value, createdAt, updatedAt)
        verify(jdbc).update(contains("work_item_field_value"), any(), eq(ITEM_ID), eq("FD-001"),
                eq("review"), any(), any());
    }

    @Test
    void postFunction_setField_noOpWhenFieldDefNotFoundInWorkspace() {
        setupTransition("[]", "[]", """
            [{"type":"SET_FIELD","fieldKey":"nonexistent","value":"x"}]
            """);
        // field_def not found in this workspace — queryForObject throws → upsert must NOT run.
        when(jdbc.queryForObject(contains("workspace_id"), eq(String.class),
                eq("nonexistent"), eq(WS_ID))).thenThrow(new RuntimeException("not found"));

        assertThatCode(() -> engine.executePostFunctions(ITEM_ID, "Open", "Done", USER_ID, WS_ID))
                .doesNotThrowAnyException();

        // The INSERT/UPSERT for work_item_field_value must never execute.
        verify(jdbc, never()).update(contains("work_item_field_value"),
                eq(ITEM_ID), eq("nonexistent"), eq("x"));
    }

    // ── Unknown rule types → silently skipped ─────────────────────────────────

    @Test
    void unknownRuleType_skippedWithoutError() {
        setupTransition("""
            [{"type":"UNKNOWN_CONDITION_XYZ"}]
            """, """
            [{"type":"UNKNOWN_VALIDATOR_XYZ"}]
            """, "[]");

        assertThatCode(() -> engine.enforceTransitionRules(ITEM_ID, "Open", "Done", USER_ID, WS_ID))
                .doesNotThrowAnyException();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void setupTransition(String conditions, String validators, String postFunctions) {
        when(jdbc.queryForObject(contains("SELECT type"), eq(String.class), eq(ITEM_ID))).thenReturn("Task");

        Workflow wf = new Workflow();
        wf.setId(WF_ID);
        wf.setWorkspaceId(WS_ID);
        wf.setItemType("Task");
        when(workflowRepo.findByWorkspaceIdAndItemType(WS_ID, "Task")).thenReturn(List.of(wf));

        WorkflowStatus statusA = new WorkflowStatus();
        statusA.setId(STATUS_A);
        statusA.setName("Open");
        WorkflowStatus statusB = new WorkflowStatus();
        statusB.setId(STATUS_B);
        statusB.setName("Done");
        when(statusRepo.findByWorkflowIdOrderByPosition(WF_ID)).thenReturn(List.of(statusA, statusB));

        WorkflowTransition trans = new WorkflowTransition();
        trans.setId(TRANS_ID);
        trans.setWorkflowId(WF_ID);
        trans.setFromStatus(STATUS_A);
        trans.setToStatus(STATUS_B);
        trans.setConditions(conditions.trim());
        trans.setValidators(validators.trim());
        trans.setPostFunctions(postFunctions.trim());
        when(transitionRepo.findByWorkflowIdAndFromStatusAndToStatus(WF_ID, STATUS_A, STATUS_B))
                .thenReturn(List.of(trans));
    }
}
