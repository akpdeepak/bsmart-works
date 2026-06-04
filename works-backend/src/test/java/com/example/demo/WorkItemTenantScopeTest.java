package com.example.demo;

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

    private final WorkItemController controller = new WorkItemController(
            repository, eventService, jdbc, notificationRepository, userRepository, emailService,
            batchService, authenticatedUser, rbac);

    @Test
    @SuppressWarnings("unchecked")
    void getAllWorkItems_confinesResultsToCallersWorkspaces() {
        when(authenticatedUser.id()).thenReturn("USR-1");
        // Empty result short-circuits the tag/star enrichment, isolating the main query.
        when(jdbc.query(anyString(), any(RowMapper.class), any(Object.class))).thenReturn(List.of());

        controller.getAllWorkItems(null);

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).query(sql.capture(), any(RowMapper.class), any(Object.class));
        assertThat(sql.getValue())
                .contains("workspace_members")          // joins through the tenant boundary
                .contains("wm.user_id = ?");            // scoped to the caller
    }

    @Test
    void search_blankQuery_returnsEmptyWithoutTouchingTheDatabase() {
        when(authenticatedUser.id()).thenReturn("USR-1");
        assertThat(controller.search("   ")).isEmpty();
        verifyNoInteractions(jdbc);   // a blank query must not run an unbounded scan
    }
}
