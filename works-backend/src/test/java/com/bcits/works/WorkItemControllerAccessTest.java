package com.bcits.works;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EmailService;
import com.bcits.works.shared.EventService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Cross-tenant / unauthorized access tests for the work-item write paths.
 *
 * <p>Tenant isolation here is enforced by manual per-call scoping (RB-40 §1): the controller
 * resolves the <em>resource's</em> workspace from its project, then gates the write through
 * {@link RbacService}. These tests prove that wiring — a caller acting on a resource in a
 * workspace they don't belong to is denied <b>before</b> anything is persisted — without needing a
 * live database. The complementary row-level test (does {@code findByWorkspaceId} actually filter
 * rows?) needs Testcontainers + real Postgres and is tracked as follow-up; it cannot run where no
 * Docker daemon is available.
 *
 * <p>Every write covers the two non-negotiable scenario categories from RB-05 Stage 3:
 * <b>unauthorized</b> and <b>cross-tenant</b>.
 */
@Tag("unit")
class WorkItemControllerAccessTest {

    private static final String CALLER = "user-A";        // member of ws-A only
    private static final String FOREIGN_WS = "ws-B";      // a workspace the caller is NOT in

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
            emailService, batchService, authenticatedUser, rbac, dodChecklists, extensions, workflowRules,
            statusConfig, wipLimits, mock(WorkItemBulkService.class), mock(WatcherService.class),
            mock(AutomationService.class), mock(FunnelService.class), mock(FieldVisibilityService.class));

    WorkItemControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
    }

    private WorkItem itemInForeignWorkspace() {
        WorkItem w = new WorkItem();
        w.setId("WRK-1");
        w.setProjectId("PROJ-B");          // lives under the foreign workspace
        w.setCreatedBy("user-B");
        w.setAssigneeId("user-B");
        w.setTitle("Foreign tenant item");
        return w;
    }

    // ── personal home (/my) ─────────────────────────────────────────────────────

    @Test
    void myWorkItems_scopesToTheCallersWorkspaces() {
        // The /my endpoint must route through the workspace-scoped query (findMyItemsScoped),
        // never the unscoped assignee lookup — so a user cannot see items assigned to them in a
        // workspace they no longer belong to. Row-level filtering is proven by the native @Query
        // under Testcontainers in CI; here we prove the controller uses the scoped path.
        when(repository.findMyItemsScoped(CALLER)).thenReturn(java.util.List.of());

        controller.myWorkItems();

        verify(repository).findMyItemsScoped(CALLER);
    }

    // ── create ────────────────────────────────────────────────────────────────

    @Test
    void createWorkItem_deniedForCallerOutsideTheResourceWorkspace() {
        WorkItem newItem = new WorkItem();
        newItem.setProjectId("PROJ-B");
        when(rbac.workspaceForProject("PROJ-B")).thenReturn(FOREIGN_WS);
        // Caller is not a member of ws-B → RbacService.require() denies with 403.
        doThrowForbiddenOnRequire(FOREIGN_WS, "create_items");

        assertThatThrownBy(() -> controller.createWorkItem(newItem))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(repository, never()).save(any());   // nothing persisted across the tenant boundary
    }

    // ── update ────────────────────────────────────────────────────────────────

    @Test
    void updateWorkItem_deniedWhenCallerCannotEditTheItem() {
        WorkItem existing = itemInForeignWorkspace();
        when(repository.findById("WRK-1")).thenReturn(Optional.of(existing));
        when(rbac.workspaceForProject("PROJ-B")).thenReturn(FOREIGN_WS);
        when(rbac.canEdit(CALLER, FOREIGN_WS, "user-B", "user-B")).thenReturn(false);

        assertThatThrownBy(() -> controller.updateWorkItem("WRK-1", new WorkItem()))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(repository, never()).save(any());
    }

    @Test
    void updateWorkItem_unknownItemThrowsNotFound() {
        when(repository.findById("WRK-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.updateWorkItem("WRK-missing", new WorkItem()))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(repository, never()).save(any());
    }

    // ── delete ────────────────────────────────────────────────────────────────

    @Test
    void deleteWorkItem_deniedForCallerOutsideTheResourceWorkspace() {
        when(repository.findById("WRK-1")).thenReturn(Optional.of(itemInForeignWorkspace()));
        when(rbac.workspaceForProject("PROJ-B")).thenReturn(FOREIGN_WS);
        doThrowForbiddenOnRequire(FOREIGN_WS, "delete_items");

        assertThatThrownBy(() -> controller.deleteWorkItem("WRK-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        // The soft-delete UPDATE must never run for a cross-tenant caller.
        verify(jdbc, never()).update(anyString(), any(), any());
    }

    @Test
    void deleteWorkItem_unknownItemReturns404WithoutTouchingTheDatabase() {
        when(repository.findById("WRK-missing")).thenReturn(Optional.empty());

        assertThat(controller.deleteWorkItem("WRK-missing").getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        verify(jdbc, never()).update(anyString(), any(), any());
    }

    // ── permanent delete (Trash "Delete permanently") ───────────────────────────
    // This destructive purge previously ran with NO RBAC and NO workspace check — a cross-tenant
    // IDOR letting any authenticated user purge any item by ID. It is now gated like the soft delete.

    @Test
    void permanentDelete_deniedForCallerOutsideTheResourceWorkspace() {
        when(repository.findById("WRK-1")).thenReturn(Optional.of(itemInForeignWorkspace()));
        when(rbac.workspaceForProject("PROJ-B")).thenReturn(FOREIGN_WS);
        doThrowForbiddenOnRequire(FOREIGN_WS, "delete_items");

        assertThatThrownBy(() -> controller.permanentDelete("WRK-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        // No cascade deletes, no repository.delete() across the tenant boundary.
        verify(jdbc, never()).update(anyString(), any(), any());
        verify(repository, never()).delete(any());
    }

    @Test
    void permanentDelete_unknownItemReturns404WithoutTouchingTheDatabase() {
        when(repository.findById("WRK-missing")).thenReturn(Optional.empty());

        assertThat(controller.permanentDelete("WRK-missing").getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        verify(repository, never()).delete(any());
    }

    @Test
    void permanentDelete_allowedForCallerInsideTheResourceWorkspacePurgesTheItem() {
        WorkItem own = new WorkItem();
        own.setId("WRK-2");
        own.setProjectId("PROJ-A");
        when(repository.findById("WRK-2")).thenReturn(Optional.of(own));
        when(rbac.workspaceForProject("PROJ-A")).thenReturn("ws-A");
        // rbac.require is a no-op (permitted) by default on the mock.

        assertThat(controller.permanentDelete("WRK-2").getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(rbac).require(eq(CALLER), eq("ws-A"), eq("delete_items"));
        verify(repository).delete(own);
    }

    // ── stars ────────────────────────────────────────────────────────────────

    @Test
    void starItem_deniedForCallerOutsideTheResourceWorkspace() {
        when(rbac.workspaceForWorkItem("WRK-1")).thenReturn(FOREIGN_WS);
        when(rbac.getUserTier(CALLER, FOREIGN_WS)).thenReturn(0);

        assertThatThrownBy(() -> controller.starItem("WRK-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(jdbc, never()).update(anyString(), any(), any());
    }

    @Test
    void unstarItem_deniedForCallerOutsideTheResourceWorkspace() {
        when(rbac.workspaceForWorkItem("WRK-1")).thenReturn(FOREIGN_WS);
        when(rbac.getUserTier(CALLER, FOREIGN_WS)).thenReturn(0);

        assertThatThrownBy(() -> controller.unstarItem("WRK-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(jdbc, never()).update(anyString(), any(), any());
    }

    @Test
    void starItem_allowedForCallerInsideTheResourceWorkspace() {
        when(rbac.workspaceForWorkItem("WRK-2")).thenReturn("ws-A");
        when(rbac.getUserTier(CALLER, "ws-A")).thenReturn(1);

        assertThat(controller.starItem("WRK-2")).containsEntry("starred", true);

        verify(jdbc).update(anyString(), eq(CALLER), eq("WRK-2"));
    }

    // RbacService.require() throws 403 when the caller lacks the permission in that workspace.
    private void doThrowForbiddenOnRequire(String workspaceId, String permission) {
        org.mockito.Mockito.doThrow(ApiException.forbidden("denied"))
                .when(rbac).require(eq(CALLER), eq(workspaceId), eq(permission));
    }
}
