package com.example.demo;

import org.springframework.stereotype.Service;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Deterministic extractive summarizer (iteration 10, Cap O / I10-S13; RB-40 §2). The
 * <b>always-available fallback</b> for the summarization surface — it needs no model. Rather than
 * generate new text (which would require an LLM), it <em>extracts</em> the most salient sentences:
 * the first sentence (sets context), the longest (usually the most information-dense), and the last
 * (often the conclusion / current state), de-duplicated and returned in original order.
 *
 * <p>Pure (no I/O), so it is unit-testable in isolation (mirrors {@link SlaCalculationService}).
 */
@Service
public class Summarizer {

    /** Result: the summary text plus how many source sentences were considered. */
    public record Summary(String text, int sentenceCount) { }

    /** Summarize to at most {@code maxSentences} salient sentences (first / longest / last). */
    public Summary summarize(String text, int maxSentences) {
        List<String> sentences = splitSentences(text);
        if (sentences.isEmpty()) {
            return new Summary("", 0);
        }
        int cap = Math.max(1, maxSentences);
        if (sentences.size() <= cap) {
            return new Summary(String.join(" ", sentences), sentences.size());
        }

        // Pick salient indices: first, longest, last (a deterministic, model-free heuristic).
        Set<Integer> picked = new LinkedHashSet<>();
        picked.add(0);
        picked.add(longestIndex(sentences));
        picked.add(sentences.size() - 1);
        // If a higher cap was asked for, fill from the start in order until we reach it.
        for (int i = 0; i < sentences.size() && picked.size() < cap; i++) {
            picked.add(i);
        }

        // Emit in original document order so the summary reads naturally.
        List<Integer> ordered = new ArrayList<>(picked);
        ordered.sort(Integer::compareTo);
        List<String> out = new ArrayList<>();
        for (int idx : ordered) {
            if (out.size() >= cap) {
                break;
            }
            out.add(sentences.get(idx));
        }
        return new Summary(String.join(" ", out), sentences.size());
    }

    /** Convenience overload — a three-sentence extractive summary. */
    public Summary summarize(String text) {
        return summarize(text, 3);
    }

    private int longestIndex(List<String> sentences) {
        int best = 0;
        int bestLen = -1;
        for (int i = 0; i < sentences.size(); i++) {
            int len = sentences.get(i).length();
            if (len > bestLen) {
                bestLen = len;
                best = i;
            }
        }
        return best;
    }

    private List<String> splitSentences(String text) {
        List<String> out = new ArrayList<>();
        if (text == null) {
            return out;
        }
        // Split on sentence-ending punctuation followed by whitespace, and on newlines (bulleted
        // threads). Trim, drop empties — defensive against ragged input.
        for (String raw : text.split("(?<=[.!?])\\s+|\\r?\\n+")) {
            String s = raw.trim();
            if (!s.isEmpty()) {
                out.add(s);
            }
        }
        return out;
    }
}
