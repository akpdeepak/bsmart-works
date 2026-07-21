package com.bcits.works;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;
import com.bcits.works.projects.ProjectTeamMemberRepository;
import com.bcits.works.projects.Sprint;
import com.bcits.works.projects.SprintCapacityService;
import com.bcits.works.projects.SprintDao;
import com.bcits.works.projects.SprintMemberCapacityRepository;
import com.bcits.works.projects.SprintRepository;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tenant-isolation and authorization tests for the Capacity board (RB-40 §1, RB-05 Stage 3).
 * The board resolves its workspace via the sprint's parent project; a caller outside that workspace
 * gets NOT_FOUND (never the real entity), the upsert requires manage_sprints, and only project team
 * members can be given a capacity row.
 */
@Tag("unit")
class SprintCapacityServiceAccessTest {

    private static final String CALLER = "user-A";
    private static final String HOME_WS = "ws-A";
    private static final String FOREIGN_WS = "ws-B";

    private final SprintRepository sprints = mock(SprintRepository.class);
    private final SprintDao sprintDao = mock(SprintDao.class);
    private final SprintMemberCapacityRepository capacities = mock(SprintMemberCapacityRepository.class);
    private final ProjectTeamMemberRepository teamMembers = mock(ProjectTeamMemberRepository.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final RbacService rbac = mock(RbacService.class);
    private final EventService events = mock(EventService.class);

    private final SprintCapacityService service =
        new SprintCapacityService(sprints, sprintDao, capacities, teamMembers, jdbc, rbac, events);

    private Sprint sprintInProject(String projectId) {
        Sprint s = new Sprint();
        s.setId("SPR-1");
        s.setProjectId(projectId);
        s.setName("Sprint 1");
        return s;
    }

    @Test
    void capacityBoard_crossTenantReturnsNotFound() {
        when(sprints.findById("SPR-1")).thenReturn(Optional.of(sprintInProject("PROJ-B")));
        when(rbac.workspaceForProject("PROJ-B")).thenReturn(FOREIGN_WS);

        assertThatThrownBy(() -> service.capacityBoard(HOME_WS, CALLER, "SPR-1"))
            .isInstanceOf(ApiException.class)
            .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void capacityBoard_unknownSprintReturnsNotFound() {
        when(sprints.findById("SPR-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.capacityBoard(HOME_WS, CALLER, "SPR-missing"))
            .isInstanceOf(ApiException.class)
            .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void upsert_withoutManageSprintsIsForbiddenAndWritesNothing() {
        when(sprints.findById("SPR-1")).thenReturn(Optional.of(sprintInProject("PROJ-A")));
        when(rbac.workspaceForProject("PROJ-A")).thenReturn(HOME_WS);
        doThrow(ApiException.forbidden("nope")).when(rbac).require(CALLER, HOME_WS, "manage_sprints");

        assertThatThrownBy(() -> service.upsertMemberCapacity(HOME_WS, CALLER, "SPR-1", "user-X", 10, 0, 80))
            .isInstanceOf(ApiException.class)
            .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(capacities, never()).save(any());
        verify(events, never()).recordInWorkspace(anyString(), anyString(), anyString(), anyString(), any());
    }

    @Test
    void upsert_nonTeamMemberIsBadRequestAndWritesNothing() {
        when(sprints.findById("SPR-1")).thenReturn(Optional.of(sprintInProject("PROJ-A")));
        when(rbac.workspaceForProject("PROJ-A")).thenReturn(HOME_WS);
        when(teamMembers.findByProjectIdAndUserId("PROJ-A", "user-X")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.upsertMemberCapacity(HOME_WS, CALLER, "SPR-1", "user-X", 10, 0, 80))
            .isInstanceOf(ApiException.class)
            .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));

        verify(capacities, never()).save(any());
        verify(events, never()).recordInWorkspace(anyString(), anyString(), anyString(), anyString(), any());
    }
}
