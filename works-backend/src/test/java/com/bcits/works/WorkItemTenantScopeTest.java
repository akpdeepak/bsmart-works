package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.mockito.ArgumentCaptor;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Proves the work-item list query is tenant-scoped (RB-40 §1) — the I01-S07 fix for the leak where
 * {@code SELECT * FROM work_items} returned every item in every workspace. We capture the SQL and
 * assert it confines results to projects in the caller's workspaces. Pure mock; no DB.
 */
@Tag("unit")
class WorkItemTenantScopeTest {

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

    private final WorkItemController controller = new WorkItemController(
            repository, eventService, jdbc, notificationRepository, userRepository, emailService,
            batchService, authenticatedUser, rbac, dodChecklists, extensions, workflowRules,
            statusConfig);

    @Test
    @SuppressWarnings("unchecked")
    void getAllWorkItems_confinesResultsToCallersWorkspaces() {
        when(authenticatedUser.id()).thenReturn("USR-1");
        // Empty result short-circuits the tag/star enrichment, isolating the main query.
        when(jdbc.query(anyString(), any(RowMapper.class), any(Object.class), any(Object.class), any(Object.class)))
                .thenReturn(List.of());

        controller.getAllWorkItems(null, 0, 50);

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).query(sql.capture(), any(RowMapper.class), any(Object.class), any(Object.class), any(Object.class));
        assertThat(sql.getValue())
                .contains("workspace_members")          // joins through the tenant boundary
                .contains("wm.user_id = ?");            // scoped to the caller
    }

    @Test
    @SuppressWarnings("unchecked")
    void getWorkItem_unknownOrCrossTenant_is404_andQueryIsTenantScoped() {
        when(authenticatedUser.id()).thenReturn("USR-1");
        // Empty result: the id is either unknown or in a workspace the caller is not a member of —
        // both must 404 so a foreign item's existence is never confirmed (RB-40 §1).
        when(jdbc.query(anyString(), any(RowMapper.class), any(Object.class), any(Object.class)))
                .thenReturn(List.of());

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> controller.getWorkItem("WRK-999"))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus())
                        .isEqualTo(org.springframework.http.HttpStatus.NOT_FOUND));

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).query(sql.capture(), any(RowMapper.class), any(Object.class), any(Object.class));
        assertThat(sql.getValue()).contains("workspace_members").contains("wm.user_id = ?");
    }

    @Test
    void search_blankQuery_returnsEmptyWithoutTouchingTheDatabase() {
        when(authenticatedUser.id()).thenReturn("USR-1");
        assertThat(controller.search("   ")).isEmpty();
        verifyNoInteractions(jdbc);   // a blank query must not run an unbounded scan
    }
}
