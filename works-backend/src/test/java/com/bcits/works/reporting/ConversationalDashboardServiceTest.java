package com.bcits.works.reporting;

import com.bcits.works.ai.api.AiModelTier;
import com.bcits.works.ai.api.AiControlPlaneService;
import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.EventService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Behaviour of conversational dashboards (Cap O, iteration 20): the deterministic NL → widget-spec
 * parser, and that {@code compile} attaches an AI caption only when AI actually ran. Pure unit tests
 * (RB-10 §7).
 */
@Tag("unit")
class ConversationalDashboardServiceTest {

    private final ConversationalDashboardRepository repo = mock(ConversationalDashboardRepository.class);
    private final AiControlPlaneService controlPlane = mock(AiControlPlaneService.class);
    private final EventService events = mock(EventService.class);

    private final ConversationalDashboardService service =
        new ConversationalDashboardService(repo, controlPlane, events);

    @Test
    @SuppressWarnings("unchecked")
    void parse_extractsMetricGroupingTimeframeAndComposites() {
        Map<String, Object> spec = ConversationalDashboardService.parse(
            "Show velocity per team, last 6 sprints, with predictability composite");
        assertThat(spec.get("metric")).isEqualTo("velocity");
        assertThat(spec.get("groupBy")).isEqualTo("team");
        Map<String, Object> tf = (Map<String, Object>) spec.get("timeframe");
        assertThat(tf.get("amount")).isEqualTo(6);
        assertThat(tf.get("unit")).isEqualTo("sprint");
        assertThat((java.util.List<String>) spec.get("composites")).contains("predictability");
        assertThat(spec.get("chart")).isEqualTo("bar");
    }

    @Test
    void parse_defaultsAreSaneForAVagueAsk() {
        Map<String, Object> spec = ConversationalDashboardService.parse("show me throughput");
        assertThat(spec.get("metric")).isEqualTo("throughput");
        assertThat(spec.get("groupBy")).isEqualTo("none");
        assertThat(spec.get("chart")).isEqualTo("line"); // ungrouped → line
    }

    @Test
    void compile_attachesAiCaptionOnlyWhenAiRan() {
        // AI ran → caption attached.
        when(controlPlane.invoke(any())).thenReturn(new AiControlPlaneService.AiOutcome(
            true, false, "A clean view of velocity.", AiModelTier.SONNET, "ENABLED", 3, false));
        var compiled = service.compile("WS-001", "USR-001", "velocity per team last 6 sprints", true);
        assertThat(compiled.usedAi()).isTrue();
        assertThat(compiled.spec().get("caption")).isEqualTo("A clean view of velocity.");
    }

    @Test
    void compile_noCaptionOnFallback() {
        when(controlPlane.invoke(any()))
            .thenReturn(AiControlPlaneService.AiOutcome.fallback("BUDGET_EXCEEDED"));
        var compiled = service.compile("WS-001", "USR-001", "velocity per team", true);
        assertThat(compiled.fallback()).isTrue();
        assertThat(compiled.spec()).doesNotContainKey("caption");
        assertThat(compiled.spec().get("metric")).isEqualTo("velocity"); // structure still valid
    }

    @Test
    void compile_rejectsBlankPrompt() {
        assertThatThrownBy(() -> service.compile("WS-001", "USR-001", " ", true))
            .isInstanceOf(ApiException.class);
    }
}
