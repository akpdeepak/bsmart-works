package com.bcits.works;

import java.time.OffsetDateTime;
import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Custom (user-built) dashboard creation against real Postgres.
 *
 * <p>Regression guard for the NOT NULL {@code surface} column added in V70: the create endpoint
 * must default surface to {@code CANVAS}. Without that, the entity field is null and — because
 * {@link Dashboard} is not {@code @DynamicInsert} — Hibernate writes the column explicitly as NULL
 * (the DB {@code DEFAULT 'CANVAS'} only applies when the column is omitted), so the INSERT dies with
 * a {@code DataIntegrityViolationException} surfaced as HTTP 409 ("Failed to create dashboard" in the
 * UI). This test drives the exact frontend payload ({@code {name, scope, workspaceId}}, no surface).
 */
@Tag("integration")
@Testcontainers
@SpringBootTest
class CustomDashboardCreateIT {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired JdbcTemplate jdbc;
    @Autowired CustomDashboardController controller;

    private static final String WS  = "DSH-WS";
    private static final String USR = "DSH-USR";

    @BeforeEach
    void seed() {
        OffsetDateTime now = OffsetDateTime.now();
        jdbc.update("DELETE FROM dashboard_widgets WHERE dashboard_id IN "
            + "(SELECT id FROM dashboards WHERE workspace_id = ?)", WS);
        jdbc.update("DELETE FROM dashboards WHERE workspace_id = ?", WS);
        jdbc.update("DELETE FROM workspace_members WHERE workspace_id = ?", WS);
        jdbc.update("DELETE FROM workspaces WHERE id = ?", WS);
        jdbc.update("DELETE FROM users WHERE id = ?", USR);

        jdbc.update("INSERT INTO users(id, email, password_hash, full_name, created_at) VALUES (?,?,?,?,?)",
            USR, "dsh-usr@test.invalid", "x", "Dash User", now);
        jdbc.update("INSERT INTO workspaces(id, name, slug, created_at, updated_at) VALUES (?,?,?,?,?)",
            WS, "Dash WS", "dsh-ws", now, now);
        jdbc.update("INSERT INTO workspace_members(workspace_id, user_id, system_role, role_id) VALUES (?,?,?,?)",
            WS, USR, "ADMIN", "ADMIN");

        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(USR, null, List.of()));
    }

    @AfterEach
    void clearAuth() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void create_defaultsSurfaceToCanvas_andPersists() {
        Dashboard in = new Dashboard();
        in.setName("My sprint health");
        in.setWorkspaceId(WS);
        in.setScope("PERSONAL");
        // surface intentionally left null — exactly what the frontend sends.

        Dashboard saved = controller.create(in);

        assertThat(saved.getId()).startsWith("DSH-");
        assertThat(saved.getOwnerId()).isEqualTo(USR);
        assertThat(saved.getSurface()).isEqualTo("CANVAS");

        String persistedSurface = jdbc.queryForObject(
            "SELECT surface FROM dashboards WHERE id = ?", String.class, saved.getId());
        assertThat(persistedSurface).isEqualTo("CANVAS");
    }
}
