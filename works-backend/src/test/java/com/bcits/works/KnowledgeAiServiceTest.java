package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the Know Studio AI compose transforms (the deterministic fallback that always runs,
 * RB-40 §2) and the control-plane integration. Pure transforms need no Spring context or database
 * (RB-10 §7); the compose() integration uses a mocked control plane.
 */
@Tag("unit")
class KnowledgeAiServiceTest {

    @Test
    void normalizeMode_acceptsKnownModes_defaultsToImprove() {
        assertThat(KnowledgeAiService.normalizeMode("SUMMARIZE")).isEqualTo("summarize");
        assertThat(KnowledgeAiService.normalizeMode("expand")).isEqualTo("expand");
        assertThat(KnowledgeAiService.normalizeMode("nonsense")).isEqualTo("improve");
        assertThat(KnowledgeAiService.normalizeMode(null)).isEqualTo("improve");
    }

    @Test
    void sentences_splitsOnTerminators() {
        List<String> s = KnowledgeAiService.sentences("First one. Second two! Third three?");
        assertThat(s).containsExactly("First one.", "Second two!", "Third three?");
        assertThat(KnowledgeAiService.sentences("")).isEmpty();
        assertThat(KnowledgeAiService.sentences(null)).isEmpty();
    }

    @Test
    void summarize_takesLeadSentencePlusBullets() {
        String out = KnowledgeAiService.summarize("Deploys run from main. CI must be green. Squash merge only. Extra line here.");
        assertThat(out).startsWith("Deploys run from main.");
        assertThat(out).contains("\n- CI must be green.");
        assertThat(out.split("\n- ")).hasSizeLessThanOrEqualTo(3); // lead + at most 2 bullets
    }

    @Test
    void summarize_emptyText_isFriendly() {
        assertThat(KnowledgeAiService.summarize("   ")).isEqualTo("Nothing to summarize yet.");
    }

    @Test
    void improve_cleansWhitespaceCapitalizesAndPunctuates() {
        assertThat(KnowledgeAiService.improve("  the   quick brown fox ")).isEqualTo("The quick brown fox.");
        assertThat(KnowledgeAiService.improve("Already done!")).isEqualTo("Already done!");
        assertThat(KnowledgeAiService.improve("")).isEmpty();
    }

    @Test
    void shorten_keepsOnlyLeadSentence() {
        assertThat(KnowledgeAiService.shorten("one thing here. two thing there.")).isEqualTo("One thing here.");
    }

    @Test
    void expand_buildsOnExistingTextWithATopic() {
        String out = KnowledgeAiService.expand("Cache the response.", "response caching strategy");
        assertThat(out).startsWith("Cache the response.");
        assertThat(out).contains("In more detail:");
        assertThat(out).contains("response caching strategy");
    }

    @Test
    void write_scaffoldsFromInstruction() {
        assertThat(KnowledgeAiService.write("explain the deploy process")).startsWith("Explain the deploy process.");
        assertThat(KnowledgeAiService.write("")).isNotBlank();
    }

    @Test
    void compose_returnsDeterministicDraftOnFallback() {
        AiControlPlaneService controlPlane = mock(AiControlPlaneService.class);
        when(controlPlane.invoke(any())).thenReturn(AiControlPlaneService.AiOutcome.fallback("DISABLED_WORKSPACE"));
        KnowledgeAiService service = new KnowledgeAiService(controlPlane);

        KnowledgeAiService.ComposeResult r = service.compose("ws-1", "user-1", "improve", "  hello world ", null, true);

        assertThat(r.mode()).isEqualTo("improve");
        assertThat(r.text()).isEqualTo("Hello world.");
        assertThat(r.meta().fallback()).isTrue();
        assertThat(r.meta().usedAi()).isFalse();
    }

    @Test
    void compose_returnsAiTextWhenAiRan() {
        AiControlPlaneService controlPlane = mock(AiControlPlaneService.class);
        when(controlPlane.invoke(any())).thenReturn(
            new AiControlPlaneService.AiOutcome(true, false, "AI-polished prose.", AiModelTier.SONNET, "ENABLED", 3, false));
        KnowledgeAiService service = new KnowledgeAiService(controlPlane);

        KnowledgeAiService.ComposeResult r = service.compose("ws-1", "user-1", "summarize", "Long text here. More text.", null, true);

        assertThat(r.text()).isEqualTo("AI-polished prose.");
        assertThat(r.meta().usedAi()).isTrue();
        assertThat(r.meta().fallback()).isFalse();
    }
}
