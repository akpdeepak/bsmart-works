package com.bcits.works.workspaces;

import com.bcits.works.shared.ApiException;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Operating-model deny-override enforcement (V1.6, #523). Policies can only further restrict a
 * business user type; absence of a deny row leaves role RBAC as the sole decision, and a policy in
 * one workspace never affects another (RB-40 §1).
 */
@Tag("unit")
class OperatingModelPolicyServiceTest {

    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final OperatingModelPolicyService service = new OperatingModelPolicyService(jdbc);

    private void memberType(String wsId, String userId, String type) {
        when(jdbc.queryForObject(contains("business_user_type"), eq(String.class), eq(wsId), eq(userId)))
                .thenReturn(type);
    }

    private void denyCount(String wsId, String userType, String resource, String action, int count) {
        when(jdbc.queryForObject(contains("operating_model_policies"), eq(Integer.class),
                eq(wsId), eq(userType), eq(resource), eq(action))).thenReturn(count);
    }

    @Test
    void noPolicyRow_isAllowed() {
        memberType("WS-1", "USR-1", "MANAGEMENT");
        denyCount("WS-1", "MANAGEMENT", "user", "invite", 0);
        assertThat(service.isAllowed("USR-1", "WS-1", "user", "invite")).isTrue();
    }

    @Test
    void explicitDenyRow_isDenied_andRequireThrows403() {
        memberType("WS-1", "USR-1", "MANAGEMENT");
        denyCount("WS-1", "MANAGEMENT", "user", "invite", 1);
        assertThat(service.isAllowed("USR-1", "WS-1", "user", "invite")).isFalse();
        assertThatThrownBy(() -> service.requireAllowed("USR-1", "WS-1", "user", "invite"))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void denyInOneWorkspaceDoesNotAffectAnother() {
        memberType("WS-A", "USR-1", "MANAGEMENT");
        memberType("WS-B", "USR-1", "MANAGEMENT");
        denyCount("WS-A", "MANAGEMENT", "user", "invite", 1);   // denied in A
        denyCount("WS-B", "MANAGEMENT", "user", "invite", 0);   // not in B
        assertThat(service.isAllowed("USR-1", "WS-A", "user", "invite")).isFalse();
        assertThat(service.isAllowed("USR-1", "WS-B", "user", "invite")).isTrue();
    }

    @Test
    void nonMember_orNoType_isAllowed_operatingModelAddsNoRestriction() {
        // No stub for the member-type query → queryForObject returns null (no matching member).
        assertThat(service.isAllowed("USR-OUT", "WS-1", "user", "invite")).isTrue();
    }
}
