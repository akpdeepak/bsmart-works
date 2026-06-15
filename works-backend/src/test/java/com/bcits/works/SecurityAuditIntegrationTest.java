package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Iteration 19 (enterprise security) integration coverage against a real Postgres (V52). Verifies:
 *   - the SQL-seeded audit chain verifies under the same SHA-256 the application uses (so the seed
 *     is genuinely tamper-evident, not faked),
 *   - the audit log is append-only at the DB layer (UPDATE/DELETE blocked),
 *   - {@link SecurityAuditLogService#record} appends a contiguous, verifiable link, and
 *   - the security tables migrated and seeded.
 */
@Tag("integration")
@Testcontainers
@SpringBootTest
class SecurityAuditIntegrationTest {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    SecurityAuditLogService auditLog;

    @Test
    void seededAuditChainVerifies() {
        AuditHashChain.Result result = auditLog.verify("WS-001");
        assertThat(result.intact()).as("SQL-seeded chain matches the app's SHA-256").isTrue();
        assertThat(result.verifiedCount()).isGreaterThanOrEqualTo(4);
    }

    @Test
    void appendingThroughTheServiceKeepsTheChainIntact() {
        long before = auditLog.verify("WS-001").verifiedCount();
        auditLog.record("WS-001", "USR-DEV1", "TEST_ACTION", "test", "T-1", "integration append");
        AuditHashChain.Result after = auditLog.verify("WS-001");
        assertThat(after.intact()).isTrue();
        assertThat(after.verifiedCount()).isEqualTo(before + 1);
    }

    @Test
    void auditLogIsAppendOnly() {
        Long id = jdbc.queryForObject(
                "SELECT id FROM audit_log_entries WHERE workspace_id = 'WS-001' ORDER BY seq LIMIT 1",
                Long.class);
        assertThat(id).isNotNull();
        assertThatThrownBy(() -> jdbc.update(
                "UPDATE audit_log_entries SET detail = 'x' WHERE id = ?", id))
                .hasMessageContaining("append-only");
        assertThatThrownBy(() -> jdbc.update(
                "DELETE FROM audit_log_entries WHERE id = ?", id))
                .hasMessageContaining("append-only");
    }

    @Test
    void securityTablesMigratedAndSeeded() {
        for (String table : new String[]{
                "webauthn_credentials", "conditional_access_policies", "workspace_security_settings",
                "audit_log_entries", "audit_log_stream_configs", "access_anomalies",
                "data_subject_requests", "compliance_evidence_bundles", "pentest_engagements"}) {
            Integer cnt = jdbc.queryForObject(
                    "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name=?",
                    Integer.class, table);
            assertThat(cnt).as("table %s exists", table).isEqualTo(1);
        }
        Integer policies = jdbc.queryForObject(
                "SELECT count(*) FROM conditional_access_policies WHERE workspace_id = 'WS-001'", Integer.class);
        assertThat(policies).isGreaterThanOrEqualTo(2);

        Integer perms = jdbc.queryForObject(
                "SELECT count(*) FROM permissions WHERE id IN ('view_audit_log','manage_security')", Integer.class);
        assertThat(perms).isEqualTo(2);
    }
}
