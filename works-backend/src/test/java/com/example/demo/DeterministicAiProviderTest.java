package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link DeterministicAiProvider} + {@link AiFallbackRegistry} — the always-available
 * AI provider and the fallback contract registry (iteration 10, Cap O/Z; RB-40 §2). Pure; no DB,
 * no model.
 */
@Tag("unit")
class DeterministicAiProviderTest {

    private final DeterministicAiProvider provider =
        new DeterministicAiProvider(new NlToBqlParser(), new Summarizer());
    private final AiFallbackRegistry registry = new AiFallbackRegistry();

    @Test
    void isDeterministic_andReportsDeterministicTier() {
        assertThat(provider.isDeterministic()).isTrue();
        AiProvider.AiResult r = provider.complete(
            new AiProvider.AiTask(AiProvider.Capability.SUMMARIZATION, "Hello world. More text here.", "u1"));
        assertThat(r.modelTier()).isEqualTo("DETERMINISTIC");
        assertThat(r.fallbackUsed()).isTrue();
    }

    @Test
    void nlToBql_confidentForKnownPhrase() {
        AiProvider.AiResult r = provider.complete(
            new AiProvider.AiTask(AiProvider.Capability.NL_TO_BQL, "open bugs assigned to me", "u1"));
        assertThat(r.confident()).isTrue();
        assertThat(r.text()).contains("type = \"Bug\"");
        assertThat(r.tokensIn()).isGreaterThan(0);
    }

    @Test
    void nlToBql_lowConfidenceForGibberish_returnsEmpty() {
        AiProvider.AiResult r = provider.complete(
            new AiProvider.AiTask(AiProvider.Capability.NL_TO_BQL, "xyzzy plugh", "u1"));
        assertThat(r.confident()).isFalse();
        assertThat(r.text()).isEmpty();
    }

    @Test
    void summarization_returnsExtractiveText() {
        AiProvider.AiResult r = provider.complete(
            new AiProvider.AiTask(AiProvider.Capability.SUMMARIZATION,
                "First. The longer detailed middle sentence. Mid. Last one.", "u1"));
        assertThat(r.text()).isNotBlank();
        assertThat(r.tokensOut()).isGreaterThan(0);
    }

    @Test
    void fallbackRegistry_describesEachCapability() {
        assertThat(registry.all()).hasSize(2);
        assertThat(registry.forCapability("nl_to_bql")).isNotNull();
        assertThat(registry.forCapability("SUMMARIZATION")).isNotNull();
        assertThat(registry.forCapability("unknown")).isNull();
        assertThat(registry.mutates("NL_TO_BQL")).isFalse();
        assertThat(registry.asMaps()).allSatisfy(m -> assertThat(m).containsKeys("capability", "label"));
    }
}
