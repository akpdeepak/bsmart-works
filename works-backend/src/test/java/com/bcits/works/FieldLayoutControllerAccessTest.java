package com.bcits.works;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;
import com.bcits.works.workitems.FieldLayout;
import com.bcits.works.workitems.FieldLayoutController;
import com.bcits.works.workitems.FieldLayoutRepository;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Map;
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

@Tag("unit")
class FieldLayoutControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String WORKSPACE = "ws-A";
    private static final String PROJECT = "PRJ-1";

    private final FieldLayoutRepository layoutRepo = mock(FieldLayoutRepository.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);
    private final FieldLayoutController controller =
            new FieldLayoutController(layoutRepo, authenticatedUser, rbac);

    FieldLayoutControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        when(rbac.workspaceForProject(PROJECT)).thenReturn(WORKSPACE);
    }

    @Test
    void listByProjectResolvesWorkspaceBeforeQueryingLayouts() {
        controller.list(null, PROJECT);

        verify(rbac).require(CALLER, WORKSPACE, "view_items");
        verify(layoutRepo).findByWorkspaceId(WORKSPACE);
        verify(layoutRepo, never()).findByWorkspaceId(PROJECT);
    }

    @Test
    void getByTypeRequiresWorkspaceOrProjectInsteadOfDefaulting() {
        assertThatThrownBy(() -> controller.getByType("STORY", null, null))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));

        verify(layoutRepo, never()).findByWorkspaceIdAndItemType(eq("WS-001"), anyString());
    }

    @Test
    void saveByProjectRequiresManageProjectsBeforeMutation() {
        doThrow(ApiException.forbidden("denied")).when(rbac).require(CALLER, WORKSPACE, "manage_projects");

        assertThatThrownBy(() -> controller.saveLayout("STORY", PROJECT, null, Map.of("layoutJson", "[]")))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(layoutRepo, never()).save(any());
    }

    @Test
    void unknownProjectReturnsNotFoundBeforeQueryingLayouts() {
        when(rbac.workspaceForProject("PRJ-missing")).thenReturn(null);

        assertThatThrownBy(() -> controller.list(null, "PRJ-missing"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(layoutRepo, never()).findByWorkspaceId(anyString());
    }

    @Test
    void getByWorkspaceReturnsEmptyLayoutScopedToWorkspace() {
        when(layoutRepo.findByWorkspaceIdAndItemType(WORKSPACE, "STORY")).thenReturn(Optional.empty());

        FieldLayout layout = controller.getByType("STORY", null, WORKSPACE);

        verify(rbac).require(CALLER, WORKSPACE, "view_items");
        assertThat(layout.getWorkspaceId()).isEqualTo(WORKSPACE);
        assertThat(layout.getLayoutJson()).isEqualTo("[]");
    }
}
