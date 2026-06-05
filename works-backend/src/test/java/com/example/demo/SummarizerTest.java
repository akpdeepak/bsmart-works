package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link Summarizer} — the deterministic extractive summarizer (iteration 10, Cap O /
 * I10-S13). Pure; no DB, no model.
 */
@Tag("unit")
class SummarizerTest {

    private final Summarizer summarizer = new Summarizer();

    @Test
    void emptyOrNull_isEmptySummary() {
        assertThat(summarizer.summarize("").text()).isEmpty();
        assertThat(summarizer.summarize(null).sentenceCount()).isZero();
    }

    @Test
    void fewerThanCap_returnsAllSentences() {
        Summarizer.Summary s = summarizer.summarize("One thing. Two things.", 3);
        assertThat(s.sentenceCount()).isEqualTo(2);
        assertThat(s.text()).isEqualTo("One thing. Two things.");
    }

    @Test
    void overCap_picksFirstLongestLast_inOrder() {
        String text = "First short. This is clearly the much longer middle sentence with detail. "
            + "Mid two. Mid three. Final note.";
        Summarizer.Summary s = summarizer.summarize(text, 3);
        assertThat(s.sentenceCount()).isEqualTo(5);
        // first, the longest (the detailed middle), and the last — in original order.
        assertThat(s.text()).startsWith("First short.");
        assertThat(s.text()).contains("much longer middle sentence");
        assertThat(s.text()).endsWith("Final note.");
    }

    @Test
    void defaultOverload_capsAtThree() {
        String text = "A. B. C. D. E. F.";
        Summarizer.Summary s = summarizer.summarize(text);
        // at most 3 sentences in the output
        assertThat(s.text().split("\\s+")).hasSizeLessThanOrEqualTo(3);
        assertThat(s.sentenceCount()).isEqualTo(6);
    }
}
