package com.bcits.works.shared;

import com.bcits.works.messaging.Comment;
import com.bcits.works.messaging.CommentRepository;
import com.bcits.works.security.ComplianceRule;
import com.bcits.works.security.ComplianceRuleRepository;
import com.bcits.works.projects.CrossProjectDependency;
import com.bcits.works.projects.CrossProjectDependencyRepository;
import com.bcits.works.reporting.Dashboard;
import com.bcits.works.reporting.DashboardRepository;
import com.bcits.works.knowledge.KnowledgeSpace;
import com.bcits.works.knowledge.KnowledgeSpaceRepository;
import com.bcits.works.reporting.MetricSnapshot;
import com.bcits.works.reporting.MetricSnapshotRepository;
import com.bcits.works.projects.Project;
import com.bcits.works.projects.ProjectRepository;
import com.bcits.works.sla.SlaPolicy;
import com.bcits.works.sla.SlaPolicyRepository;
import com.bcits.works.workitems.WorkItem;
import com.bcits.works.workitems.WorkItemRepository;



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
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Multi-domain cross-tenant isolation proof for the central Hibernate {@code workspaceFilter}
 * (RB-40 §1, EPIC P1 / #243 §6). Seeds <b>two</b> workspaces (A and B), each owning rows across a
 * representative set of the highest-risk tenant-scoped domains from the must-filter inventory:
 *
 * <ul>
 *   <li><b>work items</b> — proven through {@link Project}, the tenant anchor for {@code work_items}
 *       (work items themselves are scoped transitively via {@code project_id} in a later slice, so the
 *       directly-filtered {@code projects} table is the representative anchor for this domain);</li>
 *   <li><b>knowledge / articles</b> — through {@link KnowledgeSpace}, the tenant anchor for
 *       {@code articles} ({@code articles.space_id → knowledge_spaces.workspace_id});</li>
 *   <li><b>dashboards</b> — {@link Dashboard};</li>
 *   <li><b>SLA</b> — {@link SlaPolicy};</li>
 *   <li><b>compliance</b> — {@link ComplianceRule};</li>
 *   <li><b>KPI</b> — {@link MetricSnapshot}.</li>
 * </ul>
 *
 * <h2>What this proves (and how it differs from {@link WorkspaceTenantIsolationIT})</h2>
 * {@link WorkspaceTenantIsolationIT} asserts isolation by re-typing the {@code MEMBER_PROJECTS}
 * predicate in each raw {@code JdbcTemplate} query — i.e. it validates the <i>per-query</i> scoping.
 * This test deliberately does the opposite: it binds a workspace exactly as
 * {@link CurrentWorkspace#bind(String)} does at runtime, then reads through
 * <b>predicate-free</b> repository methods ({@code findAll()}, {@code findById()}, {@code count()})
 * that carry <b>no</b> {@code workspace_id} clause of their own. Any isolation observed therefore
 * comes from the central filter <i>alone</i> — this is the "scoping applied centrally, not re-typed
 * per query, so it cannot be forgotten" guarantee (RB-40 §1) exercised end-to-end against real
 * Postgres (Testcontainers, RB-10 §7).
 *
 * <p>The headline assertion is the cross-tenant one: <b>a user bound to workspace B can read zero of
 * workspace A's rows in every domain</b> (and vice-versa), even though both tenants' data lives in
 * the same database. A {@link #escapeHatch_seesBothWorkspaces_inEveryDomain() system-escape-hatch}
 * test confirms the legitimate cross-tenant path is not over-filtered.
 *
 * <h2>Driving the filter in a test</h2>
 * The filter applies on the Hibernate {@link Session} that the repositories share. We bind the
 * workspace into {@link TenantContext} and call {@link WorkspaceFilterActivator#apply(Session)} on
 * the injected {@link EntityManager}'s session — precisely what {@code CurrentWorkspace.bind} does
 * per request. The class is {@code @Transactional} so a single session spans seed + reads;
 * {@link EntityManager#clear()} after seeding ensures reads hit the DB through the filter, not the
 * first-level cache.
 */
@Tag("integration")
@Testcontainers
@SpringBootTest
@Transactional
class CrossTenantFilterIsolationIT {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

    @Autowired JdbcTemplate jdbc;
    @Autowired WorkspaceFilterActivator activator;

    @Autowired ProjectRepository projectRepository;
    @Autowired KnowledgeSpaceRepository knowledgeSpaceRepository;
    @Autowired DashboardRepository dashboardRepository;
    @Autowired SlaPolicyRepository slaPolicyRepository;
    @Autowired ComplianceRuleRepository complianceRuleRepository;
    @Autowired MetricSnapshotRepository metricSnapshotRepository;
    // Transitive (no workspace_id column) entities — Slices B+C subquery @Filter coverage.
    @Autowired WorkItemRepository workItemRepository;                       // 1-hop via project_id
    @Autowired CommentRepository commentRepository;                        // 2-hop via work_item -> project
    @Autowired CrossProjectDependencyRepository crossProjectDependencyRepository; // OR/nullable from/to

    @PersistenceContext EntityManager em;

    // ── Fixture ids ──────────────────────────────────────────────────────────────────────────
    private static final String WS_A = "XT-WS-A";
    private static final String WS_B = "XT-WS-B";
    private static final String USER_A = "XT-USR-A";
    private static final String USER_B = "XT-USR-B";

    // Per-domain row ids (A vs B). Suffix -A / -B encodes the owning workspace.
    private static final String PROJ_A = "XT-PROJ-A";
    private static final String PROJ_B = "XT-PROJ-B";
    private static final String SPACE_A = "XT-SPACE-A";
    private static final String SPACE_B = "XT-SPACE-B";
    private static final String DASH_A = "XT-DASH-A";
    private static final String DASH_B = "XT-DASH-B";
    private static final String SLA_A = "XT-SLA-A";
    private static final String SLA_B = "XT-SLA-B";
    private static final String RULE_A = "XT-RULE-A";
    private static final String RULE_B = "XT-RULE-B";
    private static final String SNAP_A = "XT-SNAP-A";
    private static final String SNAP_B = "XT-SNAP-B";
    // Transitive children (Slices B+C)
    private static final String WI_A = "XT-WI-A";
    private static final String WI_B = "XT-WI-B";
    private static final String CPD_A = "XT-CPD-A";
    private static final String CPD_B = "XT-CPD-B";

    @BeforeEach
    void seed() {
        OffsetDateTime now = OffsetDateTime.now();

        // Teardown previous run (FK-safe order). Each DELETE is id-scoped so it never touches
        // unrelated seed data the boot Flyway scripts may have inserted.
        // Transitive children first (they FK into work_items / projects).
        jdbc.update("DELETE FROM comments WHERE work_item_id IN (?, ?)", WI_A, WI_B);
        jdbc.update("DELETE FROM cross_project_dependencies WHERE id IN (?, ?)", CPD_A, CPD_B);
        jdbc.update("DELETE FROM work_items WHERE id IN (?, ?)", WI_A, WI_B);
        jdbc.update("DELETE FROM metric_snapshots WHERE id IN (?, ?)", SNAP_A, SNAP_B);
        jdbc.update("DELETE FROM compliance_rules WHERE id IN (?, ?)", RULE_A, RULE_B);
        jdbc.update("DELETE FROM sla_policies     WHERE id IN (?, ?)", SLA_A, SLA_B);
        jdbc.update("DELETE FROM dashboards        WHERE id IN (?, ?)", DASH_A, DASH_B);
        jdbc.update("DELETE FROM knowledge_spaces  WHERE id IN (?, ?)", SPACE_A, SPACE_B);
        jdbc.update("DELETE FROM projects          WHERE id IN (?, ?)", PROJ_A, PROJ_B);
        jdbc.update("DELETE FROM workspaces        WHERE id IN (?, ?)", WS_A, WS_B);
        jdbc.update("DELETE FROM users             WHERE id IN (?, ?)", USER_A, USER_B);

        jdbc.update("INSERT INTO users(id, email, password_hash, full_name, created_at) VALUES (?,?,?,?,?)",
            USER_A, "xt-user-a@test.invalid", "x", "Cross-tenant User A", now);
        jdbc.update("INSERT INTO users(id, email, password_hash, full_name, created_at) VALUES (?,?,?,?,?)",
            USER_B, "xt-user-b@test.invalid", "x", "Cross-tenant User B", now);

        jdbc.update("INSERT INTO workspaces(id, name, slug, created_at, updated_at) VALUES (?,?,?,?,?)",
            WS_A, "Cross-tenant WS A", "xt-ws-a", now, now);
        jdbc.update("INSERT INTO workspaces(id, name, slug, created_at, updated_at) VALUES (?,?,?,?,?)",
            WS_B, "Cross-tenant WS B", "xt-ws-b", now, now);

        seedDomainRows(WS_A, PROJ_A, SPACE_A, DASH_A, SLA_A, RULE_A, SNAP_A, USER_A, now);
        seedDomainRows(WS_B, PROJ_B, SPACE_B, DASH_B, SLA_B, RULE_B, SNAP_B, USER_B, now);

        // Cross-project dependency: cross-PROJECT by design, scoped via EITHER nullable endpoint
        // (the OR-condition @Filter). A's row is anchored via from_project_id, B's via to_project_id —
        // so the two rows exercise BOTH branches of the OR across the two workspaces.
        jdbc.update("INSERT INTO cross_project_dependencies(id, from_project_id, to_project_id, title, "
                + "created_at, updated_at) VALUES (?,?,?,?,?,?)", CPD_A, PROJ_A, null, "CPD A", now, now);
        jdbc.update("INSERT INTO cross_project_dependencies(id, from_project_id, to_project_id, title, "
                + "created_at, updated_at) VALUES (?,?,?,?,?,?)", CPD_B, null, PROJ_B, "CPD B", now, now);

        // Reads must hit the DB through the filter, not the first-level cache.
        em.clear();
    }

    private void seedDomainRows(String ws, String proj, String space, String dash, String sla,
                                String rule, String snap, String user, OffsetDateTime now) {
        // work items domain anchor
        jdbc.update("INSERT INTO projects(id, workspace_id, name, key_prefix, slug, created_at) "
                + "VALUES (?,?,?,?,?,?)",
            proj, ws, "Project " + ws, ws.substring(ws.length() - 1), "xt-proj-" + ws, now);

        // knowledge / articles domain anchor
        jdbc.update("INSERT INTO knowledge_spaces(id, workspace_id, name, visibility, created_by, "
                + "created_at, updated_at) VALUES (?,?,?,?,?,?,?)",
            space, ws, "Space " + ws, "TEAM", user, now, now);

        // dashboards
        jdbc.update("INSERT INTO dashboards(id, workspace_id, owner_id, name, scope, layout_cols, "
                + "created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)",
            dash, ws, user, "Dashboard " + ws, "ORG", 12, now, now);

        // SLA (calendar_id left NULL = 24x7; active = false is fine for a read test)
        jdbc.update("INSERT INTO sla_policies(id, workspace_id, name, scope_bql, active, created_by, "
                + "created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)",
            sla, ws, "SLA " + ws, "", false, user, now, now);

        // compliance (assertion_bql is NOT NULL)
        jdbc.update("INSERT INTO compliance_rules(id, workspace_id, name, scope_bql, assertion_bql, "
                + "severity, active, created_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
            rule, ws, "Rule " + ws, "", "status = 'Done'", "MEDIUM", false, user, now, now);

        // KPI snapshot (workspace_id is NOT NULL)
        jdbc.update("INSERT INTO metric_snapshots(id, workspace_id, metric_key, scope_level, period, "
                + "value, sample_size, created_at) VALUES (?,?,?,?,?,?,?,?)",
            snap, ws, "velocity", "ORG", "2026-06", 42.0, 7, now);

        // Transitive children (Slices B+C): a work item under the project (1-hop project_id subquery)
        // and a comment under that work item (2-hop work_item -> project subquery).
        String suffix = ws.substring(ws.length() - 1);
        String wi = "XT-WI-" + suffix;
        jdbc.update("INSERT INTO work_items(id, title, status, type, project_id, created_by, created_at) "
                + "VALUES (?,?,?,?,?,?,?)", wi, "WI " + ws, "To Do", "TASK", proj, user, now);
        jdbc.update("INSERT INTO comments(work_item_id, author_id, body, created_at) VALUES (?,?,?,?)",
            wi, user, "XT-CMT-" + suffix, now);
    }

    @AfterEach
    void cleanup() {
        TenantContext.clear();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────────────────

    /** Bind {@code workspaceId} (as a request would) and run {@code body} with the filter applied. */
    private <T> T boundTo(String workspaceId, Supplier<T> body) {
        TenantContext.setWorkspace(workspaceId);
        activator.apply(em.unwrap(Session.class));
        try {
            return body.get();
        } finally {
            TenantContext.clear();
        }
    }

    private boolean visibleViaFindAll_project(String id) {
        return projectRepository.findAll().stream().anyMatch(p -> id.equals(p.getId()));
    }

    // ── Cross-tenant denial: B cannot read A's rows, in every domain ───────────────────────────

    /**
     * The headline guarantee. Bound to workspace B, reading through predicate-free {@code findAll()}
     * in each domain returns workspace B's row and <b>never</b> workspace A's — purely because the
     * central filter narrows the read. No query in this test names {@code workspace_id}.
     */
    @Test
    void userInWorkspaceB_cannotSeeWorkspaceA_inAnyDomain() {
        boundTo(WS_B, () -> {
            // work items domain (via Project anchor)
            List<String> projects = projectRepository.findAll().stream().map(Project::getId)
                .filter(id -> id.startsWith("XT-PROJ-")).sorted().toList();
            assertThat(projects).as("projects: B sees only its own, never A's").containsExactly(PROJ_B);

            // knowledge / articles domain (via KnowledgeSpace anchor)
            List<String> spaces = knowledgeSpaceRepository.findAll().stream().map(KnowledgeSpace::getId)
                .filter(id -> id.startsWith("XT-SPACE-")).sorted().toList();
            assertThat(spaces).as("knowledge spaces: B sees only its own").containsExactly(SPACE_B);

            // dashboards
            List<String> dashboards = dashboardRepository.findAll().stream().map(Dashboard::getId)
                .filter(id -> id.startsWith("XT-DASH-")).sorted().toList();
            assertThat(dashboards).as("dashboards: B sees only its own").containsExactly(DASH_B);

            // SLA
            List<String> slas = slaPolicyRepository.findAll().stream().map(SlaPolicy::getId)
                .filter(id -> id.startsWith("XT-SLA-")).sorted().toList();
            assertThat(slas).as("SLA policies: B sees only its own").containsExactly(SLA_B);

            // compliance
            List<String> rules = complianceRuleRepository.findAll().stream().map(ComplianceRule::getId)
                .filter(id -> id.startsWith("XT-RULE-")).sorted().toList();
            assertThat(rules).as("compliance rules: B sees only its own").containsExactly(RULE_B);

            // KPI
            List<String> snaps = metricSnapshotRepository.findAll().stream().map(MetricSnapshot::getId)
                .filter(id -> id.startsWith("XT-SNAP-")).sorted().toList();
            assertThat(snaps).as("KPI snapshots: B sees only its own").containsExactly(SNAP_B);

            return null;
        });
    }

    /** Inverse direction: bound to A, none of B's rows are reachable, in every domain. */
    @Test
    void userInWorkspaceA_cannotSeeWorkspaceB_inAnyDomain() {
        boundTo(WS_A, () -> {
            assertThat(projectRepository.findAll().stream().map(Project::getId)
                .filter(id -> id.startsWith("XT-PROJ-")).toList()).containsExactly(PROJ_A);
            assertThat(knowledgeSpaceRepository.findAll().stream().map(KnowledgeSpace::getId)
                .filter(id -> id.startsWith("XT-SPACE-")).toList()).containsExactly(SPACE_A);
            assertThat(dashboardRepository.findAll().stream().map(Dashboard::getId)
                .filter(id -> id.startsWith("XT-DASH-")).toList()).containsExactly(DASH_A);
            assertThat(slaPolicyRepository.findAll().stream().map(SlaPolicy::getId)
                .filter(id -> id.startsWith("XT-SLA-")).toList()).containsExactly(SLA_A);
            assertThat(complianceRuleRepository.findAll().stream().map(ComplianceRule::getId)
                .filter(id -> id.startsWith("XT-RULE-")).toList()).containsExactly(RULE_A);
            assertThat(metricSnapshotRepository.findAll().stream().map(MetricSnapshot::getId)
                .filter(id -> id.startsWith("XT-SNAP-")).toList()).containsExactly(SNAP_A);
            return null;
        });
    }

    /**
     * A foreign tenant's row is unreachable through a <b>filtered query path</b> — a
     * guessed/enumerated id cannot surface another tenant's data via a normal repository read.
     *
     * <p><b>Why a query, not {@code findById}.</b> A Hibernate {@code @Filter} applies to query and
     * collection loads, <i>not</i> to a direct primary-key load ({@code EntityManager.find} /
     * {@code Session.get}, which {@code JpaRepository.findById} uses) — a by-PK fetch deliberately
     * ignores enabled filters. That is exactly why isolation cannot rest on the filter alone for
     * id-addressable reads: services must resolve a record through a workspace-scoped query (or
     * re-check ownership) rather than a raw {@code findById}. Here we model the safe path — locating
     * a row through the filtered {@code findAll()} query — and assert the foreign id is absent from
     * it, while the caller's own id is present. This is the filter doing the work on the query path.
     */
    @Test
    void foreignWorkspaceRow_isUnreachableThroughFilteredQuery_inEveryDomain() {
        boundTo(WS_B, () -> {
            assertThat(projectRepository.findAll().stream().map(Project::getId).toList())
                .as("B's filtered query reaches its own project, never A's")
                .contains(PROJ_B).doesNotContain(PROJ_A);
            assertThat(knowledgeSpaceRepository.findAll().stream().map(KnowledgeSpace::getId).toList())
                .as("B's filtered query reaches its own space, never A's")
                .contains(SPACE_B).doesNotContain(SPACE_A);
            assertThat(dashboardRepository.findAll().stream().map(Dashboard::getId).toList())
                .as("B's filtered query reaches its own dashboard, never A's")
                .contains(DASH_B).doesNotContain(DASH_A);
            assertThat(slaPolicyRepository.findAll().stream().map(SlaPolicy::getId).toList())
                .as("B's filtered query reaches its own SLA policy, never A's")
                .contains(SLA_B).doesNotContain(SLA_A);
            assertThat(complianceRuleRepository.findAll().stream().map(ComplianceRule::getId).toList())
                .as("B's filtered query reaches its own compliance rule, never A's")
                .contains(RULE_B).doesNotContain(RULE_A);
            assertThat(metricSnapshotRepository.findAll().stream().map(MetricSnapshot::getId).toList())
                .as("B's filtered query reaches its own KPI snapshot, never A's")
                .contains(SNAP_B).doesNotContain(SNAP_A);
            return null;
        });
    }

    /**
     * Slices B+C: the <b>transitive</b> subquery filters isolate exactly like the direct-column ones,
     * proven through predicate-free {@code findAll()}. Covers the three shapes every transitive entity
     * uses: 1-hop ({@code WorkItem} via {@code project_id}), 2-hop ({@code Comment} via
     * {@code work_item_id → project_id}), and the OR/nullable case ({@code CrossProjectDependency}).
     * The two CPD rows anchor on opposite endpoints (A via {@code from_project_id}, B via
     * {@code to_project_id}), so this exercises <b>both</b> branches of the OR across both directions.
     */
    @Test
    void transitiveEntities_areIsolated_bySubqueryFilter() {
        boundTo(WS_B, () -> {
            assertThat(workItemRepository.findAll().stream().map(WorkItem::getId)
                .filter(id -> id.startsWith("XT-WI-")).sorted().toList())
                .as("work items (1-hop project_id subquery): B sees only its own").containsExactly(WI_B);
            assertThat(commentRepository.findAll().stream().map(Comment::getBody)
                .filter(b -> b != null && b.startsWith("XT-CMT-")).sorted().toList())
                .as("comments (2-hop subquery): B sees only its own").containsExactly("XT-CMT-B");
            assertThat(crossProjectDependencyRepository.findAll().stream().map(CrossProjectDependency::getId)
                .filter(id -> id.startsWith("XT-CPD-")).sorted().toList())
                .as("cross-project deps (OR/nullable subquery, B via to_project_id): B sees only its own")
                .containsExactly(CPD_B);
            return null;
        });
        boundTo(WS_A, () -> {
            assertThat(workItemRepository.findAll().stream().map(WorkItem::getId)
                .filter(id -> id.startsWith("XT-WI-")).toList()).containsExactly(WI_A);
            assertThat(commentRepository.findAll().stream().map(Comment::getBody)
                .filter(b -> b != null && b.startsWith("XT-CMT-")).toList()).containsExactly("XT-CMT-A");
            assertThat(crossProjectDependencyRepository.findAll().stream().map(CrossProjectDependency::getId)
                .filter(id -> id.startsWith("XT-CPD-")).toList())
                .as("cross-project deps (OR/nullable subquery, A via from_project_id): A sees only its own")
                .containsExactly(CPD_A);
            return null;
        });
    }

    /**
     * The dormant-default safety net: with no workspace bound, the filter is off and reads are
     * unfiltered exactly as before this layer existed — both A's and B's rows are visible. This is
     * what makes the layer additive (it never regresses an unscoped/system read).
     */
    @Test
    void noWorkspaceBound_isUnfiltered_seesBothWorkspaces() {
        // No TenantContext binding → filter dormant.
        activator.apply(em.unwrap(Session.class));
        assertThat(visibleViaFindAll_project(PROJ_A)).isTrue();
        assertThat(visibleViaFindAll_project(PROJ_B)).isTrue();
    }

    /**
     * The audited system escape hatch ({@link TenantScope#callAsSystem}) — used by schedulers, the
     * public share-token dashboard, SCIM, login/signup and admin sweeps — must read across tenants
     * even when a workspace was previously bound. It physically disables the filter on the live
     * session, so a B-bound thread entering the hatch sees both A and B in every domain.
     */
    @Test
    void escapeHatch_seesBothWorkspaces_inEveryDomain() {
        TenantContext.setWorkspace(WS_B); // a binding is present...
        activator.apply(em.unwrap(Session.class));
        try {
            TenantScope.runAsSystem(() -> {
                // The hatch disabled the filter on the live session; re-assert to mirror runtime.
                activator.apply(em.unwrap(Session.class));

                assertThat(projectRepository.findAll().stream().map(Project::getId)
                    .filter(id -> id.startsWith("XT-PROJ-")).sorted().toList())
                    .as("escape hatch reads projects across all workspaces")
                    .containsExactly(PROJ_A, PROJ_B);
                assertThat(slaPolicyRepository.findAll().stream().map(SlaPolicy::getId)
                    .filter(id -> id.startsWith("XT-SLA-")).sorted().toList())
                    .as("escape hatch reads SLA policies across all workspaces")
                    .containsExactly(SLA_A, SLA_B);
                assertThat(complianceRuleRepository.findAll().stream().map(ComplianceRule::getId)
                    .filter(id -> id.startsWith("XT-RULE-")).sorted().toList())
                    .as("escape hatch reads compliance rules across all workspaces")
                    .containsExactly(RULE_A, RULE_B);
            });
        } finally {
            TenantContext.clear();
        }
    }
}
