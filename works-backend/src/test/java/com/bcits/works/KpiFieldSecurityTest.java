package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Field-level security on the KPI / metrics surface (RB-40 §1, spec 06 §5.5; issue #244). A custom
 * metric definition references fields in two places — its {@code sourceField} and its
 * {@code bqlFormula} — both resolved through the closed {@link BqlFieldRegistry} allow-list under the
 * caller's field-visibility context, exactly as BQL does. A caller below
 * {@link KpiService#SENSITIVE_FIELD_MIN_TIER} (LEAD, tier 3):
 *
 * <ul>
 *   <li>cannot <b>define</b> a metric over a sensitive field (403), and</li>
 *   <li>does not <b>see</b> a sensitive-field-based metric in the definitions list or rolled into a
 *       layer — it is filtered server-side, never just hidden in the UI.</li>
 * </ul>
 *
 * A LEAD+ caller can both define and read it. We use the <b>real</b> {@link BqlCompiler} so the
 * field-security gate is actually exercised end to end (RB-10 §7), not a mock.
 */
@Tag("unit")
class KpiFieldSecurityTest {

    private static final String WS = "ws-1";
    private static final String FOREIGN_WS = "ws-B";
    private static final String LOW = "user-member";   // tier 2 (MEMBER) — below LEAD
    private static final String LEAD = "user-lead";     // tier 3 (LEAD)

    private final WorkItemRepository workItems = mock(WorkItemRepository.class);
    private final ProjectRepository projects = mock(ProjectRepository.class);
    private final TeamRepository teams = mock(TeamRepository.class);
    private final MetricDefinitionRepository definitions = mock(MetricDefinitionRepository.class);
    private final MetricSnapshotRepository snapshots = mock(MetricSnapshotRepository.class);
    private final MetricShareRepository shares = mock(MetricShareRepository.class);
    private final AiControlPlaneService controlPlane = mock(AiControlPlaneService.class);
    private final org.springframework.jdbc.core.JdbcTemplate jdbc =
        mock(org.springframework.jdbc.core.JdbcTemplate.class);
    private final BqlCompiler bqlCompiler = new BqlCompiler();   // real compiler — gate is exercised
    private final RbacService rbac = mock(RbacService.class);

    private final KpiService kpi = new KpiService(workItems, projects, teams, definitions,
        snapshots, shares, controlPlane, jdbc, bqlCompiler, rbac);

    KpiFieldSecurityTest() {
        when(rbac.getUserTier(LOW, WS)).thenReturn(2);    // MEMBER
        when(rbac.getUserTier(LEAD, WS)).thenReturn(3);   // LEAD
        // Cross-tenant: neither caller is a member of the foreign workspace.
        lenient().when(rbac.getUserTier(anyString(), eq(FOREIGN_WS))).thenReturn(0);
    }

    private MetricDefinition sensitiveFormulaDef() {
        MetricDefinition def = new MetricDefinition();
        def.setMetricKey("high_value_open");
        def.setName("High-value open items");
        def.setPrimitive("COUNT");
        def.setScopeLevel("ORG");
        def.setBqlFormula("businessValue > 100");   // businessValue is sensitive (LEAD+)
        return def;
    }

    private MetricDefinition sensitiveSourceFieldDef() {
        MetricDefinition def = new MetricDefinition();
        def.setMetricKey("bv_sum");
        def.setName("Business value sum");
        def.setPrimitive("SUM");
        def.setScopeLevel("ORG");
        def.setSourceField("businessValue");        // sensitive source field
        return def;
    }

    private MetricDefinition nonSensitiveDef() {
        MetricDefinition def = new MetricDefinition();
        def.setMetricKey("open_stories");
        def.setName("Open stories");
        def.setPrimitive("COUNT");
        def.setScopeLevel("ORG");
        def.setBqlFormula("status != Done");
        return def;
    }

    // ── createDefinition: define over a sensitive field ───────────────────────────────

    @Test
    void createDefinition_overSensitiveFormula_isForbiddenForLowTier() {
        assertThatThrownBy(() -> kpi.createDefinition(WS, LOW, sensitiveFormulaDef()))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus().value()).isEqualTo(403));
    }

    @Test
    void createDefinition_overSensitiveSourceField_isForbiddenForLowTier() {
        assertThatThrownBy(() -> kpi.createDefinition(WS, LOW, sensitiveSourceFieldDef()))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus().value()).isEqualTo(403));
    }

    @Test
    void createDefinition_overSensitiveFormula_isAllowedForLead() {
        when(definitions.save(org.mockito.ArgumentMatchers.any(MetricDefinition.class)))
            .thenAnswer(inv -> inv.getArgument(0));

        MetricDefinition saved = kpi.createDefinition(WS, LEAD, sensitiveFormulaDef());

        assertThat(saved.getId()).startsWith("MD-");
        assertThat(saved.getBqlFormula()).isEqualTo("businessValue > 100");
    }

    @Test
    void createDefinition_nonSensitive_isAllowedForLowTier() {
        when(definitions.save(org.mockito.ArgumentMatchers.any(MetricDefinition.class)))
            .thenAnswer(inv -> inv.getArgument(0));

        MetricDefinition saved = kpi.createDefinition(WS, LOW, nonSensitiveDef());

        assertThat(saved.getId()).startsWith("MD-");
    }

    // ── listDefinitions: sensitive-field metrics must not leak to low tier ─────────────

    @Test
    void listDefinitions_hidesSensitiveFieldMetricsFromLowTier() {
        when(definitions.findByWorkspaceIdOrderByNameAsc(WS))
            .thenReturn(List.of(sensitiveFormulaDef(), sensitiveSourceFieldDef(), nonSensitiveDef()));

        List<MetricDefinition> visible = kpi.listDefinitions(WS, LOW);

        assertThat(visible).extracting(MetricDefinition::getMetricKey)
            .containsExactly("open_stories");   // both sensitive ones filtered out
    }

    @Test
    void listDefinitions_showsAllToLead() {
        when(definitions.findByWorkspaceIdOrderByNameAsc(WS))
            .thenReturn(List.of(sensitiveFormulaDef(), sensitiveSourceFieldDef(), nonSensitiveDef()));

        List<MetricDefinition> visible = kpi.listDefinitions(WS, LEAD);

        assertThat(visible).extracting(MetricDefinition::getMetricKey)
            .containsExactlyInAnyOrder("high_value_open", "bv_sum", "open_stories");
    }

    // ── layer rollup: a sensitive custom metric is dropped for low tier ────────────────

    @Test
    void org_dropsSensitiveCustomMetricForLowTier() {
        Project p = new Project();
        p.setId("PROJ-1");
        p.setWorkspaceId(WS);
        p.setName("Portal");
        when(projects.findByWorkspaceId(WS)).thenReturn(List.of(p));
        WorkItem w = new WorkItem();
        w.setId("A-1");
        w.setProjectId("PROJ-1");
        w.setStatus("Done");
        w.setCreatedAt(OffsetDateTime.now().minusDays(1));
        when(workItems.findByProjectId("PROJ-1")).thenReturn(List.of(w));
        when(definitions.findByWorkspaceIdOrderByNameAsc(WS))
            .thenReturn(List.of(sensitiveFormulaDef()));
        // If the sensitive metric were (wrongly) computed, this jdbc stub would feed its value.
        lenient().when(jdbc.queryForObject(anyString(), eq(Long.class), any(Object[].class)))
            .thenReturn(7L);

        KpiService.Layer low = kpi.org(WS, LOW);
        KpiService.Layer lead = kpi.org(WS, LEAD);

        assertThat(low.metrics()).extracting(KpiService.MetricValue::key)
            .doesNotContain("high_value_open");
        assertThat(lead.metrics()).extracting(KpiService.MetricValue::key)
            .contains("high_value_open");
    }

    // ── cross-tenant: a non-member never resolves as sensitive-capable ─────────────────

    @Test
    void listDefinitions_crossTenantCallerSeesNoSensitiveMetrics() {
        // Caller is not a member of FOREIGN_WS (tier 0) — strictly below the sensitive tier, so even
        // though the rows live in FOREIGN_WS, sensitive-field metrics are filtered (defence in depth;
        // the controller's rbac.require already blocks the request before this point).
        when(definitions.findByWorkspaceIdOrderByNameAsc(FOREIGN_WS))
            .thenReturn(List.of(sensitiveFormulaDef(), nonSensitiveDef()));

        List<MetricDefinition> visible = kpi.listDefinitions(FOREIGN_WS, LEAD);

        assertThat(visible).extracting(MetricDefinition::getMetricKey)
            .containsExactly("open_stories");
    }
}
