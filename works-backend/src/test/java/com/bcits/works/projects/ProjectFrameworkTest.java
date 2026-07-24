package com.bcits.works.projects;
import com.bcits.works.projects.api.Project;
import com.bcits.works.projects.api.ProjectRepository;

import com.bcits.works.shared.CurrentWorkspace;
import com.bcits.works.auth.api.UserRepository;
import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.EventService;
import com.bcits.works.shared.RbacGate;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Framework engine (V1.6): each of the six frameworks declares real delivery capabilities, and the
 * server enforces sprint availability by framework (RB-20 §1 — behaviour is gated, not just a label).
 * Replaces the former dead {@code getFrameworkCapabilities} that covered only three frameworks.
 */
@Tag("unit")
class ProjectFrameworkTest {

    private final ProjectRepository projectRepository = mock(ProjectRepository.class);
    private final ProjectService service = new ProjectService(
            projectRepository, mock(UserRepository.class), mock(EventService.class),
            mock(RbacGate.class), mock(JdbcTemplate.class), mock(CurrentWorkspace.class),
            mock(com.bcits.works.shared.OperatingModelGate.class));

    private Project projectWith(ProjectFramework framework) {
        Project p = new Project();
        p.setId("PROJ-1");
        p.setWorkspaceId("WS-1");
        p.setFramework(framework);
        return p;
    }

    @Test
    void allSixFrameworksDeclareSprintCapability() {
        assertThat(ProjectFramework.SCRUM.isSprintsEnabled()).isTrue();
        assertThat(ProjectFramework.XP.isSprintsEnabled()).isTrue();
        assertThat(ProjectFramework.DSDM.isSprintsEnabled()).isTrue();
        assertThat(ProjectFramework.KANBAN.isSprintsEnabled()).isFalse();
        assertThat(ProjectFramework.WATERFALL.isSprintsEnabled()).isFalse();
        assertThat(ProjectFramework.LEAN.isSprintsEnabled()).isFalse();
        // Kanban runs WIP limits; Scrum does not.
        assertThat(ProjectFramework.KANBAN.isWipLimitsEnabled()).isTrue();
        assertThat(ProjectFramework.SCRUM.isWipLimitsEnabled()).isFalse();
    }

    @Test
    void capabilitiesMapHasStableKeysForEveryFramework() {
        for (ProjectFramework f : ProjectFramework.values()) {
            assertThat(f.capabilities()).containsKeys(
                    ProjectFramework.SPRINTS_ENABLED,
                    ProjectFramework.WIP_LIMITS_ENABLED,
                    ProjectFramework.CEREMONIES_ENABLED);
        }
    }

    @Test
    void requireFrameworkCapability_kanban_rejectsSprints() {
        when(projectRepository.findById("PROJ-1")).thenReturn(Optional.of(projectWith(ProjectFramework.KANBAN)));
        assertThatThrownBy(() ->
                service.requireFrameworkCapability("PROJ-1", ProjectFramework.SPRINTS_ENABLED))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void requireFrameworkCapability_scrum_allowsSprints() {
        when(projectRepository.findById("PROJ-1")).thenReturn(Optional.of(projectWith(ProjectFramework.SCRUM)));
        // Does not throw.
        service.requireFrameworkCapability("PROJ-1", ProjectFramework.SPRINTS_ENABLED);
    }

    @Test
    void requireFrameworkCapability_nullFramework_treatedAsCustom_allowsSprints() {
        when(projectRepository.findById("PROJ-1")).thenReturn(Optional.of(projectWith(null)));
        service.requireFrameworkCapability("PROJ-1", ProjectFramework.SPRINTS_ENABLED);
    }
}
