package com.bcits.works;

import com.bcits.works.shared.ApiException;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Cap J · dashboard summary + anomaly explanation (RB-40 §2). Verifies the deterministic digest
 * (the mandatory fallback, a pure function) and that the service enforces {@code view_items} before
 * any AI budget is touched, then routes the narrative through the one control plane (RB-10 §2).
 */
@Tag("unit")
class DashboardSummaryServiceTest {

    private static final String WS = "ws-1";
    private static final String ME = "user-me";

    private final AiControlPlaneService controlPlane = mock(AiControlPlaneService.class);
    private final RbacService rbac = mock(RbacService.class);
    private final DashboardSummaryService service = new DashboardSummaryService(controlPlane, rbac);

    private static DashboardSummaryService.Point p(String label, double value) {
        return new DashboardSummaryService.Point(label, value);
    }

    // ── deterministic digest (pure fallback) ────────────────────────────────────

    @Test
    void digest_reportsTotalAndLargestBucket() {
        String text = DashboardSummaryService.renderDigest("By status",
            List.of(p("Open", 6), p("In Progress", 2), p("Done", 2)));
        assertThat(text).contains("By status");
        assertThat(text).contains("3 categories totalling 10");
        assertThat(text).contains("Largest is \"Open\" at 6 (60% of total)");
    }

    @Test
    void digest_flagsStatisticalOutlier() {
        // One bucket far above the rest → beyond mean + 2·stddev.
        String text = DashboardSummaryService.renderDigest("Items by priority",
            List.of(p("Low", 1), p("Medium", 1), p("High", 1), p("Critical", 30)));
        assertThat(text).contains("Notable outliers");
        assertThat(text).contains("\"Critical\"");
        assertThat(text).contains("above");
    }

    @Test
    void digest_reportsNoOutliersForFlatSeries() {
        String text = DashboardSummaryService.renderDigest("Even",
            List.of(p("A", 5), p("B", 5), p("C", 5)));
        assertThat(text).contains("No statistical outliers detected.");
    }

    @Test
    void digest_handlesEmptySeries() {
        assertThat(DashboardSummaryService.renderDigest("Empty", List.of()))
            .isEqualTo("No data to summarise for Empty.");
        assertThat(DashboardSummaryService.renderDigest(null, null))
            .contains("No data to summarise for this view.");
    }

    @Test
    void toSeries_skipsMalformedRows() {
        List<DashboardSummaryService.Point> series = DashboardSummaryService.toSeries(List.of(
            java.util.Map.of("label", "Open", "value", 4),
            java.util.Map.of("label", "NoValue"),               // missing value → skipped
            java.util.Map.of("value", 3)                        // missing label → skipped
        ));
        assertThat(series).hasSize(1);
        assertThat(series.get(0).label()).isEqualTo("Open");
        assertThat(series.get(0).value()).isEqualTo(4.0);
    }

    // ── RBAC + control-plane routing ─────────────────────────────────────────────

    @Test
    void summarize_requiresViewItemsBeforeTouchingAi() {
        doThrow(ApiException.forbidden("no access"))
            .when(rbac).require(ME, WS, "view_items");

        assertThatThrownBy(() -> service.summarize(WS, ME, "By status", List.of(p("Open", 1)), true))
            .isInstanceOf(ApiException.class);

        verify(rbac).require(ME, WS, "view_items");
        verify(controlPlane, never()).invoke(any());   // never reaches the AI budget
    }

    @Test
    void summarize_routesThroughControlPlaneAndFallsBackDeterministically() {
        when(controlPlane.invoke(any())).thenReturn(
            AiControlPlaneService.AiOutcome.fallback("DISABLED_WORKSPACE"));

        DashboardSummaryService.Summary s = service.summarize(WS, ME, "By status",
            List.of(p("Open", 6), p("Done", 2)), true);

        verify(rbac).require(ME, WS, "view_items");
        verify(controlPlane).invoke(any());
        assertThat(s.fallback()).isTrue();
        assertThat(s.usedAi()).isFalse();
        assertThat(s.policyState()).isEqualTo("DISABLED_WORKSPACE");
        assertThat(s.text()).contains("Largest is \"Open\"");
    }

    @Test
    void summarize_usesCapabilityDefaultTierAndAiTextWhenEnabled() {
        when(controlPlane.invoke(any())).thenReturn(
            new AiControlPlaneService.AiOutcome(true, false, "Open work dominates the board.",
                AiModelTier.HAIKU, "ENABLED", 1, false));

        DashboardSummaryService.Summary s = service.summarize(WS, ME, "By status",
            List.of(p("Open", 6), p("Done", 2)), true);

        assertThat(s.usedAi()).isTrue();
        assertThat(s.fallback()).isFalse();
        assertThat(s.text()).isEqualTo("Open work dominates the board.");
        assertThat(s.tier()).isEqualTo("HAIKU");
    }

    @Test
    void capability_isRegisteredAsHaikuWithFallback() {
        assertThat(AiCapabilities.isKnown(AiCapabilities.DASHBOARD_SUMMARY)).isTrue();
        assertThat(AiCapabilities.defaultTier(AiCapabilities.DASHBOARD_SUMMARY)).isEqualTo(AiModelTier.HAIKU);
        AiCapabilities.Descriptor d = AiCapabilities.all().stream()
            .filter(x -> x.id().equals(AiCapabilities.DASHBOARD_SUMMARY)).findFirst().orElseThrow();
        assertThat(d.fallback()).isNotBlank();
    }
}
