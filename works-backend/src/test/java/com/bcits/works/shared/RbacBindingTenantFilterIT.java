package com.bcits.works.shared;

import com.bcits.works.auth.RbacService;

import com.bcits.works.projects.Project;
import com.bcits.works.projects.ProjectRepository;



import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.hibernate.Session;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * End-to-end proof for #243 <b>Slice A</b> — central tenant-filter binding at the authorization choke
 * point (RB-40 §1). Where {@link CrossTenantFilterIsolationIT} drives the filter by binding
 * {@link TenantContext} directly, this test drives the <b>real production path</b>: it calls
 * {@link RbacService#getUserTier(String, String)} (the one app-wide gate every single-workspace-
 * authorized read funnels through) with the binding flag <b>on</b>, and asserts the central
 * {@code workspaceFilter} is bound as a side effect — extending binding from {@code ProjectService}-only
 * to every authorized path.
 *
 * <p>It proves both halves of the slice's safety contract:
 * <ul>
 *   <li><b>Backstop works</b> — a successful single-workspace authorization narrows a subsequent
 *       predicate-free read to that workspace (isolation via the filter alone).</li>
 *   <li><b>No over-filtering</b> — a read that does <i>not</i> pass through a single-workspace tier
 *       check (the multi-workspace pattern: work-item lists, {@code /my}, {@code findAllScopedToUser})
 *       is never bound, so it still sees every workspace it should. This is the slice's headline risk,
 *       pinned by a test.</li>
 *   <li><b>Fail-closed on non-membership</b> — a denied authorization binds nothing.</li>
 * </ul>
 *
 * <p>The flag is forced on via {@link TestPropertySource}; the default-off (inert-on-merge) behaviour
 * is covered by {@link RbacServiceTest}. {@code @Transactional} gives seed + reads one shared Hibernate
 * session — the same one {@link CurrentWorkspace#bind(String)} syncs at runtime.
 */
@Tag("integration")
@Testcontainers
@SpringBootTest
@Transactional
@TestPropertySource(properties = "tenant.filter.binding.enabled=true")
class RbacBindingTenantFilterIT {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

    @Autowired JdbcTemplate jdbc;
    @Autowired RbacService rbac;
    @Autowired WorkspaceFilterActivator activator;
    @Autowired ProjectRepository projectRepository;

    @PersistenceContext EntityManager em;

    private static final String WS_A = "RB-WS-A";
    private static final String WS_B = "RB-WS-B";
    private static final String USER_B = "RB-USR-B";   // member of WS_B only
    private static final String USER_M = "RB-USR-M";   // member of BOTH workspaces
    private static final String PROJ_A = "RB-PROJ-A";
    private static final String PROJ_B = "RB-PROJ-B";

    @BeforeEach
    void seed() {
        OffsetDateTime now = OffsetDateTime.now();

        // Teardown previous run (FK-safe, id-scoped so unrelated seed data is untouched).
        jdbc.update("DELETE FROM workspace_members WHERE user_id IN (?, ?)", USER_B, USER_M);
        jdbc.update("DELETE FROM projects   WHERE id IN (?, ?)", PROJ_A, PROJ_B);
        jdbc.update("DELETE FROM workspaces  WHERE id IN (?, ?)", WS_A, WS_B);
        jdbc.update("DELETE FROM users       WHERE id IN (?, ?)", USER_B, USER_M);

        jdbc.update("INSERT INTO users(id, email, password_hash, full_name, created_at) VALUES (?,?,?,?,?)",
            USER_B, "rb-user-b@test.invalid", "x", "Binding User B", now);
        jdbc.update("INSERT INTO users(id, email, password_hash, full_name, created_at) VALUES (?,?,?,?,?)",
            USER_M, "rb-user-m@test.invalid", "x", "Binding User M (multi)", now);

        jdbc.update("INSERT INTO workspaces(id, name, slug, created_at, updated_at) VALUES (?,?,?,?,?)",
            WS_A, "Binding WS A", "rb-ws-a", now, now);
        jdbc.update("INSERT INTO workspaces(id, name, slug, created_at, updated_at) VALUES (?,?,?,?,?)",
            WS_B, "Binding WS B", "rb-ws-b", now, now);

        jdbc.update("INSERT INTO projects(id, workspace_id, name, key_prefix, slug, created_at) "
                + "VALUES (?,?,?,?,?,?)", PROJ_A, WS_A, "Project A", "A", "rb-proj-a", now);
        jdbc.update("INSERT INTO projects(id, workspace_id, name, key_prefix, slug, created_at) "
                + "VALUES (?,?,?,?,?,?)", PROJ_B, WS_B, "Project B", "B", "rb-proj-b", now);

        // Memberships: B in WS_B only; M in both. role_id 'MEMBER' (tier 2) is seeded by V7.
        jdbc.update("INSERT INTO workspace_members(workspace_id, user_id, system_role, role_id) "
                + "VALUES (?,?, 'MEMBER', 'MEMBER')", WS_B, USER_B);
        jdbc.update("INSERT INTO workspace_members(workspace_id, user_id, system_role, role_id) "
                + "VALUES (?,?, 'MEMBER', 'MEMBER')", WS_A, USER_M);
        jdbc.update("INSERT INTO workspace_members(workspace_id, user_id, system_role, role_id) "
                + "VALUES (?,?, 'MEMBER', 'MEMBER')", WS_B, USER_M);

        // Reads must hit the DB through the filter, not the first-level cache.
        em.clear();
    }

    @AfterEach
    void cleanup() {
        TenantContext.clear();
    }

    /** XT/RB project ids visible through the predicate-free {@code findAll()} query, sorted. */
    private List<String> visibleProjectIds() {
        return projectRepository.findAll().stream()
                .map(Project::getId)
                .filter(id -> id.startsWith("RB-PROJ-"))
                .sorted()
                .toList();
    }

    /**
     * The production path: a member-tier lookup for a single workspace binds the central filter to it,
     * and a subsequent predicate-free read returns only that workspace's rows. No query here names
     * {@code workspace_id} — the isolation is the filter, bound by {@code RbacService} alone.
     */
    @Test
    void singleWorkspaceAuthorization_bindsCentralFilter_andIsolatesReads() {
        int tier = rbac.getUserTier(USER_B, WS_B);
        assertThat(tier).as("USER_B is a member of WS_B").isGreaterThanOrEqualTo(1);

        // The authorization bound the workspace via CurrentWorkspace.bind → TenantContext + session sync.
        assertThat(TenantContext.getWorkspace()).as("authorization bound WS_B").isEqualTo(WS_B);
        assertThat(TenantContext.isFilterActive()).as("filter is active for the bound workspace").isTrue();

        // Re-assert on the shared test session (same session bind() syncs at runtime) and read.
        activator.apply(em.unwrap(Session.class));
        assertThat(visibleProjectIds())
                .as("a WS_B-authorized read sees only WS_B's project, never WS_A's — via the filter alone")
                .containsExactly(PROJ_B);
    }

    /**
     * The over-filtering guard — the slice's headline risk. A multi-workspace read (the pattern used by
     * work-item lists / {@code findAllScopedToUser}) does <b>not</b> pass through a single-workspace tier
     * check, so nothing binds and the caller still sees every workspace. Modelled here as USER_M (a
     * member of both) reading with no single-workspace authorization in play: both projects remain
     * visible. Slice A can only ever narrow a read that was explicitly single-workspace-authorized.
     */
    @Test
    void multiWorkspaceRead_isNotOverFiltered_whenNoSingleWorkspaceCheck() {
        // No single-workspace authorization → nothing bound (the multi-workspace code path).
        assertThat(TenantContext.hasWorkspace()).isFalse();
        activator.apply(em.unwrap(Session.class));

        assertThat(visibleProjectIds())
                .as("multi-workspace member M is not over-filtered — both workspaces visible")
                .containsExactly(PROJ_A, PROJ_B);
    }

    /**
     * Fail-closed: authorizing against a workspace the caller is not a member of returns tier 0 and
     * binds nothing — a denied check must never activate (or worse, mis-scope) the filter.
     */
    @Test
    void deniedAuthorization_bindsNothing() {
        int tier = rbac.getUserTier(USER_B, WS_A); // USER_B is NOT a member of WS_A
        assertThat(tier).as("USER_B is not a member of WS_A").isZero();
        assertThat(TenantContext.hasWorkspace()).as("a denied authorization binds no workspace").isFalse();
        assertThat(TenantContext.isFilterActive()).isFalse();
    }
}
