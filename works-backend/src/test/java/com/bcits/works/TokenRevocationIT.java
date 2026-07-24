package com.bcits.works;

import com.bcits.works.auth.api.TokenRevocationService;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.time.Instant;
import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Proves token-version JWT revocation (W1 rate-limit/JWT PR1) against real Postgres + the V115 columns
 * ({@code users.tokens_valid_after}, {@code customer_users.tokens_valid_after}): a token is valid until
 * the subject's cutoff is bumped, after which tokens issued before the bump are revoked and tokens
 * issued after are accepted — for both internal users and, in parity, customer-portal users.
 * {@link TokenRevocationServiceTest} covers the comparison edge cases with a mocked JdbcTemplate.
 */
@Tag("integration")
@Testcontainers
@SpringBootTest
@Transactional
class TokenRevocationIT {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

    @Autowired JdbcTemplate jdbc;
    @Autowired TokenRevocationService tokenRevocation;

    private static final String USER = "TR-USR";
    private static final String ACCOUNT = "TR-ACC";
    private static final String CUST = "TR-CUST";
    private static final String WS = "TR-WS";

    @BeforeEach
    void seed() {
        OffsetDateTime now = OffsetDateTime.now();
        jdbc.update("DELETE FROM customer_users WHERE id = ?", CUST);
        jdbc.update("DELETE FROM customer_accounts WHERE id = ?", ACCOUNT);
        jdbc.update("DELETE FROM users WHERE id = ?", USER);

        jdbc.update("INSERT INTO users(id, email, password_hash, full_name, created_at) VALUES (?,?,?,?,?)",
            USER, "tr-user@test.invalid", "x", "TR User", now);
        jdbc.update("INSERT INTO customer_accounts(id, workspace_id, name) VALUES (?,?,?)",
            ACCOUNT, WS, "TR Account");
        jdbc.update("INSERT INTO customer_users(id, customer_account_id, workspace_id, email, password_hash) "
            + "VALUES (?,?,?,?,?)", CUST, ACCOUNT, WS, "tr-cust@test.invalid", "x");
    }

    @AfterEach
    void cleanup() {
        jdbc.update("DELETE FROM customer_users WHERE id = ?", CUST);
        jdbc.update("DELETE FROM customer_accounts WHERE id = ?", ACCOUNT);
        jdbc.update("DELETE FROM users WHERE id = ?", USER);
    }

    @Test
    void internalToken_revokedAfterBump_freshTokenStillValid() {
        Instant before = Instant.now().minusSeconds(3600);
        Instant after = Instant.now().plusSeconds(3600);

        // No cutoff yet (V115 column present, value NULL) → nothing revoked.
        assertThat(tokenRevocation.isUserTokenRevoked(USER, before))
            .as("with a NULL cutoff no token is revoked").isFalse();

        tokenRevocation.revokeUserTokens(USER);

        assertThat(tokenRevocation.isUserTokenRevoked(USER, before))
            .as("a token issued before the bump is revoked").isTrue();
        assertThat(tokenRevocation.isUserTokenRevoked(USER, after))
            .as("a token issued after the bump is still valid").isFalse();
    }

    @Test
    void customerToken_revocationParity() {
        Instant before = Instant.now().minusSeconds(3600);
        Instant after = Instant.now().plusSeconds(3600);

        assertThat(tokenRevocation.isCustomerTokenRevoked(CUST, before))
            .as("with a NULL cutoff no portal token is revoked").isFalse();

        tokenRevocation.revokeCustomerTokens(CUST);

        assertThat(tokenRevocation.isCustomerTokenRevoked(CUST, before))
            .as("a portal token issued before the bump is revoked").isTrue();
        assertThat(tokenRevocation.isCustomerTokenRevoked(CUST, after))
            .as("a portal token issued after the bump is still valid").isFalse();
    }

    @Test
    void unknownSubject_isNeverRevoked() {
        assertThat(tokenRevocation.isUserTokenRevoked("TR-NO-SUCH-USER", Instant.now().minusSeconds(60)))
            .isFalse();
    }

    // ── jti blocklist (PR2) — real Postgres round-trip (proves V117 + the SQL) ───────────────────

    @Test
    void blocklist_roundTrip_marksTokenRevokedByJti() {
        String jti = "TR-JTI-1";
        assertThat(tokenRevocation.isBlocklisted(jti)).as("unknown jti not blocklisted").isFalse();

        tokenRevocation.blocklist(jti, USER, "internal", Instant.now().plusSeconds(3600));
        assertThat(tokenRevocation.isBlocklisted(jti)).as("after logout the jti is blocklisted").isTrue();

        // Idempotent (ON CONFLICT DO NOTHING): a double logout neither errors nor un-blocks.
        tokenRevocation.blocklist(jti, USER, "internal", Instant.now().plusSeconds(3600));
        assertThat(tokenRevocation.isBlocklisted(jti)).isTrue();
    }

    @Test
    void blocklist_prunesExpiredEntriesOnInsert() {
        tokenRevocation.blocklist("TR-JTI-OLD", USER, "internal", Instant.now().minusSeconds(60));
        // The next insert first prunes expired rows, evicting TR-JTI-OLD.
        tokenRevocation.blocklist("TR-JTI-NEW", USER, "internal", Instant.now().plusSeconds(3600));
        assertThat(tokenRevocation.isBlocklisted("TR-JTI-OLD")).as("expired entry pruned").isFalse();
        assertThat(tokenRevocation.isBlocklisted("TR-JTI-NEW")).isTrue();
    }
}
