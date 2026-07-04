package com.bcits.works;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.TenantContext;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the authorization engine. RBAC lives in the service layer (RB-10 §2) precisely
 * so it can be tested in isolation — these prove the tier hierarchy, the permission gate, and the
 * "throw 403 on deny" contract without a database. The JdbcTemplate is mocked; we differentiate
 * the tier lookup (2 bind args) from the permission min-tier lookup (1 bind arg) by arity, and
 * select specific permissions by their bound argument.
 */
@Tag("unit")
class RbacServiceTest {

    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final CurrentWorkspace currentWorkspace = mock(CurrentWorkspace.class);
    // Default instance: binding flag OFF, so the central-filter binding never fires (this is the
    // merge-default behaviour) and the existing authorization tests below are unaffected by #243.
    private final RbacService rbac = new RbacService(jdbc, currentWorkspace, new TenantFilterSettings(false));

    // ── Tier lookup ──────────────────────────────────────────────────────────

    @Test
    void getUserTier_returnsTierForMember() {
        when(jdbc.queryForObject(contains("r.tier"), eq(Integer.class), any(), any())).thenReturn(3);
        assertThat(rbac.getUserTier("u1", "ws1")).isEqualTo(3);
    }

    @Test
    void getUserTier_returnsZeroWhenNotAMember() {
        when(jdbc.queryForObject(contains("r.tier"), eq(Integer.class), any(), any()))
                .thenThrow(new RuntimeException("no rows"));
        assertThat(rbac.getUserTier("ghost", "ws1")).isEqualTo(0);
    }

    @Test
    void getUserRole_returnsNoneWhenLookupFails() {
        when(jdbc.queryForObject(contains("role_id"), eq(String.class), any(), any()))
                .thenThrow(new RuntimeException("no rows"));
        assertThat(rbac.getUserRole("ghost", "ws1")).isEqualTo("NONE");
    }

    // ── Permission gate ──────────────────────────────────────────────────────

    @Test
    void canDo_trueWhenUserTierMeetsMinTier() {
        when(jdbc.queryForObject(contains("min_tier"), eq(Integer.class), any())).thenReturn(2);
        when(jdbc.queryForObject(contains("r.tier"), eq(Integer.class), any(), any())).thenReturn(3);
        assertThat(rbac.canDo("u1", "ws1", "create_items")).isTrue();
    }

    @Test
    void canDo_falseWhenUserTierBelowMinTier() {
        when(jdbc.queryForObject(contains("min_tier"), eq(Integer.class), any())).thenReturn(4);
        when(jdbc.queryForObject(contains("r.tier"), eq(Integer.class), any(), any())).thenReturn(2);
        assertThat(rbac.canDo("u1", "ws1", "delete_items")).isFalse();
    }

    @Test
    void canDo_falseWhenPermissionIsUnknown() {
        when(jdbc.queryForObject(contains("min_tier"), eq(Integer.class), any()))
                .thenThrow(new RuntimeException("no such permission"));
        assertThat(rbac.canDo("u1", "ws1", "no_such_permission")).isFalse();
    }

    // ── require(): the 403 contract ──────────────────────────────────────────

