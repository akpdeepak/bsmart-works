package com.bcits.works;

import com.bcits.works.shared.ApiException;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unauthorized / cross-tenant access tests for the pivot endpoints on {@link WidgetDataController}
 * (RB-05 Stage 3, RB-40 §1). A non-member is denied before any pivot is resolved; the chart-type
 * registry is pure metadata and needs no workspace. RBAC lives in {@link PivotService} — the
 * controller stays thin (RB-10 §2).
 */
@Tag("unit")
class PivotControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";

    private final WidgetDataService widget = mock(WidgetDataService.class);
    private final PivotService pivot = mock(PivotService.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final WidgetDataController controller =
        new WidgetDataController(widget, pivot, authenticatedUser);

    PivotControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
    }

    @Test
    void pivot_deniedForNonMember() {
        doThrow(ApiException.forbidden("denied"))
            .when(pivot).resolve(eq(FOREIGN_WS), eq(CALLER), any());
        PivotSpec spec = new PivotSpec(null,
            List.of(new PivotSpec.Measure("*", PivotSpec.Agg.COUNT)), List.of("status"), null);
        assertThatThrownBy(() -> controller.pivot(FOREIGN_WS, spec))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void pivotBatch_deniedForNonMember() {
        doThrow(ApiException.forbidden("denied"))
            .when(pivot).batch(eq(FOREIGN_WS), eq(CALLER), any());
        assertThatThrownBy(() -> controller.pivotBatch(FOREIGN_WS, Map.of()))
            .isInstanceOf(ApiException.class);
    }

    @Test
    void chartTypes_needNoWorkspace_andDescribeShapes() {
        List<Map<String, Object>> types = controller.chartTypes();
        assertThat(types).isNotEmpty();
        // The full required set is present.
        List<Object> ids = types.stream().map(t -> t.get("id")).toList();
        assertThat(ids).contains("scorecard", "gauge", "pie", "donut", "bar", "column", "line",
            "area", "stacked_bar", "grouped_bar", "heatmap", "matrix", "scatter", "bubble",
            "treemap", "funnel", "combo", "sparkline", "pivot_table");
        // Each entry carries its shape bounds.
        Map<String, Object> scorecard = types.stream()
            .filter(t -> "scorecard".equals(t.get("id"))).findFirst().orElseThrow();
        assertThat(scorecard).containsEntry("minDimensions", 0).containsEntry("maxDimensions", 0)
            .containsEntry("minMeasures", 1).containsEntry("maxMeasures", 1);
        // pivot_table accepts any number of dimensions (unbounded → null max).
        Map<String, Object> pivotTable = types.stream()
            .filter(t -> "pivot_table".equals(t.get("id"))).findFirst().orElseThrow();
        assertThat(pivotTable.get("maxDimensions")).isNull();
        // Reading the registry never touches RBAC.
        verify(pivot, never()).resolve(anyString(), anyString(), any());
    }
}
