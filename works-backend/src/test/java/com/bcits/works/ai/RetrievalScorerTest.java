package com.bcits.works.ai;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Answer Engine retrieval scoring (EPIC-14). The former retrieval matched a document only when the
 * entire question appeared verbatim; these cases prove term-based ranked retrieval — partial and
 * multi-term matches surface, and title matches outrank body-only matches.
 */
@Tag("unit")
class RetrievalScorerTest {

    @Test
    void tokenizeDropsStopwordsAndShortTokens() {
        assertThat(RetrievalScorer.tokenize("How do I reset the meter password?"))
                .containsExactlyInAnyOrder("reset", "meter", "password");
    }

    @Test
    void multiTermQueryMatchesEvenWhenExactPhraseIsAbsent() {
        // The document never contains the phrase "reset meter password", but it contains the terms.
        int score = RetrievalScorer.score("reset the meter password",
                "Resetting a meter", "Steps to reset the password on a smart meter device.");
        assertThat(score).isGreaterThan(0);
    }

    @Test
    void nonMatchingDocumentScoresZero() {
        assertThat(RetrievalScorer.score("meter password reset",
                "Quarterly finance review", "Budget numbers and headcount planning.")).isZero();
    }

    @Test
    void titleMatchOutranksBodyOnlyMatch() {
        int titleMatch = RetrievalScorer.score("escalation", "Escalation policy", "General notes.");
        int bodyOnly = RetrievalScorer.score("escalation", "General notes", "Our escalation steps here.");
        assertThat(titleMatch).isGreaterThan(bodyOnly);
    }

    @Test
    void moreTermsMatchedScoresHigher() {
        int both = RetrievalScorer.score("meter outage", "Meter outage runbook", "");
        int one = RetrievalScorer.score("meter outage", "Meter installation guide", "");
        assertThat(both).isGreaterThan(one);
    }
}
