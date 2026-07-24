package com.bcits.works;

import com.bcits.works.shared.CurrentWorkspace;

import com.bcits.works.auth.RbacService;
import com.bcits.works.auth.api.UserRepository;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;
import com.bcits.works.projects.api.Project;
import com.bcits.works.projects.api.ProjectRepository;
import com.bcits.works.projects.ProjectService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Tenant-isolation tests for {@link ProjectService} reads (RB-40 §1) — the leak fixed in I01-S05
 * (the controller previously fell back to {@code findAll()} across all tenants). Pure mocks, no DB.
 */
@Tag("unit")
class ProjectServiceTest {

    private final ProjectRepository projectRepository = mock(ProjectRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final EventService eventService = mock(EventService.class);
    private final RbacService rbac = mock(RbacService.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final CurrentWorkspace currentWorkspace = mock(CurrentWorkspace.class);

    private final ProjectService service =
            new ProjectService(projectRepository, userRepository, eventService, rbac, jdbc, currentWorkspace,
                    mock(com.bcits.works.shared.OperatingModelGate.class));

    private Project project(String id, String wsId) {
        Project p = new Project();
        p.setId(id);
        p.setWorkspaceId(wsId);
        return p;
    }

    @Test
    void list_withWorkspace_nonMember_is404_andNeverQueries() {
        when(rbac.getUserTier("USR-OUT", "WS-B")).thenReturn(0);
        assertThatThrownBy(() -> service.list("USR-OUT", "WS-B"))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        verify(projectRepository, never()).findByWorkspaceId(anyString());
    }

    @Test
    void list_withoutWorkspace_returnsOnlyCallersWorkspaceProjects() {
        when(jdbc.queryForList(anyString(), eq(String.class), eq("USR-1")))
                .thenReturn(List.of("WS-1", "WS-2"));
        when(projectRepository.findByWorkspaceIdIn(List.of("WS-1", "WS-2")))
                .thenReturn(List.of(project("PROJ-1", "WS-1")));

        var result = service.list("USR-1", null);

        assertThat(result).hasSize(1);
        verify(projectRepository, never()).findAll();   // the cross-tenant leak is gone
    }

    @Test
    void list_withoutWorkspace_noMemberships_returnsEmpty() {
        when(jdbc.queryForList(anyString(), eq(String.class), eq("USR-NONE"))).thenReturn(List.of());
        assertThat(service.list("USR-NONE", null)).isEmpty();
        verify(projectRepository, never()).findByWorkspaceIdIn(org.mockito.ArgumentMatchers.anyCollection());
    }

    @Test
    void getBySlug_nonMember_is404() {
        when(projectRepository.findBySlug("secret")).thenReturn(Optional.of(project("PROJ-X", "WS-B")));
        when(rbac.getUserTier("USR-OUT", "WS-B")).thenReturn(0);
        assertThatThrownBy(() -> service.getBySlug("USR-OUT", "secret"))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void create_withoutWorkspace_isBadRequest() {
        assertThatThrownBy(() -> service.create("USR-1", new Project()))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        verifyNoInteractions(eventService);
    }

    @Test
    void create_permitted_savesAndRecordsWorkspaceScopedEvent() {
        when(projectRepository.save(org.mockito.ArgumentMatchers.any(Project.class)))
                .thenAnswer(i -> i.getArgument(0));
        Project incoming = project(null, "WS-1");
        incoming.setName("Web Portal");
        incoming.setKeyPrefix("WEB");

        Project saved = service.create("USR-ADMIN", incoming);

        assertThat(saved.getId()).startsWith("PROJ-");
        assertThat(saved.getSlug()).isEqualTo("web");
        verify(rbac).require("USR-ADMIN", "WS-1", "manage_projects");
        verify(eventService).recordInWorkspace(eq("WS-1"), anyString(), eq("PROJECT_CREATED"),
                eq("USR-ADMIN"), org.mockito.ArgumentMatchers.anyMap());
    }
}
