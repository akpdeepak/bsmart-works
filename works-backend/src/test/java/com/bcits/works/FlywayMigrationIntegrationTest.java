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
 * The DB / Flyway CI stage (the gap parked since I01-S04). Boots the full Spring context against a
 * real Postgres via Testcontainers, so on every PR:
 *   - every Flyway migration is applied end-to-end â€” a duplicate version or bad SQL fails the boot
 *     (this is exactly what let the V35 collision reach main mid-iteration), and
 *   - Hibernate {@code ddl-auto=validate} confirms the entities match the migrated schema.
 * It also asserts the I01-S04 append-only event guarantee at the database.
 *
 * <p>Tagged {@code "integration"} and named {@code *IntegrationTest}, so it runs only via the
 * failsafe-driven {@code backend-integration-test} CI job (Docker required) â€” never in the unit jobs.
 */
@Tag("integration")
@Testcontainers
@SpringBootTest
class FlywayMigrationIntegrationTest {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    JdbcTemplate jdbc;

    @Test
    void everyMigrationAppliesCleanlyAndSchemaIsValid() {
        // Context start ran Flyway against a real Postgres; a dup version or bad SQL would have
        // failed the boot. Assert the history is healthy and the core tables exist.
        Integer applied = jdbc.queryForObject(
                "SELECT count(*) FROM flyway_schema_history WHERE success", Integer.class);
        assertThat(applied).as("successful Flyway migrations").isNotNull().isGreaterThan(30);

        Integer failed = jdbc.queryForObject(
                "SELECT count(*) FROM flyway_schema_history WHERE NOT success", Integer.class);
        assertThat(failed).as("failed migrations").isEqualTo(0);

        for (String table : new String[]{"workspaces", "projects", "work_items", "events"}) {
            Integer cnt = jdbc.queryForObject(
                    "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name=?",
                    Integer.class, table);
            assertThat(cnt).as("table %s exists", table).isEqualTo(1);
        }
    }

    @Test
    void eventsAreAppendOnlyAndCarryWorkspaceId() {
        // workspace_id column + append-only trigger came from V40 (I01-S04).
        jdbc.update("INSERT INTO events (aggregate_id, workspace_id, event_type, actor_id, payload, occurred_at) "
                + "VALUES ('WS-IT', 'WS-IT', 'IT_EVENT', 'USR-IT', '{}', NOW())");
        Long id = jdbc.queryForObject("SELECT id FROM events WHERE aggregate_id = 'WS-IT'", Long.class);
        assertThat(id).isNotNull();

        assertThatThrownBy(() -> jdbc.update("UPDATE events SET event_type = 'X' WHERE id = ?", id))
                .hasMessageContaining("append-only");
        assertThatThrownBy(() -> jdbc.update("DELETE FROM events WHERE id = ?", id))
                .hasMessageContaining("append-only");

        // The row is unchanged and still present â€” the audit trail is immutable.
        assertThat(jdbc.queryForObject(
                "SELECT event_type FROM events WHERE id = ?", String.class, id)).isEqualTo("IT_EVENT");
    }
}
