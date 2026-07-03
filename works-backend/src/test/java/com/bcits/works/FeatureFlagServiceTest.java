package com.bcits.works;

import com.bcits.works.shared.ApiException;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link FeatureFlagService} — access control (RB-40 §1) and flag resolution.
 * Pure mocks; no Spring context, no DB.
 */
@Tag("unit")
class FeatureFlagServiceTest {

    private final RbacService rbac = mock(RbacService.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final FeatureFlagService service = new FeatureFlagService(rbac, jdbc);

    // ── Read access ───────────────────────────────────────────────────────────

    @Test
    void nonMember_getFlags_is404() {
        when(rbac.getUserTier("USR-OUT", "WS-001")).thenReturn(0);

        assertThatThrownBy(() -> service.getFlags("USR-OUT", "WS-001"))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void nullWorkspace_getFlags_is404() {
        assertThatThrownBy(() -> service.getFlags("USR-1", null))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    @SuppressWarnings("unchecked")
    void member_getFlags_returnsWorkspaceScopedList() {
        when(rbac.getUserTier("USR-MEM", "WS-001")).thenReturn(2);
        when(jdbc.queryForList(anyString(), eq("WS-001"))).thenReturn(List.of(
                Map.of("name", "onboarding_wizard", "enabled", false, "variant", ""),
                Map.of("name", "inline_quick_add",  "enabled", true,  "variant", "A")
        ));

        Map<String, Object> result = service.getFlags("USR-MEM", "WS-001");

        assertThat(result).containsKey("flags").containsEntry("workspaceId", "WS-001");
        List<Map<String, Object>> flags = (List<Map<String, Object>>) result.get("flags");
        assertThat(flags).hasSize(2);
        assertThat(flags.get(0)).containsEntry("name", "onboarding_wizard").containsEntry("enabled", false);
        assertThat(flags.get(1)).containsEntry("name", "inline_quick_add").containsEntry("enabled", true);
    }

    // ── Write access (ADMIN-gated) ────────────────────────────────────────────

    @Test
    void memberNonAdmin_setFlagOverride_is403() {
        when(rbac.getUserTier("USR-MEM", "WS-001")).thenReturn(2);
        when(rbac.isAdmin("USR-MEM", "WS-001")).thenReturn(false);

        assertThatThrownBy(() -> service.setFlagOverride("USR-MEM", "WS-001", "onboarding_wizard", true, null))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void admin_setFlagOverride_upsertsRow() {
        when(rbac.getUserTier("USR-ADM", "WS-001")).thenReturn(4);
        when(rbac.isAdmin("USR-ADM", "WS-001")).thenReturn(true);

        service.setFlagOverride("USR-ADM", "WS-001", "onboarding_wizard", true, "B");

        verify(jdbc).update(contains("INSERT INTO workspace_feature_flags"),
                eq("WS-001"), eq("onboarding_wizard"), eq(true), eq("B"));
    }

    @Test
    void admin_resetFlagOverride_deletesRow() {
        when(rbac.getUserTier("USR-ADM", "WS-001")).thenReturn(4);
        when(rbac.isAdmin("USR-ADM", "WS-001")).thenReturn(true);

        service.resetFlagOverride("USR-ADM", "WS-001", "onboarding_wizard");

        verify(jdbc).update(contains("DELETE FROM workspace_feature_flags"),
                eq("WS-001"), eq("onboarding_wizard"));
    }

    @Test
    void nonAdmin_resetFlagOverride_is403() {
        when(rbac.getUserTier("USR-MEM", "WS-001")).thenReturn(2);
        when(rbac.isAdmin("USR-MEM", "WS-001")).thenReturn(false);

        assertThatThrownBy(() -> service.resetFlagOverride("USR-MEM", "WS-001", "onboarding_wizard"))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }
}
