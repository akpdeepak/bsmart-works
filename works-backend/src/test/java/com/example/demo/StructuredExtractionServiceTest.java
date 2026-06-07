package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Structured data extraction (iteration-20 Cap I). The pure regex helpers are tested in isolation
 * (RB-10 §7); the {@code extract} path is tested with a mocked {@link AiControlPlaneService} returning a
 * fallback outcome, proving the deterministic field map is returned verbatim when AI is off (RB-40 §2).
 */
@Tag("unit")
class StructuredExtractionServiceTest {

    // ── pure helpers ───────────────────────────────────────────────────────────────

    @Test
    void extractFields_pullsEmailsDatesIdsAndKeyValues() {
        String text = "Owner: Deepak Pandey\n"
            + "Contact: deepak@bcits.in and akp@bcits.in\n"
            + "Due: 2026-06-07\n"
            + "Tracking WRK-123 and INC-42\n"
            + "Severity: High";
        Map<String, Object> fields = StructuredExtractionService.extractFields(text);

        assertThat((List<String>) fields.get("emails")).containsExactly("deepak@bcits.in", "akp@bcits.in");
        assertThat((List<String>) fields.get("dates")).containsExactly("2026-06-07");
        assertThat((List<String>) fields.get("ids")).contains("WRK-123", "INC-42");
        @SuppressWarnings("unchecked")
        Map<String, String> kv = (Map<String, String>) fields.get("keyValues");
        assertThat(kv).containsEntry("Owner", "Deepak Pandey").containsEntry("Severity", "High");
    }

    @Test
    void extractFields_deduplicatesRepeatedValues() {
        Map<String, Object> fields = StructuredExtractionService.extractFields(
            "a@b.com a@b.com 2026-01-01 2026-01-01");
        assertThat((List<String>) fields.get("emails")).containsExactly("a@b.com");
        assertThat((List<String>) fields.get("dates")).containsExactly("2026-01-01");
    }

    @Test
    void extractFields_emptyTextYieldsEmptyMap() {
        assertThat(StructuredExtractionService.extractFields("")).isEmpty();
        assertThat(StructuredExtractionService.extractFields(null)).isEmpty();
        assertThat(StructuredExtractionService.extractFields("just some prose with no fields")).isEmpty();
    }

    @Test
    void keyValues_firstOccurrenceWinsAndTimesAreSkipped() {
        Map<String, String> kv = StructuredExtractionService.keyValues(
            "Status: Open\nStatus: Closed\n12:30");
        assertThat(kv).containsEntry("Status", "Open");
        assertThat(kv).hasSize(1); // bare "12:30" is not a key:value pair
    }

    // ── control-plane routing ────────────────────────────────────────────────────────

    @Test
    void extract_returnsDeterministicFieldsOnFallback() {
        AiControlPlaneService cp = mock(AiControlPlaneService.class);
        when(cp.invoke(any(AiControlPlaneService.AiCall.class)))
            .thenReturn(AiControlPlaneService.AiOutcome.fallback("DISABLED_WORKSPACE"));
        StructuredExtractionService service = new StructuredExtractionService(cp);

        StructuredExtractionService.ExtractionResult result =
            service.extract("ws-1", "user-1", "Email: dev@bcits.in\nDue: 2026-06-07", true);

        assertThat(result.fallback()).isTrue();
        assertThat(result.usedAi()).isFalse();
        assertThat(result.policyState()).isEqualTo("DISABLED_WORKSPACE");
        assertThat((List<String>) result.fields().get("emails")).containsExactly("dev@bcits.in");
        assertThat((List<String>) result.fields().get("dates")).containsExactly("2026-06-07");
    }

    @Test
    void extract_usesCapabilityIdAndCarriesAiVerdict() {
        AiControlPlaneService cp = mock(AiControlPlaneService.class);
        when(cp.invoke(any(AiControlPlaneService.AiCall.class)))
            .thenReturn(new AiControlPlaneService.AiOutcome(true, false, "narrative",
                AiModelTier.HAIKU, "ENABLED", 1, false));
        StructuredExtractionService service = new StructuredExtractionService(cp);

        StructuredExtractionService.ExtractionResult result =
            service.extract("ws-1", "user-1", "Owner: Dev", true);

        assertThat(result.usedAi()).isTrue();
        assertThat(result.fallback()).isFalse();
        assertThat(result.tier()).isEqualTo("HAIKU");
        // The deterministic field map is always present, AI on or off.
        assertThat(result.fields()).containsKey("keyValues");
        assertThat(StructuredExtractionService.CAPABILITY).isEqualTo("structured_extraction");
    }
}