    @Test
    void require_throwsForbiddenWhenDenied() {
        when(jdbc.queryForObject(contains("min_tier"), eq(Integer.class), any())).thenReturn(4);
        when(jdbc.queryForObject(contains("r.tier"), eq(Integer.class), any(), any())).thenReturn(1);

        assertThatThrownBy(() -> rbac.require("u1", "ws1", "manage_roles"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void require_passesSilentlyWhenAllowed() {
        when(jdbc.queryForObject(contains("min_tier"), eq(Integer.class), any())).thenReturn(2);
        when(jdbc.queryForObject(contains("r.tier"), eq(Integer.class), any(), any())).thenReturn(5);

        assertThatCode(() -> rbac.require("u1", "ws1", "create_items")).doesNotThrowAnyException();
    }

    // ── Tier convenience helpers ─────────────────────────────────────────────

    @Test
    void isAdmin_trueAtTierFourAndAbove_falseBelow() {
        when(jdbc.queryForObject(contains("r.tier"), eq(Integer.class), any(), any()))
                .thenReturn(4).thenReturn(3);
        assertThat(rbac.isAdmin("u1", "ws1")).isTrue();
        assertThat(rbac.isAdmin("u1", "ws1")).isFalse();
    }

    @Test
    void isOwner_trueOnlyAtTierFive() {
        when(jdbc.queryForObject(contains("r.tier"), eq(Integer.class), any(), any()))
                .thenReturn(5).thenReturn(4);
        assertThat(rbac.isOwner("u1", "ws1")).isTrue();
        assertThat(rbac.isOwner("u1", "ws1")).isFalse();
    }

    // ── canEdit(): own-vs-any ownership rule ─────────────────────────────────

    @Test
    void canEdit_withEditAny_canEditAnyonesItem() {
        when(jdbc.queryForObject(contains("min_tier"), eq(Integer.class), eq("edit_any_item"))).thenReturn(3);
        when(jdbc.queryForObject(contains("r.tier"), eq(Integer.class), any(), any())).thenReturn(4);

        assertThat(rbac.canEdit("u1", "ws1", "someoneElse", "anotherUser")).isTrue();
    }

    @Test
    void canEdit_withOnlyEditOwn_canEditOwnItem() {
        when(jdbc.queryForObject(contains("min_tier"), eq(Integer.class), eq("edit_any_item"))).thenReturn(3);
        when(jdbc.queryForObject(contains("min_tier"), eq(Integer.class), eq("edit_own_items"))).thenReturn(2);
        when(jdbc.queryForObject(contains("r.tier"), eq(Integer.class), any(), any())).thenReturn(2);

        assertThat(rbac.canEdit("u1", "ws1", "u1", null)).isTrue();          // creator == user
        assertThat(rbac.canEdit("u1", "ws1", "other", "u1")).isTrue();       // assignee == user
    }

    @Test
    void canEdit_withOnlyEditOwn_cannotEditSomeoneElsesItem() {
        when(jdbc.queryForObject(contains("min_tier"), eq(Integer.class), eq("edit_any_item"))).thenReturn(3);
        when(jdbc.queryForObject(contains("min_tier"), eq(Integer.class), eq("edit_own_items"))).thenReturn(2);
        when(jdbc.queryForObject(contains("r.tier"), eq(Integer.class), any(), any())).thenReturn(2);

        assertThat(rbac.canEdit("u1", "ws1", "other", "anotherUser")).isFalse();
    }

    // ── Workspace resolution (tenant-scope plumbing) ─────────────────────────

    @Test
    void workspaceForProject_returnsNullWhenProjectMissing() {
        when(jdbc.queryForObject(contains("FROM projects"), eq(String.class), any()))
                .thenThrow(new RuntimeException("no rows"));
        assertThat(rbac.workspaceForProject("PRJ-missing")).isNull();
    }

    @Test
    void workspaceForWorkItem_resolvesViaProject() {
        when(jdbc.queryForObject(contains("work_items"), eq(String.class), any())).thenReturn("ws-99");
        assertThat(rbac.workspaceForWorkItem("WRK-1")).isEqualTo("ws-99");
    }

    // ── #243 Slice A: central tenant-filter binding at the authorization choke point ──────────────
    // A successful member-tier lookup binds the central workspaceFilter to that workspace, but only
    // when the rollout flag is on and we are not inside the system/unscoped escape hatch. These prove
    // the gate so the slice can never bind unexpectedly (its over-filtering failure mode).

    private RbacService rbacWithBinding(boolean enabled) {
        return new RbacService(jdbc, currentWorkspace, new TenantFilterSettings(enabled));
    }

    @Test
    void getUserTier_bindsCentralFilter_whenFlagOnAndMember() {
        when(jdbc.queryForObject(contains("r.tier"), eq(Integer.class), any(), any())).thenReturn(2);
        rbacWithBinding(true).getUserTier("u1", "ws1");
        verify(currentWorkspace).bind("ws1");
    }

    @Test
    void getUserTier_doesNotBind_whenFlagOff() {
        when(jdbc.queryForObject(contains("r.tier"), eq(Integer.class), any(), any())).thenReturn(5);
        rbacWithBinding(false).getUserTier("u1", "ws1");
        verify(currentWorkspace, never()).bind(any());
    }

    @Test
    void getUserTier_doesNotBind_whenNotAMember() {
        // tier lookup throws (no membership row) → returns 0 → must never bind.
        when(jdbc.queryForObject(contains("r.tier"), eq(Integer.class), any(), any()))
                .thenThrow(new RuntimeException("no rows"));
        rbacWithBinding(true).getUserTier("ghost", "ws1");
        verify(currentWorkspace, never()).bind(any());
    }

    @Test
    void getUserTier_doesNotBind_insideSystemEscapeHatch() {
        // A scheduler / admin sweep running unscoped may probe a tier — binding here would wrongly
        // re-narrow its deliberately cross-workspace read, so the system context must suppress binding.
        when(jdbc.queryForObject(contains("r.tier"), eq(Integer.class), any(), any())).thenReturn(4);
        TenantContext.enterSystem();
        try {
            rbacWithBinding(true).getUserTier("u1", "ws1");
            verify(currentWorkspace, never()).bind(any());
        } finally {
            TenantContext.clear();
        }
    }

    @Test
    void require_bindsCentralFilter_whenFlagOnAndAllowed() {
        // require → canDo → getUserTier, so authorizing an action also activates the backstop.
        when(jdbc.queryForObject(contains("min_tier"), eq(Integer.class), any())).thenReturn(2);
        when(jdbc.queryForObject(contains("r.tier"), eq(Integer.class), any(), any())).thenReturn(3);
        rbacWithBinding(true).require("u1", "ws1", "create_items");
        verify(currentWorkspace).bind("ws1");
    }
}
