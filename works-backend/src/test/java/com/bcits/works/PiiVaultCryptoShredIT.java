package com.bcits.works;
import com.bcits.works.shared.PiiVaultService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration test for the PII-vault crypto-shred loop against a real Postgres (RB-40 §3, EPIC §8).
 * Proves the three binding rules at the database: a put round-trips through encrypted storage; forget
 * destroys the per-subject key + purges the vault rows so resolve yields "[erased]"; and personal data
 * is workspace-isolated.
 */
@Tag("integration")
@Testcontainers
@SpringBootTest
class PiiVaultCryptoShredIT {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

    @Autowired
    PiiVaultService vault;
    @Autowired
    JdbcTemplate jdbc;

    @Test
    void identity_put_resolve_forget_cryptoShredsAtTheDatabase() {
        String token = "subj-" + UUID.randomUUID();

        vault.putIdentity(token, PiiVaultService.TYPE_NAME, "Alice Johnson");
        vault.putIdentity(token, PiiVaultService.TYPE_EMAIL, "alice@example.com");

        assertThat(vault.resolveIdentity(token, PiiVaultService.TYPE_NAME)).contains("Alice Johnson");

        // Stored at rest as ciphertext, never plaintext.
        String ciphertext = jdbc.queryForObject(
            "SELECT encrypted_value FROM pii_vault_entries WHERE subject_id=? AND pii_type='NAME'",
            String.class, token);
        assertThat(ciphertext).isNotNull().doesNotContain("Alice");
        Integer rows = jdbc.queryForObject(
            "SELECT count(*) FROM pii_vault_entries WHERE subject_id=?", Integer.class, token);
        assertThat(rows).isEqualTo(2);

        // Crypto-shred: destroy the per-subject key + purge the rows.
        vault.forgetIdentity(token);

        assertThat(vault.resolveIdentity(token, PiiVaultService.TYPE_NAME))
            .contains(PiiVaultService.ERASED);
        Integer remaining = jdbc.queryForObject(
            "SELECT count(*) FROM pii_vault_entries WHERE subject_id=?", Integer.class, token);
        assertThat(remaining).isZero();
        String state = jdbc.queryForObject(
            "SELECT key_state FROM subject_data_keys WHERE subject_id=?", String.class, token);
        assertThat(state).isEqualTo("SHREDDED");
        String wrapped = jdbc.queryForObject(
            "SELECT wrapped_dek FROM subject_data_keys WHERE subject_id=?", String.class, token);
        assertThat(wrapped).isNull();
    }

    @Test
    void vault_isWorkspaceScoped() {
        String token = "subj-" + UUID.randomUUID();
        vault.put("WS-PII-A", token, PiiVaultService.TYPE_NAME, "Bob Smith");

        // A different workspace cannot resolve another workspace's subject (RB-40 §1).
        assertThat(vault.resolve("WS-PII-B", token, PiiVaultService.TYPE_NAME)).isEmpty();
        assertThat(vault.resolve("WS-PII-A", token, PiiVaultService.TYPE_NAME)).contains("Bob Smith");
    }
}
