package com.bcits.works.ai;

import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Deterministic term-based relevance scoring for the Answer Engine's grounding retrieval. Replaces
 * the former whole-query {@code String.contains} filter, which only matched a document when the
 * entire question appeared verbatim — so a multi-word question ("how do I reset the meter") matched
 * nothing unless that exact phrase existed. This tokenizes the query and scores each document by how
 * many query terms it contains, weighting title matches above body matches, so partial and
 * multi-term matches surface and rank by relevance. It is not semantic search, but it is real
 * ranked retrieval with a stable ordering.
 */
final class RetrievalScorer {

    private RetrievalScorer() {}

    private static final int TITLE_WEIGHT = 3;
    private static final int BODY_WEIGHT = 1;

    // Minimal English stopword set — kept small and deterministic; question words are dropped so a
    // query's content terms drive the score rather than "how/what/the".
    private static final Set<String> STOPWORDS = Set.of(
            "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "is", "are", "do", "does",
            "did", "how", "what", "why", "when", "where", "which", "who", "i", "my", "me", "we", "our",
            "can", "should", "with", "this", "that", "it", "be", "as", "at", "by", "from");

    /** Query terms: lowercased, split on non-alphanumerics, length ≥ 2, stopwords removed, de-duplicated. */
    static Set<String> tokenize(String query) {
        Set<String> terms = new LinkedHashSet<>();
        if (query == null) return terms;
        for (String raw : query.toLowerCase().split("[^a-z0-9]+")) {
            if (raw.length() >= 2 && !STOPWORDS.contains(raw)) {
                terms.add(raw);
            }
        }
        return terms;
    }

    /**
     * Relevance of a document to the pre-tokenized query terms: {@code TITLE_WEIGHT} per term present
     * in the title plus {@code BODY_WEIGHT} per term present in the body. Zero means no query term
     * appears (the document is not a match).
     */
    static int score(Set<String> queryTerms, String title, String body) {
        if (queryTerms.isEmpty()) return 0;
        String t = title == null ? "" : title.toLowerCase();
        String b = body == null ? "" : body.toLowerCase();
        int score = 0;
        for (String term : queryTerms) {
            if (t.contains(term)) score += TITLE_WEIGHT;
            if (b.contains(term)) score += BODY_WEIGHT;
        }
        return score;
    }

    /** Convenience for a single free-text field (e.g. a status-only work item). */
    static int score(String query, String title, String body) {
        return score(tokenize(query), title, body);
    }
}
