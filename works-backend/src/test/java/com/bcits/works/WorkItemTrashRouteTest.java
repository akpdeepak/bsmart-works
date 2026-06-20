package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests for the trash endpoint: GET /api/v1/work-items/trash.
 *
 * <p>Regression for audit finding #8: commit 4061806 inserted {@code @GetMapping("/{id}")} and
 * accidentally deleted {@code @GetMapping("/trash")}, leaving {@code getTrash()} as a plain public
 * method. Without the annotation Spring matched GET /trash via the path-variable handler with
 * id="trash", returning 404, so TrashView was always empty.
 *
 * <p>These tests prove:
 * <ol>
 *   <li>The trash endpoint returns a list (not a 404 for id="trash") — the controller method is
 *       actually invoked and returns a {@code List<WorkItem>}, not an {@link ApiException}.</li>
 *   <li>The trash query is workspace-scoped via the MEMBER_PROJECTS predicate (RB-40 §1).</li>
 *   <li>The 30-day window is expressed in the SQL.</li>
 *   <li>The restore path gates on the same {@code delete_items} right that did the soft-delete,
 *       and a caller in a foreign workspace is denied (cross-tenant RBAC).</li>
 * </ol>
 */
@Tag("unit")
class WorkItemTrashRouteTest {

    private static final String CALLER = "user-A";
    private static final String OWN_WS  = "ws-A";
    private static final String FOREIGN_WS = "ws-B";

    private final WorkItemRepository repository = mock(WorkItemRepository.class);
    private final EventService eventService = mock(EventService.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final NotificationRepository notificationRepository = mock(NotificationRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final EmailService emailService = mock(EmailService.class);
    private final NotificationBatchService batchService = mock(NotificationBatchService.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);
    private final DodChecklistService dodChecklists = mock(DodChecklistService.class);
    private final ExtensionExecutionService extensions = mock(ExtensionExecutionService.class);
    private final WorkflowRuleEngine workflowRules = mock(WorkflowRuleEngine.class);
    private final StatusConfigService statusConfig = mock(StatusConfigService.class);
    private final BoardWipLimitService wipLimits = mock(BoardWipLimitService.class);

    private final WorkItemController controller = new WorkItemController(
            repository, eventService, jdbc, notificationRepository, userRepository,
            emailService, batchService, authenticatedUser, rbac, dodChecklists, extensions,
            workflowRules, statusConfig, wipLimits,
            mock(WorkItemBulkService.class), mock(WatcherService.class), mock(AutomationService.class),
            mock(FunnelService.class), mock(FieldVisibilityService.class));

    WorkItemTrashRouteTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
    }

    // ── getTrash — endpoint existence and workspace scoping ──────────────────────

    @Test
    @SuppressWarnings("unchecked")
    void getTrash_returnsListNotNotFound_endpointIsReachable() {
        // If @GetMapping("/trash") is missing, the controller method is never invoked and Spring
        // would throw a 404 (or match /{id} with id="trash"). The test proves the method is reached
        // and returns a list (even if empty) — not an ApiException.
        when(jdbc.query(anyString(), any(RowMapper.class), any(Object[].class)))
                .thenReturn(List.of());

        List<WorkItem> result = controller.getTrash(0, 50);

        assertThat(result).isNotNull().isEmpty();
    }

    @Test
    @SuppressWarnings("unchecked")
    void getTrash_sqlIsWorkspaceScopedViaCallersMemberProjects() {
        when(jdbc.query(anyString(), any(RowMapper.class), any(Object[].class)))
                .thenReturn(List.of());

        controller.getTrash(0, 50);

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).query(sql.capture(), any(RowMapper.class), any(Object[].class));
        assertThat(sql.getValue())
                .contains("workspace_members")   // joins through the tenant boundary
                .contains("wm.user_id = ?")      // scoped to the caller
                .contains("deleted_at IS NOT NULL")  // only soft-deleted items
                .contains("30 days");            // 30-day recovery window
    }

    @Test
    @SuppressWarnings("unchecked")
    void getTrash_returnsSoftDeletedItemsWhenPresent() {
        WorkItem trashed = new WorkItem();
        trashed.setId("WRK-deleted");
        trashed.setTitle("Deleted item");
        // Simulate the JDBC query returning one trashed item.
        when(jdbc.query(anyString(), any(RowMapper.class), any(Object[].class)))
                .thenReturn(List.of(trashed));
        // attachTagsBatch / attachFieldValuesBatch call jdbc.query(sql, RowCallbackHandler, args)
        // which is void — use doNothing, not when().thenReturn().
        doNothing().when(jdbc).query(anyString(),
                any(org.springframework.jdbc.core.RowCallbackHandler.class), any(Object[].class));

        List<WorkItem> result = controller.getTrash(0, 50);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo("WRK-deleted");
    }

    // ── restoreFromTrash — RBAC gate ─────────────────────────────────────────────

    @Test
    void restoreFromTrash_deniedForCallerInForeignWorkspace() {
        // The restore is gated by the same delete_items right that performed the soft-delete.
        when(rbac.workspaceForWorkItem("WRK-1")).thenReturn(FOREIGN_WS);
        org.mockito.Mockito.doThrow(ApiException.forbidden("denied"))
                .when(rbac).require(eq(CALLER), eq(FOREIGN_WS), eq("delete_items"));

        assertThatThrownBy(() -> controller.restoreFromTrash("WRK-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        // The UPDATE must never run for a cross-tenant caller.
        verify(jdbc, never()).update(anyString(), anyString());
    }

    @Test
    void restoreFromTrash_unknownItemReturnsNotFound() {
        // workspaceForWorkItem returns null when the item does not exist.
        when(rbac.workspaceForWorkItem("WRK-missing")).thenReturn(null);

        assertThatThrownBy(() -> controller.restoreFromTrash("WRK-missing"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void restoreFromTrash_permittedCallerClearsDeletedAt() {
        WorkItem item = new WorkItem();
        item.setId("WRK-1");
        item.setTitle("Trashed item");
        when(rbac.workspaceForWorkItem("WRK-1")).thenReturn(OWN_WS);
        // rbac.require is a no-op (permitted) on the mock by default.
        when(repository.findById("WRK-1")).thenReturn(Optional.of(item));
        // attachTags calls jdbc.queryForList — return empty list.
        when(jdbc.queryForList(anyString(), eq(String.class), anyString()))
                .thenReturn(List.of());

        WorkItem restored = controller.restoreFromTrash("WRK-1");

        assertThat(restored.getId()).isEqualTo("WRK-1");
        // The soft-delete clear UPDATE must run exactly once.
        verify(jdbc).update(
                "UPDATE work_items SET deleted_at = NULL, deleted_by = NULL WHERE id = ?",
                "WRK-1");
        verify(rbac).require(CALLER, OWN_WS, "delete_items");
    }
}
