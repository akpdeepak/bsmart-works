package com.bcits.works.shared;

import com.bcits.works.projects.api.Project;
import com.bcits.works.projects.api.ProjectRepository;



import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
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

import static org.assertj.core.api.Assertions.assertThat;

/**
 * End-to-end proof that the central Hibernate {@code workspaceFilter} (RB-40 Â§1) narrows a default
 * JPA read to the bound workspace, and that the system/unfiltered escape hatch bypasses it â€” against
 * real Postgres (Testcontainers, RB-10 Â§7). This is the "scoping applied centrally, not re-typed per
 * query" guarantee: {@link ProjectRepository#findAll()} carries <b>no</b> explicit workspace
 * predicate, yet returns only the bound workspace's rows once the filter is active.
 *
 * <p>The activator enables the filter on the same Hibernate session the repository uses; here we
 * drive it through {@link WorkspaceFilterActivator#apply} on the injected {@link EntityManager}'s
 * session, exactly as {@code CurrentWorkspace.bind} does at runtime.
 */
@Tag("integration")
@Testcontainers
@SpringBootTest
@Transactional
class WorkspaceFilterScopeIT {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    ProjectRepository projectRepository;

    @Autowired
    WorkspaceFilterActivator activator;

    @PersistenceContext
    EntityManager em;

    private static final String WS_A   = "TFILTER-WS-A";
    private static final String WS_B   = "TFILTER-WS-B";
    private static final String PROJ_A = "TFILTER-PROJ-A";
    private static final String PROJ_B = "TFILTER-PROJ-B";

    @BeforeEach
    void seed() {
        OffsetDateTime now = OffsetDateTime.now();
        jdbc.update("DELETE FROM projects WHERE id IN (?, ?)", PROJ_A, PROJ_B);
        jdbc.update("DELETE FROM workspaces WHERE id IN (?, ?)", WS_A, WS_B);

        jdbc.update("INSERT INTO workspaces(id, name, slug, created_at, updated_at) VALUES (?,?,?,?,?)",
            WS_A, "TFilter WS A", "tfilter-ws-a", now, now);
        jdbc.update("INSERT INTO workspaces(id, name, slug, created_at, updated_at) VALUES (?,?,?,?,?)",
            WS_B, "TFilter WS B", "tfilter-ws-b", now, now);
        jdbc.update("INSERT INTO projects(id, workspace_id, name, key_prefix, slug, created_at) VALUES (?,?,?,?,?,?)",
            PROJ_A, WS_A, "TFilter Project A", "TFA", "tfilter-proj-a", now);
        jdbc.update("INSERT INTO projects(id, workspace_id, name, key_prefix, slug, created_at) VALUES (?,?,?,?,?,?)",
            PROJ_B, WS_B, "TFilter Project B", "TFB", "tfilter-proj-b", now);
        // Make sure the JPA session sees committed rows, not stale first-level cache.
        em.clear();
    }

    @AfterEach
    void cleanup() {
        TenantContext.clear();
    }

    private List<String> idsOf(List<Project> projects) {
        return projects.stream().map(Project::getId).filter(id -> id.startsWith("TFILTER-")).sorted().toList();
    }

    @Test
    void boundToWorkspaceA_findAll_returnsOnlyWorkspaceAproject() {
        TenantContext.setWorkspace(WS_A);
        activator.apply(em.unwrap(org.hibernate.Session.class));

        List<String> ids = idsOf(projectRepository.findAll());

        assertThat(ids)
            .as("findAll() carries no workspace predicate, yet the central filter confines it to WS A")
            .containsExactly(PROJ_A);
    }

    @Test
    void boundToWorkspaceB_findAll_returnsOnlyWorkspaceBproject() {
        TenantContext.setWorkspace(WS_B);
        activator.apply(em.unwrap(org.hibernate.Session.class));

        assertThat(idsOf(projectRepository.findAll())).containsExactly(PROJ_B);
    }

    @Test
    void systemEscapeHatch_findAll_seesBothWorkspaces() {
        TenantContext.setWorkspace(WS_A); // even with a binding present...
        TenantScope.runAsSystem(() -> {
            activator.apply(em.unwrap(org.hibernate.Session.class));
            assertThat(idsOf(projectRepository.findAll()))
                .as("the system hatch bypasses the filter for legitimate cross-workspace work")
                .containsExactly(PROJ_A, PROJ_B);
        });
    }

    @Test
    void noWorkspaceBound_findAll_isUnfiltered_dormantDefault() {
        // No workspace set on the thread â†’ filter dormant â†’ behaviour identical to before this layer.
        activator.apply(em.unwrap(org.hibernate.Session.class));
        assertThat(idsOf(projectRepository.findAll())).containsExactly(PROJ_A, PROJ_B);
    }
}
