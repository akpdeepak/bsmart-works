package com.bcits.works.reporting;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.BqlCompiler;
import com.bcits.works.shared.BqlContext;
import com.bcits.works.shared.BqlException;
import com.bcits.works.shared.RbacGate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Characterization coverage for the pivot engine: the RBAC gate in the service layer (RB-10 §2),
 * spec/measure validation and its error envelope, allow-list + field-security resolution
 * (RB-40 §1), the workspace-scoped SQL it emits, the cell budget, percent-of-total post-processing,
 * and per-entry error isolation in {@code batch}. The JDBC chain is mocked at the {@link DataSource}
 * level because the service builds its own {@code JdbcTemplate}.
 */
@Tag("unit")
class PivotServiceTest {

    private final DataSource dataSource = mock(DataSource.class);
    private final BqlCompiler compiler = mock(BqlCompiler.class);
    private final RbacGate rbac = mock(RbacGate.class);

    private final PivotService service = new PivotService(dataSource, compiler, rbac);

    private final Connection connection = mock(Connection.class);
    private final PreparedStatement statement = mock(PreparedStatement.class);

    @BeforeEach
    void stubJdbcChain() throws Exception {
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.prepareStatement(anyString())).thenReturn(statement);
    }

    /** Stub the executed query to return the given rows (all sharing the given column labels). */
    private void queryReturns(List<String> columns, List<List<Object>> rows) throws Exception {
        ResultSet rs = mock(ResultSet.class);
        ResultSetMetaData md = mock(ResultSetMetaData.class);
        when(statement.executeQuery()).thenReturn(rs);
        when(rs.getMetaData()).thenReturn(md);
        when(md.getColumnCount()).thenReturn(columns.size());
        for (int c = 0; c < columns.size(); c++) {
            when(md.getColumnLabel(c + 1)).thenReturn(columns.get(c));
        }
        AtomicInteger cursor = new AtomicInteger(-1);
        when(rs.next()).thenAnswer(inv -> cursor.incrementAndGet() < rows.size());
        when(rs.getObject(any(Integer.class)))
            .thenAnswer(inv -> rows.get(cursor.get()).get(inv.<Integer>getArgument(0) - 1));
    }

    private static PivotSpec spec(List<PivotSpec.Measure> measures, List<String> dims) {
        return new PivotSpec(null, measures, dims, null);
    }

    private static PivotSpec.Measure count() {
        return new PivotSpec.Measure("*", PivotSpec.Agg.COUNT);
    }

    // ── RBAC in the service layer ───────────────────────────────────────────────

    @Test
    void resolve_requiresViewItemsBeforeTouchingTheDatabase() {
        doThrow(ApiException.forbidden("no")).when(rbac).require("intruder", "WS-1", "view_items");

        assertThatThrownBy(() -> service.resolve("WS-1", "intruder", spec(List.of(count()), List.of())))
            .isInstanceOf(ApiException.class);
        verifyNoInteractions(dataSource);
    }

    @Test
    void batch_requiresViewItemsOnceForTheWholeGrid() {
        doThrow(ApiException.forbidden("no")).when(rbac).require("intruder", "WS-1", "view_items");

        assertThatThrownBy(() -> service.batch("WS-1", "intruder", Map.of()))
            .isInstanceOf(ApiException.class);
        verifyNoInteractions(dataSource);
    }

    // ── Spec validation ─────────────────────────────────────────────────────────

    @Test
    void resolve_rejectsAMissingSpecOrMissingMeasures() {
        assertThatThrownBy(() -> service.resolve("WS-1", "u1", null))
            .isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.getCode()).isEqualTo("INVALID_PIVOT"));
        assertThatThrownBy(() -> service.resolve("WS-1", "u1", spec(List.of(), List.of())))
            .isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.getCode()).isEqualTo("INVALID_PIVOT"));
    }

    @Test
    void resolve_enforcesTheMeasureAndDimensionCaps() {
        List<PivotSpec.Measure> eleven = java.util.Collections.nCopies(11, count());
        assertThatThrownBy(() -> service.resolve("WS-1", "u1", spec(eleven, List.of())))
            .isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.getCode()).isEqualTo("TOO_MANY_MEASURES"));

        List<String> five = List.of("status", "type", "priority", "assignee", "project");
        assertThatThrownBy(() -> service.resolve("WS-1", "u1", spec(List.of(count()), five)))
            .isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.getCode()).isEqualTo("TOO_MANY_DIMENSIONS"));
    }

    @Test
    void resolve_rejectsABlankDimensionAlias() {
        assertThatThrownBy(() -> service.resolve("WS-1", "u1", spec(List.of(count()), List.of(" "))))
            .isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.getCode()).isEqualTo("INVALID_DIMENSION"));
    }

    @Test
    void resolve_rejectsAnUnknownDimensionAtCompileTime() {
        assertThatThrownBy(() -> service.resolve("WS-1", "u1",
            spec(List.of(count()), List.of("password"))))
            .isInstanceOf(BqlException.class)
            .hasMessageContaining("Unknown field");
        verifyNoInteractions(dataSource);
    }

    @Test
    void resolve_fieldSecurityGateBlocksSensitiveFieldsForLowTierCallers() {
        when(rbac.getUserTier("u1", "WS-1")).thenReturn(1); // below the LEAD+ tier

        assertThatThrownBy(() -> service.resolve("WS-1", "u1",
            spec(List.of(count()), List.of("businessValue"))))
            .isInstanceOf(BqlException.class)
            .hasMessageContaining("not permitted");
        verifyNoInteractions(dataSource);
    }

    // ── Measure validation ──────────────────────────────────────────────────────

    @Test
    void resolve_rejectsAMeasureWithoutAnAggregation() {
        assertThatThrownBy(() -> service.resolve("WS-1", "u1",
            spec(List.of(new PivotSpec.Measure("status", null)), List.of())))
            .isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.getCode()).isEqualTo("INVALID_MEASURE"));
    }

    @Test
    void resolve_onlyCountLikeAggregationsMayAggregateStar() {
        assertThatThrownBy(() -> service.resolve("WS-1", "u1",
            spec(List.of(new PivotSpec.Measure("*", PivotSpec.Agg.SUM)), List.of())))
            .isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.getCode()).isEqualTo("INVALID_MEASURE"));
    }

    @Test
    void resolve_unknownSourceKindIsRejected() {
        WidgetSource source = new WidgetSource("csv-upload", null, null, null, null, null, null);
        assertThatThrownBy(() -> service.resolve("WS-1", "u1",
            new PivotSpec(source, List.of(count()), List.of(), null)))
            .isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.getCode()).isEqualTo("INVALID_SOURCE"));
    }

    // ── Execution: workspace scope, grouping, result shape ──────────────────────

    @Test
    void resolve_groupedCountEmitsAWorkspaceScopedGroupByAndNormalizesTheResult() throws Exception {
        queryReturns(List.of("status", "count_all"),
            List.of(List.of("Open", 7L), List.of("Done", 3L)));

        PivotService.PivotResult out = service.resolve("WS-1", "u1",
            spec(List.of(count()), List.of("status")));

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(connection).prepareStatement(sql.capture());
        assertThat(sql.getValue())
            .contains("FROM work_items")
            .contains("project_id IN (SELECT id FROM projects WHERE workspace_id = ?)")
            .contains("GROUP BY 1")
            .contains("ORDER BY count_all DESC NULLS LAST")
            .contains("LIMIT 1000");
        verify(statement).setString(1, "WS-1"); // the workspace bind is the first parameter
        assertThat(out.dimensions()).containsExactly("status");
        assertThat(out.measures()).containsExactly("count_all");
        assertThat(out.rows()).hasSize(2);
        assertThat(out.rows().get(0)).containsEntry("status", "Open").containsEntry("count_all", 7L);
    }

    @Test
    void resolve_sumMeasureResolvesThroughTheAllowListColumn() throws Exception {
        queryReturns(List.of("sum_storyPoints"), List.of(List.of(42L)));

        PivotService.PivotResult out = service.resolve("WS-1", "u1",
            spec(List.of(new PivotSpec.Measure("storyPoints", PivotSpec.Agg.SUM)), List.of()));

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(connection).prepareStatement(sql.capture());
        assertThat(sql.getValue()).contains("SUM(story_points) AS sum_storyPoints");
        assertThat(sql.getValue()).doesNotContain("GROUP BY"); // no dimensions → plain aggregate
        assertThat(out.measures()).containsExactly("sum_storyPoints");
        assertThat(out.rows()).hasSize(1);
    }

    @Test
    void resolve_bqlSourceAndExtraFiltersCompileToParameterizedPredicates() throws Exception {
        when(compiler.compileFor(eq("status = 'Open'"), any(BqlContext.class)))
            .thenReturn(new BqlCompiler.Compiled("status = ?", List.of("Open")));
        when(compiler.compileFor(eq("priority = 'HIGH'"), any(BqlContext.class)))
            .thenReturn(new BqlCompiler.Compiled("priority = ?", List.of("HIGH")));
        queryReturns(List.of("count_all"), List.of(List.of(1L)));
        WidgetSource source = new WidgetSource("bql", null, "status = 'Open'", null, null, null, null);

        service.resolve("WS-1", "u1",
            new PivotSpec(source, List.of(count()), List.of(), "priority = 'HIGH'"));

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(connection).prepareStatement(sql.capture());
        assertThat(sql.getValue()).contains("AND (status = ?)").contains("AND (priority = ?)");
        verify(statement).setString(1, "WS-1");
        verify(statement).setString(2, "Open");
        verify(statement).setString(3, "HIGH");
    }

    @Test
    void resolve_percentOfTotalConvertsGroupCountsIntoShares() throws Exception {
        queryReturns(List.of("status", "percent_of_total_all"),
            List.of(List.of("Open", 30L), List.of("Done", 10L)));

        PivotService.PivotResult out = service.resolve("WS-1", "u1",
            spec(List.of(new PivotSpec.Measure(null, PivotSpec.Agg.PERCENT_OF_TOTAL)),
                List.of("status")));

        assertThat(out.rows().get(0)).containsEntry("percent_of_total_all", 75.0);
        assertThat(out.rows().get(1)).containsEntry("percent_of_total_all", 25.0);
    }

    @Test
    void resolve_cellBudgetRejectsAnOversizedPivot() throws Exception {
        List<List<Object>> tooMany = new java.util.ArrayList<>();
        for (int n = 0; n < 2501; n++) {
            tooMany.add(List.of("bucket-" + n, 1L));
        }
        queryReturns(List.of("status", "count_all"), tooMany);

        assertThatThrownBy(() -> service.resolve("WS-1", "u1",
            spec(List.of(count()), List.of("status"))))
            .isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.getCode()).isEqualTo("PIVOT_TOO_LARGE"));
    }

    // ── resolveForWorkspace: the public-embed path ──────────────────────────────

    @Test
    void resolveForWorkspace_skipsRbacButKeepsSensitiveFieldsHidden() throws Exception {
        queryReturns(List.of("count_all"), List.of(List.of(5L)));

        PivotService.PivotResult out = service.resolveForWorkspace("WS-1",
            spec(List.of(count()), List.of()));

        assertThat(out.rows()).hasSize(1);
        verifyNoInteractions(rbac); // the share token is the authorization on this path

        assertThatThrownBy(() -> service.resolveForWorkspace("WS-1",
            spec(List.of(count()), List.of("businessValue"))))
            .isInstanceOf(BqlException.class); // public viewer never sees leadership fields
    }

    // ── batch ───────────────────────────────────────────────────────────────────

    @Test
    void batch_nullSpecsResolveToAnEmptyResult() {
        assertThat(service.batch("WS-1", "u1", null)).isEmpty();
    }

    @Test
    void batch_rejectsAGridOverTheCap() {
        Map<String, PivotSpec> thirteen = new LinkedHashMap<>();
        for (int n = 0; n < 13; n++) {
            thirteen.put("p" + n, spec(List.of(count()), List.of()));
        }
        assertThatThrownBy(() -> service.batch("WS-1", "u1", thirteen))
            .isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.getCode()).isEqualTo("BATCH_TOO_LARGE"));
    }

    @Test
    void batch_isolatesAFailingEntryWithoutAbortingTheRest() throws Exception {
        queryReturns(List.of("count_all"), List.of(List.of(5L)));
        Map<String, PivotSpec> specs = new LinkedHashMap<>();
        specs.put("bad", spec(List.of(), List.of()));   // no measures → per-entry error
        specs.put("good", spec(List.of(count()), List.of()));

        List<PivotService.PivotBatchResult> out = service.batch("WS-1", "u1", specs);

        assertThat(out).hasSize(2);
        assertThat(out.get(0).id()).isEqualTo("bad");
        assertThat(out.get(0).data()).isNull();
        assertThat(out.get(0).error()).contains("at least one measure");
        assertThat(out.get(1).id()).isEqualTo("good");
        assertThat(out.get(1).error()).isNull();
        assertThat(out.get(1).data().rows()).hasSize(1);
    }
}
