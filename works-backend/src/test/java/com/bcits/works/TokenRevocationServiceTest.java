package com.bcits.works;

import com.bcits.works.auth.api.TokenRevocationService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Timestamp;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the token-version revocation comparison + fail-open/fail-closed contract (W1 PR1).
 * The JdbcTemplate is mocked so the cutoff-vs-iat logic is exercised deterministically (no clock
 * races); {@link TokenRevocationIT} proves the real SQL + the V115 columns against Postgres.
 */
@Tag("unit")
class TokenRevocationServiceTest {

    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final TokenRevocationService svc = new TokenRevocationService(jdbc);

    private static final Instant T = Instant.parse("2026-06-21T10:00:00Z");

    @Test
    void notRevoked_whenCutoffIsNull() {
        when(jdbc.queryForObject(contains("FROM users"), eq(Timestamp.class), eq("u1"))).thenReturn(null);
        assertThat(svc.isUserTokenRevoked("u1", T)).isFalse();
    }

    @Test
    void revoked_whenIssuedStrictlyBeforeCutoff() {
        when(jdbc.queryForObject(contains("FROM users"), eq(Timestamp.class), eq("u1")))
            .thenReturn(Timestamp.from(T));
        assertThat(svc.isUserTokenRevoked("u1", T.minusSeconds(5))).isTrue();
    }

    @Test
    void notRevoked_whenIssuedAtOrAfterCutoff_sameSecondSurvives() {
        when(jdbc.queryForObject(contains("FROM users"), eq(Timestamp.class), eq("u1")))
            .thenReturn(Timestamp.from(T));
        assertThat(svc.isUserTokenRevoked("u1", T)).isFalse();                // same second → survives
        assertThat(svc.isUserTokenRevoked("u1", T.plusSeconds(5))).isFalse(); // issued after the bump
    }

    @Test
    void notRevoked_whenNoSuchSubject() {
        when(jdbc.queryForObject(contains("FROM users"), eq(Timestamp.class), eq("ghost")))
            .thenThrow(new EmptyResultDataAccessException(1));
        assertThat(svc.isUserTokenRevoked("ghost", T)).isFalse();
    }

    @Test
    void revoked_whenIssuedAtNull_failsClosed() {
        assertThat(svc.isUserTokenRevoked("u1", null)).isTrue();
    }

    @Test
    void revoked_whenSubjectNull_failsClosed() {
        assertThat(svc.isUserTokenRevoked(null, T)).isTrue();
    }

    @Test
    void notRevoked_onLookupError_failsOpen() {
        when(jdbc.queryForObject(contains("FROM users"), eq(Timestamp.class), eq("u1")))
            .thenThrow(new RuntimeException("db down"));
        assertThat(svc.isUserTokenRevoked("u1", T)).isFalse();
    }

    @Test
    void customerCheckUsesCustomerUsersTable() {
        when(jdbc.queryForObject(contains("FROM customer_users"), eq(Timestamp.class), eq("c1")))
            .thenReturn(Timestamp.from(T));
        assertThat(svc.isCustomerTokenRevoked("c1", T.minusSeconds(5))).isTrue();
    }

    @Test
    void revokeUserTokens_updatesUsersTable() {
        svc.revokeUserTokens("u1");
        verify(jdbc).update(contains("UPDATE users SET tokens_valid_after"), any(), eq("u1"));
    }

    @Test
    void revokeCustomerTokens_updatesCustomerUsersTable() {
        svc.revokeCustomerTokens("c1");
        verify(jdbc).update(contains("UPDATE customer_users SET tokens_valid_after"), any(), eq("c1"));
    }

    @Test
    void revoke_ignoresNullId() {
        svc.revokeUserTokens(null);
        verify(jdbc, never()).update(any(String.class), any(), any());
    }

    // ── jti blocklist (PR2) ──────────────────────────────────────────────────

    @Test
    void blocklist_prunesExpiredThenInsertsIdempotently() {
        svc.blocklist("jti-1", "u1", "internal", T.plusSeconds(3600));
        // typed matcher disambiguates update(String, Object...) from update(String, PreparedStatementSetter)
        verify(jdbc).update(contains("DELETE FROM revoked_tokens WHERE expires_at <"),
                any(java.sql.Timestamp.class));
        verify(jdbc).update(contains("INSERT INTO revoked_tokens"), eq("jti-1"), eq("u1"),
                eq("internal"), any());
    }

    @Test
    void blocklist_ignoresNullJti() {
        svc.blocklist(null, "u1", "internal", T);
        verify(jdbc, never()).update(contains("revoked_tokens"), any(), any(), any(), any());
        verify(jdbc, never()).update(contains("revoked_tokens"), any(java.sql.Timestamp.class));
    }

    @Test
    void isBlocklisted_trueWhenPresent() {
        when(jdbc.queryForObject(contains("FROM revoked_tokens"), eq(Boolean.class), eq("jti-1")))
            .thenReturn(true);
        assertThat(svc.isBlocklisted("jti-1")).isTrue();
    }

    @Test
    void isBlocklisted_falseWhenAbsentOrNull() {
        when(jdbc.queryForObject(contains("FROM revoked_tokens"), eq(Boolean.class), eq("jti-x")))
            .thenReturn(false);
        assertThat(svc.isBlocklisted("jti-x")).isFalse();
        assertThat(svc.isBlocklisted(null)).isFalse(); // pre-PR2 token without a jti
    }

    @Test
    void isBlocklisted_failsOpenOnLookupError() {
        when(jdbc.queryForObject(contains("FROM revoked_tokens"), eq(Boolean.class), eq("jti-1")))
            .thenThrow(new RuntimeException("db down"));
        assertThat(svc.isBlocklisted("jti-1")).isFalse();
    }
}
