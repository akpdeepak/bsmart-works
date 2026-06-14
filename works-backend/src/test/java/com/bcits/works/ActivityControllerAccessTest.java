package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Proves ActivityController is tenant-scoped (RB-40 §1), matching its sibling StatusDurationController:
 * a caller who cannot view the work item's workspace is rejected with 403 and the events table is
 * never read; a workspace member passes the gate and the activity query is scoped to the work item.
 */
@Tag("unit")
class ActivityControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String WS_A = "ws-A";
    private static final String WS_B = "ws-B";
    private static final String ITEM_IN_A = "WI-001";
    private static final String ITEM_IN_B = "WI-666";

    private static final String EXPECTED_SQL =
        "SELECT e.id, e.event_type, e.payload, e.occurred_at,"
        + " e.field_name, e.old_value, e.new_value, u.full_name as actor_name "
        + "FROM events e LEFT JOIN users u ON u.id = e.actor_id WHERE e.aggregate_id = ?"
        + " ORDER BY e.occurred_at DESC LIMIT 50";

    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);

    private final ActivityController controller = new ActivityController(jdbc, authenticatedUser, rbac);

    ActivityControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        when(rbac.workspaceForWorkItem(ITEM_IN_A)).thenReturn(WS_A);
        when(rbac.workspaceForWorkItem(ITEM_IN_B)).thenReturn(WS_B);
        // Caller may view workspace A, not workspace B.
        doThrow(ApiException.forbidden("You do not have permission to perform this action."))
            .when(rbac).require(CALLER, WS_B, "view_items");
    }

    @Test
    void getActivity_crossTenant_isForbiddenAndNeverReadsEvents() {
        assertThrows(ApiException.class, () -> controller.getActivity(ITEM_IN_B, null));
        verifyNoInteractions(jdbc);
    }

    @Test
    void getActivity_member_passesGateAndQueriesScopedToItem() {
        controller.getActivity(ITEM_IN_A, null);
        verify(rbac).require(CALLER, WS_A, "view_items");
        verify(jdbc).queryForList(EXPECTED_SQL, ITEM_IN_A);
    }
}
