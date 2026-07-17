package com.bcits.works;
import com.bcits.works.ai.AiControlPlaneService;
import com.bcits.works.ai.AiModelTier;

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
    void meetingNotesDeterministic_parsesAttendeesActionItemsAndDecisions() {
        String input = "@Alice @Bob\nAction: Deploy by Friday\nThe system needs upgrading.";
        String out = KnowledgeAiService.meetingNotesDeterministic(input, null);

        assertThat(out).contains("# Attendees");
        assertThat(out).contains("Alice");
        assertThat(out).contains("Bob");
        assertThat(out).contains("# Key Decisions");
        assertThat(out).contains("The system needs upgrading.");
        assertThat(out).contains("# Action Items");
        assertThat(out).contains("- [ ] Deploy by Friday");
        assertThat(out).contains("# Next Steps");
    }

    @Test
    void meetingNotesDeterministic_emptyInput_returnsScaffold() {
        String out = KnowledgeAiService.meetingNotesDeterministic("", null);
        assertThat(out).contains("# Attendees");
        assertThat(out).contains("# Key Decisions");
        assertThat(out).contains("# Action Items");
        assertThat(out).contains("# Next Steps");
    }

    @Test
    void meetingNotesDeterministic_todoPrefix_isAlsoRecognised() {
        String input = "TODO: Review the deployment checklist";
        String out = KnowledgeAiService.meetingNotesDeterministic(input, null);
        assertThat(out).contains("- [ ] Review the deployment checklist");
    }

    @Test
    void normalizeMode_acceptsMeetingNotesMode() {
        assertThat(KnowledgeAiService.normalizeMode("meeting_notes")).isEqualTo("meeting_notes");
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

    // ── KR-073: Outline generator ──────────────────────────────────────────────

    @Test
    void outlineDeterministic_runbookContainsPrerequisites() {
        String out = KnowledgeAiService.outlineDeterministic("Deployment guide", "RUNBOOK");
        assertThat(out).contains("Prerequisites");
        assertThat(out).contains("Deployment guide");
        assertThat(out).contains("## Steps");
        assertThat(out).contains("## Rollback");
    }

    @Test
    void outlineDeterministic_kbUsesGenericSections() {
        String out = KnowledgeAiService.outlineDeterministic("My topic", "KB");
        assertThat(out).contains("## Background");
        assertThat(out).contains("## Details");
        assertThat(out).contains("## References");
    }

    @Test
    void outlineDeterministic_unknownTemplateUsesDefault() {
        String out = KnowledgeAiService.outlineDeterministic("Custom report", "CUSTOM");
        assertThat(out).startsWith("# Custom report");
        assertThat(out).contains("## Section 1");
        assertThat(out).contains("## Conclusion");
    }

    // ── KR-074: Writing check ─────────────────────────────────────────────────

    @Test
    void checkWritingDeterministic_detectsItsAAndUtilize() {
        List<KnowledgeAiService.WritingIssue> issues =
            KnowledgeAiService.checkWritingDeterministic("Its a great day. Use utilize when possible.");
        assertThat(issues).isNotEmpty();
        boolean hasItsA = issues.stream().anyMatch(i -> i.text().contains("its a"));
        boolean hasUtilize = issues.stream().anyMatch(i -> i.text().equals("utilize"));
        assertThat(hasItsA).isTrue();
        assertThat(hasUtilize).isTrue();
    }

    @Test
    void checkWritingDeterministic_emptyText_returnsNoIssues() {
        assertThat(KnowledgeAiService.checkWritingDeterministic("")).isEmpty();
        assertThat(KnowledgeAiService.checkWritingDeterministic(null)).isEmpty();
    }

    // ── KR-075: Auto-tagging ──────────────────────────────────────────────────

    @Test
    void suggestTagsDeterministic_returnsHighFrequencyTerms() {
        String content = "kubernetes kubernetes kubernetes deployment deployment deployment "
            + "production production production cluster cluster cluster nodes pods pods pods";
        List<String> tags = KnowledgeAiService.suggestTagsDeterministic(content, List.of());
        assertThat(tags).isNotEmpty();
        boolean hasKubernetes = tags.contains("kubernetes");
        boolean hasDeployment = tags.contains("deployment");
        assertThat(hasKubernetes || hasDeployment).isTrue();
    }

    @Test
    void suggestTagsDeterministic_emptyContent_returnsEmpty() {
        assertThat(KnowledgeAiService.suggestTagsDeterministic("", List.of())).isEmpty();
    }

    // ── KR-076: Simplify ──────────────────────────────────────────────────────

    @Test
    void simplifyDeterministic_replacesVerbosePhrases() {
        String result = KnowledgeAiService.simplifyDeterministic(
            "In order to utilize the system you must implement the solution.", "6");
        assertThat(result).contains("use");
        assertThat(result).contains("to");
        assertThat(result).doesNotContain("utilize");
        assertThat(result).doesNotContain("in order to");
    }

    @Test
    void simplifyDeterministic_emptyText_returnsEmpty() {
        assertThat(KnowledgeAiService.simplifyDeterministic("", "6")).isEqualTo("");
        assertThat(KnowledgeAiService.simplifyDeterministic(null, "6")).isEqualTo("");
    }

    // ── Deterministic fallback helpers (KR-074 / KR-075) ─────────────────────

    @Test
    void deterministicCheck_detectsRepeatedWords() {
        List<KnowledgeAiService.WritingIssue> issues =
            KnowledgeAiService.deterministicCheck("the the quick brown fox");
        assertThat(issues).hasSize(1);
        assertThat(issues.get(0).issue()).isEqualTo("Repeated word");
        assertThat(issues.get(0).suggestion()).isEqualToIgnoringCase("the");
    }

    @Test
    void deterministicCheck_emptyOrNull_returnsEmpty() {
        assertThat(KnowledgeAiService.deterministicCheck(null)).isEmpty();
        assertThat(KnowledgeAiService.deterministicCheck("  ")).isEmpty();
        assertThat(KnowledgeAiService.deterministicCheck("no repeated words here")).isEmpty();
    }

    @Test
    void deterministicTags_extractsSignificantWords() {
        List<String> tags = KnowledgeAiService.deterministicTags("deployment pipeline requires careful testing strategy");
        assertThat(tags).isNotEmpty();
        assertThat(tags.size()).isLessThanOrEqualTo(5);
        // all tags are longer than 4 chars
        tags.forEach(t -> assertThat(t.length()).isGreaterThan(4));
    }

    @Test
    void deterministicTags_emptyOrNull_returnsEmpty() {
        assertThat(KnowledgeAiService.deterministicTags(null)).isEmpty();
        assertThat(KnowledgeAiService.deterministicTags("  ")).isEmpty();
    }

    @Test
    void checkWriting_onFallback_returnsDeterministicIssues() {
        AiControlPlaneService controlPlane = mock(AiControlPlaneService.class);
        when(controlPlane.invoke(any())).thenReturn(AiControlPlaneService.AiOutcome.fallback("DISABLED_WORKSPACE"));
        KnowledgeAiService service = new KnowledgeAiService(controlPlane);

        List<KnowledgeAiService.WritingIssue> issues = service.checkWriting("ws-1", "user-1", "the the fox");

        assertThat(issues).hasSize(1);
        assertThat(issues.get(0).issue()).isEqualTo("Repeated word");
    }

    @Test
    void suggestTags_onFallback_returnsDeterministicTags() {
        AiControlPlaneService controlPlane = mock(AiControlPlaneService.class);
        when(controlPlane.invoke(any())).thenReturn(AiControlPlaneService.AiOutcome.fallback("DISABLED_WORKSPACE"));
        KnowledgeAiService service = new KnowledgeAiService(controlPlane);

        List<String> tags = service.suggestTags("ws-1", "user-1", "deployment pipeline testing strategy", List.of());

        assertThat(tags).isNotEmpty();
        assertThat(tags.size()).isLessThanOrEqualTo(5);
    }
}
