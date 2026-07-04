package com.bcits.works;

import com.bcits.works.auth.RbacService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the single field-level-security resolver (RB-40 §1; FLS Slice 3). FLS lives in a
 * service so its security-critical contract can be proven without a database: the fail-open read /
 * fail-closed write posture (EPIC P1 §3.4), the null-workspace and non-member short-circuits, and
 * the EDITABLE default when no rule is configured. The most-restrictive-wins ordering is SQL-level
 * (ORDER BY ... LIMIT 1) and is proven end-to-end in {@code FieldLevelSecurityIT}; here the
 * JdbcTemplate and RbacService are mocked. Tier-lookup uses 2 bind args; the visibility-set query
 * uses 3 (workspace, tier, visibility token) and is selected by its bound visibility argument.
 */
@Tag("unit")
class FieldVisibilityServiceTest {

    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final RbacService rbac = mock(RbacService.class);
    private final FieldVisibilityService svc = new FieldVisibilityService(jdbc, rbac);

    // ── resolveForUser — the read-redaction entry point ──────────────────────

    @Test
    void resolveForUser_nullWorkspace_returnsEmpty_withoutTouchingRbacOrDb() {
        FieldVisibilityService.FieldVisibilitySets sets = svc.resolveForUser("u1", null);
        assertThat(sets.hiddenFieldDefIds()).isEmpty();
        assertThat(sets.readOnlyFieldDefIds()).isEmpty();
        verify(rbac, never()).getUserTier(anyString(), anyString());
        verifyNoInteractions(jdbc);
    }

    @Test
    void resolveForUser_nonMember_returnsEmpty_withoutQuerying() {
        when(rbac.getUserTier("u1", "ws1")).thenReturn(0);
        FieldVisibilityService.FieldVisibilitySets sets = svc.resolveForUser("u1", "ws1");
        assertThat(sets.hiddenFieldDefIds()).isEmpty();
        assertThat(sets.readOnlyFieldDefIds()).isEmpty();
        verifyNoInteractions(jdbc);
    }

    @Test
    void resolveForUser_member_returnsHiddenAndReadOnlySets() {
        when(rbac.getUserTier("u1", "ws1")).thenReturn(2);
        when(jdbc.queryForList(anyString(), eq(String.class), eq("ws1"), eq(2), eq("HIDDEN")))
                .thenReturn(List.of("F-HIDDEN"));
        when(jdbc.queryForList(anyString(), eq(String.class), eq("ws1"), eq(2), eq("READ_ONLY")))
                .thenReturn(List.of("F-READONLY"));

        FieldVisibilityService.FieldVisibilitySets sets = svc.resolveForUser("u1", "ws1");

        assertThat(sets.hiddenFieldDefIds()).containsExactly("F-HIDDEN");
        assertThat(sets.readOnlyFieldDefIds()).containsExactly("F-READONLY");
    }

    // ── read path fails OPEN (degrade to "redact nothing") on a DB fault ──────

    @Test
    void hiddenFieldIds_dbError_failsOpen_returnsEmpty() {
        when(jdbc.queryForList(anyString(), eq(String.class), any(), any(), any()))
                .thenThrow(new RuntimeException("db down"));
        assertThat(svc.hiddenFieldIds("ws1", 2)).isEmpty();
    }

    @Test
    void readOnlyFieldIds_dbError_failsOpen_returnsEmpty() {
        when(jdbc.queryForList(anyString(), eq(String.class), any(), any(), any()))
                .thenThrow(new RuntimeException("db down"));
        assertThat(svc.readOnlyFieldIds("ws1", 2)).isEmpty();
    }

    // ── single-field verdict (write path) ────────────────────────────────────

    @Test
    void resolveFieldVisibility_returnsConfiguredVerdict() {
        when(jdbc.queryForObject(anyString(), eq(String.class), any(), any(), any())).thenReturn("HIDDEN");
        assertThat(svc.resolveFieldVisibility("F1", "ws1", 1)).isEqualTo("HIDDEN");
    }

    @Test
    void resolveFieldVisibility_noRule_defaultsToEditable() {
        when(jdbc.queryForObject(anyString(), eq(String.class), any(), any(), any()))
                .thenThrow(new EmptyResultDataAccessException(1));
        assertThat(svc.resolveFieldVisibility("F1", "ws1", 1)).isEqualTo("EDITABLE");
    }

    @Test
    void resolveFieldVisibility_dbError_failsClosed_propagates() {
        // The caller maps any non-EDITABLE / thrown verdict to a 403, so propagating denies on
        // uncertainty — the fail-closed posture for a write (EPIC P1 §3.4).
        when(jdbc.queryForObject(anyString(), eq(String.class), any(), any(), any()))
                .thenThrow(new RuntimeException("db down"));
        assertThatThrownBy(() -> svc.resolveFieldVisibility("F1", "ws1", 1))
                .isInstanceOf(RuntimeException.class);
    }
}
