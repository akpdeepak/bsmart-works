package com.example.demo;

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

    private final WorkItemController controller = new WorkItemController(
            repository, eventService, jdbc, notificationRepository, userRepository,
            emailService, batchService, authenticatedUser, rbac);

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

    // RbacService.require() throws 403 when the caller lacks the permission in that workspace.
    private void doThrowForbiddenOnRequire(String workspaceId, String permission) {
        org.mockito.Mockito.doThrow(ApiException.forbidden("denied"))
                .when(rbac).require(eq(CALLER), eq(workspaceId), eq(permission));
    }
}
