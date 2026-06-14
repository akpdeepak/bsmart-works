package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Cross-tenant / unauthorized access tests for the sprint write paths (RB-40 §1, RB-05 Stage 3).
 * Sprints resolve their workspace via the parent project; a caller outside that workspace is denied
 * with 403 before the sprint is persisted or its items are touched. Pure unit level — no DB.
 */
@Tag("unit")
class SprintControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";
    private static final String PERM = "manage_sprints";

    private final SprintRepository sprintRepository = mock(SprintRepository.class);
    private final WorkItemRepository workItemRepository = mock(WorkItemRepository.class);
    private final EventService eventService = mock(EventService.class);
    private final SprintDao sprintDao = mock(SprintDao.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);
    private final StatusConfigService statusConfig = mock(StatusConfigService.class);

    private final SprintController controller = new SprintController(
            sprintRepository, workItemRepository, eventService, sprintDao, authenticatedUser, rbac, statusConfig);

    SprintControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        when(rbac.workspaceForProject("PROJ-B")).thenReturn(FOREIGN_WS);
        doThrow(ApiException.forbidden("denied")).when(rbac).require(eq(CALLER), eq(FOREIGN_WS), eq(PERM));
    }

    private Sprint sprintInForeignWorkspace() {
        Sprint s = new Sprint();
        s.setId("SPR-1");
        s.setProjectId("PROJ-B");        // project belongs to the foreign workspace
        s.setName("Foreign sprint");
        s.setStatus("PLANNING");
        return s;
    }

    @Test
    void createSprint_deniedForCallerOutsideTheProjectWorkspace() {
        Sprint incoming = new Sprint();
        incoming.setProjectId("PROJ-B");

        assertThatThrownBy(() -> controller.createSprint(incoming))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(sprintRepository, never()).save(any());
    }

    @Test
    void updateSprint_deniedForCallerOutsideTheProjectWorkspace() {
        when(sprintRepository.findById("SPR-1")).thenReturn(Optional.of(sprintInForeignWorkspace()));

        assertThatThrownBy(() -> controller.updateSprint("SPR-1", new Sprint()))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(sprintRepository, never()).save(any());
    }

    @Test
    void updateSprint_unknownSprintThrowsNotFound() {
        when(sprintRepository.findById("SPR-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.updateSprint("SPR-missing", new Sprint()))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void deleteSprint_deniedForCallerOutsideTheProjectWorkspace() {
        when(sprintRepository.findById("SPR-1")).thenReturn(Optional.of(sprintInForeignWorkspace()));

        assertThatThrownBy(() -> controller.deleteSprint("SPR-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        // The delete must not run for a cross-tenant caller.
        verify(sprintRepository, never()).deleteById(any());
    }

    @Test
    void getSprintItems_hiddenFromCallerOutsideTheProjectWorkspace() {
        when(sprintRepository.findById("SPR-1")).thenReturn(Optional.of(sprintInForeignWorkspace()));
        when(rbac.getUserTier(CALLER, FOREIGN_WS)).thenReturn(0); // not a member of the sprint's workspace

        // A read leak is the worst case here: deny with 404 rather than return another tenant's items.
        assertThatThrownBy(() -> controller.getSprintItems("SPR-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void addItemToSprint_deniedForCallerOutsideTheProjectWorkspace() {
        when(sprintRepository.findById("SPR-1")).thenReturn(Optional.of(sprintInForeignWorkspace()));

        assertThatThrownBy(() -> controller.addItemToSprint("SPR-1", "WI-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(sprintDao, never()).assignItemToSprint(anyString(), anyString());
    }

    @Test
    void addItemToSprint_deniedWhenItemBelongsToAnotherWorkspace() {
        // Caller can manage this sprint, but the item lives in a different workspace — must not be pulled in.
        Sprint own = new Sprint();
        own.setId("SPR-2");
        own.setProjectId("PROJ-A");
        when(sprintRepository.findById("SPR-2")).thenReturn(Optional.of(own));
        when(rbac.workspaceForProject("PROJ-A")).thenReturn("ws-A");
        when(rbac.workspaceForWorkItem("WI-foreign")).thenReturn(FOREIGN_WS);

        assertThatThrownBy(() -> controller.addItemToSprint("SPR-2", "WI-foreign"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(sprintDao, never()).assignItemToSprint(anyString(), anyString());
    }

    @Test
    void removeItemFromSprint_deniedForCallerOutsideTheProjectWorkspace() {
        when(sprintRepository.findById("SPR-1")).thenReturn(Optional.of(sprintInForeignWorkspace()));

        assertThatThrownBy(() -> controller.removeItemFromSprint("SPR-1", "WI-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(sprintDao, never()).removeItemFromSprint(anyString(), anyString());
    }
}
