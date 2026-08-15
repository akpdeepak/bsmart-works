package com.bcits.works;

import com.bcits.works.shared.CurrentWorkspace;

import com.bcits.works.auth.RbacService;
import com.bcits.works.auth.api.UserRepository;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;
import com.bcits.works.projects.api.Project;
import com.bcits.works.projects.ProjectController;
import com.bcits.works.projects.api.ProjectRepository;
import com.bcits.works.projects.ProjectService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Cross-tenant / unauthorized access tests for the project write paths (RB-40 §1, RB-05 Stage 3).
 * Each write resolves the project's owning workspace and gates through {@link RbacService}; a caller
 * outside that workspace is denied with 403 before anything is persisted. Pure unit level — no DB.
 */
@Tag("unit")
class ProjectControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";   // a workspace the caller is not in
    private static final String PERM = "manage_projects";

    private final ProjectRepository projectRepository = mock(ProjectRepository.class);
    private final EventService eventService = mock(EventService.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);
    private final CurrentWorkspace currentWorkspace = mock(CurrentWorkspace.class);

    // The controller is thin (I01-S05): it delegates to ProjectService where RBAC is enforced.
    // Wiring a real service through mocked deps keeps this an end-to-end controller access test.
    private final ProjectService projectService = new ProjectService(
            projectRepository, null, null, null, userRepository, eventService, rbac, jdbc, currentWorkspace,
            mock(com.bcits.works.shared.OperatingModelGate.class));

    private final ProjectController controller = new ProjectController(projectService, authenticatedUser);

    ProjectControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        doThrow(ApiException.forbidden("denied")).when(rbac).require(eq(CALLER), eq(FOREIGN_WS), eq(PERM));
    }

    private Project projectInForeignWorkspace() {
        Project p = new Project();
        p.setId("PROJ-1");
        p.setWorkspaceId(FOREIGN_WS);
        p.setName("Foreign project");
        return p;
    }

    @Test
    void createProject_deniedForCallerOutsideTheTargetWorkspace() {
        Project incoming = new Project();
        incoming.setWorkspaceId(FOREIGN_WS);

        assertThatThrownBy(() -> controller.createProject(incoming))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(projectRepository, never()).save(any());
    }

    @Test
    void updateProject_deniedForCallerOutsideTheProjectWorkspace() {
        when(projectRepository.findById("PROJ-1")).thenReturn(Optional.of(projectInForeignWorkspace()));

        assertThatThrownBy(() -> controller.updateProject("PROJ-1", new Project()))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(projectRepository, never()).save(any());
    }

    @Test
    void updateProject_unknownProjectThrowsNotFound() {
        when(projectRepository.findById("PROJ-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.updateProject("PROJ-missing", new Project()))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void deleteProject_deniedForCallerOutsideTheProjectWorkspace() {
        when(projectRepository.findById("PROJ-1")).thenReturn(Optional.of(projectInForeignWorkspace()));

        assertThatThrownBy(() -> controller.deleteProject("PROJ-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(projectRepository, never()).deleteById(any());
    }
}
