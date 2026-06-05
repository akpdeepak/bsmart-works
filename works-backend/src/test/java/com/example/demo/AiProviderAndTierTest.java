package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** The model tier cost model and the offline default provider. */
@Tag("unit")
class AiProviderAndTierTest {

    @Test
    void modelTier_costScalesWithTokensAndTier() {
        assertThat(AiModelTier.NONE.costCents(10_000)).isZero();
        assertThat(AiModelTier.HAIKU.costCents(0)).isZero();
        // SONNET (24¢/1k) on 5k tokens ≈ 120¢; HAIKU (2¢/1k) on the same ≈ 10¢.
        assertThat(AiModelTier.SONNET.costCents(5_000)).isEqualTo(120);
        assertThat(AiModelTier.HAIKU.costCents(5_000)).isEqualTo(10);
        assertThat(AiModelTier.SONNET.costCents(5_000)).isGreaterThan(AiModelTier.HAIKU.costCents(5_000));
    }

    @Test
    void deterministicProvider_echoesDraftAndEstimatesTokens() {
        DeterministicAiProvider p = new DeterministicAiProvider();
        assertThat(p.name()).isEqualTo("deterministic-offline");
        var result = p.complete(new AiProvider.AiRequest(
            AiCapabilities.GENERATION, AiModelTier.SONNET, "a prompt", "the computed draft", Map.of()));
        assertThat(result.text()).isEqualTo("the computed draft");
        assertThat(result.tokensIn()).isPositive();
        assertThat(result.tokensOut()).isPositive();
        assertThat(result.tier()).isEqualTo(AiModelTier.SONNET);
    }

    @Test
    void estimateTokens_handlesNullAndEmpty() {
        assertThat(DeterministicAiProvider.estimateTokens(null)).isZero();
        assertThat(DeterministicAiProvider.estimateTokens("")).isZero();
        assertThat(DeterministicAiProvider.estimateTokens("abcd")).isEqualTo(1);
    }
}
