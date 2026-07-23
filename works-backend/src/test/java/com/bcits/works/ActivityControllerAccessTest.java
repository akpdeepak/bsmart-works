package com.bcits.works;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;
import com.bcits.works.auth.UserPiiService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
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

    // Actor id is selected (not a raw users.full_name join) — identity PII is resolved at render via
    // the PII vault (RB-40 §3), so the immutable events log carries only ids.
    private static final String EXPECTED_SQL =
        "SELECT e.id, e.event_type, e.payload, e.occurred_at,"
        + " e.field_name, e.old_value, e.new_value, e.actor_id "
        + "FROM events e WHERE e.aggregate_id = ?"
        + " ORDER BY e.occurred_at DESC LIMIT 50";

    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);
    private final UserPiiService userPii = mock(UserPiiService.class);

    private final ActivityController controller = new ActivityController(jdbc, authenticatedUser, rbac, userPii);

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
    void getActivity_unresolvableAggregate_failsClosedAndNeverReadsEvents() {
        // events.aggregate_id also holds project / sprint / SLA / compliance ids, which never resolve
        // through work_items. Falling open there would serve any tenant's history to any caller.
        when(rbac.workspaceForWorkItem("PROJ-999")).thenReturn(null);

        assertThrows(ApiException.class, () -> controller.getActivity("PROJ-999", null));
        verifyNoInteractions(jdbc);
    }

    @Test
    void getActivity_member_passesGateAndQueriesScopedToItem() {
        controller.getActivity(ITEM_IN_A, null);
        verify(rbac).require(CALLER, WS_A, "view_items");
        verify(jdbc).queryForList(EXPECTED_SQL, ITEM_IN_A);
    }

    @Test
    void getActivity_resolvesActorAndAssigneeIdsToNamesViaTheVault() {
        // An ASSIGNED row as stored in the immutable events log: actor + old/new assignee are user IDs.
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", "EVT-1");
        row.put("event_type", "ASSIGNED");
        row.put("field_name", "assignee");
        row.put("old_value", "USR-1");
        row.put("new_value", "USR-2");
        row.put("actor_id", "USR-3");
        when(jdbc.queryForList(anyString(), eq(ITEM_IN_A))).thenReturn(List.of(row));
        when(userPii.displayNameById("USR-1")).thenReturn("Alice");
        when(userPii.displayNameById("USR-2")).thenReturn("Bob");
        when(userPii.displayNameById("USR-3")).thenReturn("Carol");

        Map<String, Object> out = controller.getActivity(ITEM_IN_A, null).get(0);

        assertThat(out.get("actor_name")).isEqualTo("Carol");   // resolved via the vault, not a raw join
        assertThat(out.get("old_value")).isEqualTo("Alice");    // assignee id -> display name at render
        assertThat(out.get("new_value")).isEqualTo("Bob");
        assertThat(out).doesNotContainKey("actor_id");          // surrogate id never leaves the boundary
    }
}
