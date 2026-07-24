package com.bcits.works;


import com.bcits.works.shared.TenantScope;
import com.bcits.works.shared.BlindIndexService;
import com.bcits.works.security.CustomerAttributionPiiService;
import com.bcits.works.security.CustomerUserPiiService;
import com.bcits.works.shared.PiiVaultPolicy;
import com.bcits.works.shared.PiiVaultService;
import com.bcits.works.security.StakeholderPiiService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration test for PII-vault Slice 3 against a real Postgres (RB-40 §3, EPIC §8): customer-portal
 * users, stakeholders, and the two denormalised free-text customer-attribution copies. Proves each new
 * subject dual-writes to the encrypted vault, resolves through the read switch, is workspace-isolated,
 * crypto-shreds to "[erased]", and that the customer-portal blind index round-trips at the database.
 */
@Tag("integration")
@Testcontainers
@SpringBootTest
class PiiVaultSlice3IT {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

    @Autowired
    PiiVaultService vault;
    @Autowired
    BlindIndexService blindIndex;
    @Autowired
    CustomerUserRepository customerUsers;
    @Autowired
    JdbcTemplate jdbc;

    // Glue built with controlled policies so both flag states are exercised in one context.
    private CustomerUserPiiService customerUserPii(boolean read, boolean login) {
        return new CustomerUserPiiService(vault, new PiiVaultPolicy(true, read, login), customerUsers, blindIndex);
    }

    private StakeholderPiiService stakeholderPii(boolean read) {
        return new StakeholderPiiService(vault, new PiiVaultPolicy(true, read, false));
    }

    private CustomerAttributionPiiService attributionPii(boolean read) {
        return new CustomerAttributionPiiService(vault, new PiiVaultPolicy(true, read, false));
    }

    @Test
    void customerUser_dualWrites_resolvesThroughSwitch_andCryptoShreds() {
        String ws = "WS-S3-CU";
        String token = "subj-" + UUID.randomUUID();
        CustomerUser cu = new CustomerUser();
        cu.setId("CU-IT-1");
        cu.setWorkspaceId(ws);
        cu.setSubjectToken(token);
        cu.setEmail("portal-it@acme.com");
        cu.setDisplayName("Portal IT");

        customerUserPii(false, false).syncIdentity(cu); // dual-write (enabled)

        // Stored at rest as ciphertext, never plaintext.
        String ciphertext = jdbc.queryForObject(
            "SELECT encrypted_value FROM pii_vault_entries WHERE subject_id=? AND pii_type='EMAIL'",
            String.class, token);
        assertThat(ciphertext).isNotNull().doesNotContain("portal-it");

        // Read switch off → legacy column; on → vault value.
        assertThat(customerUserPii(false, false).displayEmail(cu)).isEqualTo("portal-it@acme.com");
        assertThat(customerUserPii(true, false).displayEmail(cu)).isEqualTo("portal-it@acme.com");
        assertThat(customerUserPii(true, false).displayName(cu)).isEqualTo("Portal IT");

        // Workspace isolation (RB-40 §1): another workspace cannot resolve this subject.
        assertThat(vault.resolve("WS-OTHER", token, PiiVaultService.TYPE_EMAIL)).isEmpty();

        // Crypto-shred → resolves to "[erased]".
        customerUserPii(true, false).forgetIdentity(cu);
        assertThat(customerUserPii(true, false).displayEmail(cu)).isEqualTo(PiiVaultService.ERASED);
        assertThat(customerUserPii(true, false).displayName(cu)).isEqualTo(PiiVaultService.ERASED);
    }

    @Test
    void stakeholder_dualWrites_resolves_andCryptoShreds() {
        String ws = "WS-S3-STK";
        String token = "subj-" + UUID.randomUUID();
        Stakeholder s = new Stakeholder();
        s.setId("STK-IT-1");
        s.setWorkspaceId(ws);
        s.setSubjectToken(token);
        s.setName("Reg Ulator");
        s.setEmail("reg-it@authority.gov");
        s.setOrganization("State Regulator");
        s.setNotes("Quarterly briefings only");

        stakeholderPii(false).sync(s);

        String ciphertext = jdbc.queryForObject(
            "SELECT encrypted_value FROM pii_vault_entries WHERE subject_id=? AND pii_type='NAME'",
            String.class, token);
        assertThat(ciphertext).isNotNull().doesNotContain("Ulator");

        // read=on resolves the vault values in place.
        Stakeholder rendered = new Stakeholder();
        rendered.setWorkspaceId(ws);
        rendered.setSubjectToken(token);
        rendered.setName("legacy");
        rendered.setEmail("legacy");
        rendered.setOrganization("legacy");
        rendered.setNotes("legacy");
        stakeholderPii(true).applyDisplay(rendered);
        assertThat(rendered.getName()).isEqualTo("Reg Ulator");
        assertThat(rendered.getOrganization()).isEqualTo("State Regulator");
        assertThat(rendered.getNotes()).isEqualTo("Quarterly briefings only");

        stakeholderPii(true).forget(s);
        Stakeholder afterShred = new Stakeholder();
        afterShred.setWorkspaceId(ws);
        afterShred.setSubjectToken(token);
        afterShred.setName("legacy");
        stakeholderPii(true).applyDisplay(afterShred);
        assertThat(afterShred.getName()).isEqualTo(PiiVaultService.ERASED);
    }

    @Test
    void denormAttribution_tokenizes_resolves_andCryptoShreds() {
        String ws = "WS-S3-ATTR";
        CustomerAttributionPiiService write = attributionPii(false);
        String token = write.ensureVaulted(ws, null, "Acme Power Ltd");
        assertThat(token).isNotBlank();

        String ciphertext = jdbc.queryForObject(
            "SELECT encrypted_value FROM pii_vault_entries WHERE subject_id=? AND pii_type='NAME'",
            String.class, token);
        assertThat(ciphertext).isNotNull().doesNotContain("Acme");

        assertThat(attributionPii(false).resolve(ws, token, "legacy")).isEqualTo("legacy");      // read off
        assertThat(attributionPii(true).resolve(ws, token, "legacy")).isEqualTo("Acme Power Ltd"); // read on

        attributionPii(true).forget(ws, token);
        assertThat(attributionPii(true).resolve(ws, token, "legacy")).isEqualTo(PiiVaultService.ERASED);
    }

    @Test
    void customerUser_blindIndex_roundTripsAtTheDatabase() {
        String accountId = "ACC-IT-1";
        String email = "login-it@acme.com";
        String hmac = blindIndex.hmac(email);
        jdbc.update("INSERT INTO customer_accounts (id, workspace_id, name) VALUES (?,?,?)",
            accountId, "WS-S3-LOGIN", "Acme");
        jdbc.update("INSERT INTO customer_users (id, customer_account_id, workspace_id, email, password_hash, "
            + "subject_token, email_hmac) VALUES (?,?,?,?,?,?,?)",
            "CU-IT-LOGIN", accountId, "WS-S3-LOGIN", email, "x", "subj-" + UUID.randomUUID(), hmac);

        // login-via-blind-index ON → found by hmac; the lookup runs in the system scope like portal login.
        Optional<CustomerUser> found = TenantScope.callAsSystem(() ->
            customerUserPii(false, true).resolveByEmail(email));
        assertThat(found).isPresent();
        assertThat(found.get().getId()).isEqualTo("CU-IT-LOGIN");

        // login-via-blind-index OFF → legacy email lookup still finds it.
        Optional<CustomerUser> legacy = TenantScope.callAsSystem(() ->
            customerUserPii(false, false).resolveByEmail(email));
        assertThat(legacy).isPresent();
    }
}
