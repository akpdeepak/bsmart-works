package com.bcits.works;

import com.bcits.works.shared.ApiException;
import com.bcits.works.reporting.DashboardWidget;

import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
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
 * Today-layout resolution, RBAC and tenancy (RB-40 Â§1) against real Postgres.
 *
 * <p>Scenario categories: happy path (template + personal resolution), edge
 * (upsert replaces, reset falls back), error (bad role, oversized layout),
 * empty (builtin when nothing saved), <b>unauthorized</b> (MEMBER cannot write
 * the workspace template), <b>cross-tenant</b> (non-members can neither read
 * nor write another workspace's layouts).
 *
 * <p>Booting the context against the container also validates the V70 migration
 * plus entity mapping on a fresh Flyway run ({@code ddl-auto=validate}).
 */
@Tag("integration")
@Testcontainers
@SpringBootTest
class TodayLayoutServiceIT {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

    @Autowired JdbcTemplate jdbc;
    @Autowired TodayLayoutService service;

    private static final String WS_A    = "TL-WS-A";
    private static final String WS_B    = "TL-WS-B";
    private static final String ADMIN_A = "TL-USR-ADMIN-A";
    private static final String MEM_A   = "TL-USR-MEM-A";
    private static final String MEM_B   = "TL-USR-MEM-B";
    private static final String ROLE    = "developer";

    @BeforeEach
    void seed() {
        OffsetDateTime now = OffsetDateTime.now();

        // Teardown previous run's fixtures (FK order: widgets â†’ dashboards â†’ members â†’ ws â†’ users)
        jdbc.update("DELETE FROM dashboard_widgets WHERE dashboard_id IN "
            + "(SELECT id FROM dashboards WHERE workspace_id IN (?, ?))", WS_A, WS_B);
        jdbc.update("DELETE FROM dashboards WHERE workspace_id IN (?, ?)", WS_A, WS_B);
        jdbc.update("DELETE FROM workspace_members WHERE workspace_id IN (?, ?)", WS_A, WS_B);
        jdbc.update("DELETE FROM workspaces WHERE id IN (?, ?)", WS_A, WS_B);
        jdbc.update("DELETE FROM users WHERE id IN (?, ?, ?)", ADMIN_A, MEM_A, MEM_B);

        for (String[] u : new String[][] {
            {ADMIN_A, "tl-admin-a@test.invalid"},
            {MEM_A, "tl-mem-a@test.invalid"},
            {MEM_B, "tl-mem-b@test.invalid"}}) {
            jdbc.update(
                "INSERT INTO users(id, email, password_hash, full_name, created_at) VALUES (?,?,?,?,?)",
                u[0], u[1], "x", u[0], now);
        }

        jdbc.update("INSERT INTO workspaces(id, name, slug, created_at, updated_at) VALUES (?,?,?,?,?)",
            WS_A, "Today Layout WS A", "tl-ws-a", now, now);
        jdbc.update("INSERT INTO workspaces(id, name, slug, created_at, updated_at) VALUES (?,?,?,?,?)",
            WS_B, "Today Layout WS B", "tl-ws-b", now, now);

        jdbc.update("INSERT INTO workspace_members(workspace_id, user_id, system_role, role_id) "
            + "VALUES (?,?,?,?)", WS_A, ADMIN_A, "ADMIN", "ADMIN");
        jdbc.update("INSERT INTO workspace_members(workspace_id, user_id, system_role, role_id) "
            + "VALUES (?,?,?,?)", WS_A, MEM_A, "MEMBER", "MEMBER");
        jdbc.update("INSERT INTO workspace_members(workspace_id, user_id, system_role, role_id) "
            + "VALUES (?,?,?,?)", WS_B, MEM_B, "MEMBER", "MEMBER");
    }

    private static DashboardWidget widget(String type, String title) {
        DashboardWidget w = new DashboardWidget();
        w.setWidgetType(type);
        w.setTitle(title);
        w.setConfig("{\"source\":\"metric\",\"key\":\"activeSprint\"}");
        w.setGridW(4);
        return w;
    }

    // â”€â”€ Resolution â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    @Test
    void effective_isBuiltin_whenNothingSaved() {
        TodayLayoutService.EffectiveLayout out = service.effective(MEM_A, WS_A, ROLE);
        assertThat(out.source()).isEqualTo("builtin");
        assertThat(out.dashboard()).isNull();
    }

    @Test
    void workspaceTemplate_appliesToAllMembers() {
        service.saveWorkspaceTemplate(ADMIN_A, WS_A, ROLE,
            List.of(widget("DUE_RADAR", "Due radar"), widget("SCORECARD", "Open items")));

        TodayLayoutService.EffectiveLayout out = service.effective(MEM_A, WS_A, ROLE);
        assertThat(out.source()).isEqualTo("workspace");
        assertThat(out.dashboard().getWidgets()).hasSize(2);
        assertThat(out.dashboard().getOwnerId()).isNull();
        assertThat(out.dashboard().getSurface()).isEqualTo("TODAY");
    }

    @Test
    void personalOverride_winsOverTemplate_andResetFallsBack() {
        service.saveWorkspaceTemplate(ADMIN_A, WS_A, ROLE, List.of(widget("SCORECARD", "Template")));
        service.savePersonal(MEM_A, WS_A, ROLE,
            List.of(widget("DAY_BARS", "My week"), widget("SEGMENT_BAR", "Queue mix"),
                    widget("SCORECARD", "Mine")));

        TodayLayoutService.EffectiveLayout personal = service.effective(MEM_A, WS_A, ROLE);
        assertThat(personal.source()).isEqualTo("personal");
        assertThat(personal.dashboard().getWidgets()).hasSize(3);

        // Another member is unaffected by MEM_A's personal layout.
        TodayLayoutService.EffectiveLayout admins = service.effective(ADMIN_A, WS_A, ROLE);
        assertThat(admins.source()).isEqualTo("workspace");

        service.resetPersonal(MEM_A, WS_A, ROLE);
        TodayLayoutService.EffectiveLayout afterReset = service.effective(MEM_A, WS_A, ROLE);
        assertThat(afterReset.source()).isEqualTo("workspace");
        assertThat(afterReset.dashboard().getWidgets()).extracting(DashboardWidget::getTitle)
            .containsExactly("Template");
    }

    @Test
    void templateUpsert_replacesWidgets_neverDuplicatesTheRow() {
        service.saveWorkspaceTemplate(ADMIN_A, WS_A, ROLE, List.of(widget("SCORECARD", "v1")));
        service.saveWorkspaceTemplate(ADMIN_A, WS_A, ROLE,
            List.of(widget("PIE", "v2a"), widget("BAR", "v2b")));

        Integer rows = jdbc.queryForObject(
            "SELECT count(*) FROM dashboards WHERE workspace_id = ? AND surface = 'TODAY' "
            + "AND role_key = ? AND owner_id IS NULL", Integer.class, WS_A, ROLE);
        assertThat(rows).isEqualTo(1);

        TodayLayoutService.EffectiveLayout out = service.effective(MEM_A, WS_A, ROLE);
        assertThat(out.dashboard().getWidgets()).extracting(DashboardWidget::getTitle)
            .containsExactly("v2a", "v2b");
    }

    // â”€â”€ Unauthorized (RB-40 Â§1 mandatory scenario) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    @Test
    void member_cannotSaveWorkspaceTemplate() {
        assertThatThrownBy(() ->
            service.saveWorkspaceTemplate(MEM_A, WS_A, ROLE, List.of(widget("SCORECARD", "x"))))
            .isInstanceOf(ApiException.class);

        Integer rows = jdbc.queryForObject(
            "SELECT count(*) FROM dashboards WHERE workspace_id = ? AND surface = 'TODAY'",
            Integer.class, WS_A);
        assertThat(rows).isZero();
    }

    // â”€â”€ Cross-tenant (RB-40 Â§1 mandatory scenario) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    @Test
    void nonMember_cannotReadOrWriteAnotherWorkspacesLayouts() {
        service.saveWorkspaceTemplate(ADMIN_A, WS_A, ROLE, List.of(widget("SCORECARD", "A-only")));

        assertThatThrownBy(() -> service.effective(MEM_B, WS_A, ROLE))
            .isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> service.savePersonal(MEM_B, WS_A, ROLE,
            List.of(widget("SCORECARD", "intruder"))))
            .isInstanceOf(ApiException.class);

        Integer intruderRows = jdbc.queryForObject(
            "SELECT count(*) FROM dashboards WHERE workspace_id = ? AND owner_id = ?",
            Integer.class, WS_A, MEM_B);
        assertThat(intruderRows).isZero();
    }

    // â”€â”€ Validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    @Test
    void validation_rejectsUnknownRole_andOversizedLayout() {
        assertThatThrownBy(() -> service.effective(MEM_A, WS_A, "cto"))
            .isInstanceOf(ApiException.class);

        List<DashboardWidget> thirteen = new java.util.ArrayList<>();
        for (int i = 0; i < 13; i++) {
            thirteen.add(widget("SCORECARD", "w" + i));
        }
        assertThatThrownBy(() -> service.savePersonal(MEM_A, WS_A, ROLE, thirteen))
            .isInstanceOf(ApiException.class);

        assertThatThrownBy(() -> service.savePersonal(MEM_A, WS_A, ROLE,
            List.of(widget(" ", "blank type"))))
            .isInstanceOf(ApiException.class);
    }
}
