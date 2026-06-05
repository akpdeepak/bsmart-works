package com.example.demo;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;

/**
 * The tested, queryable registry of each AI capability's deterministic fallback (iteration 10, Cap Z
 * / I10-S09; RB-40 §2). The fallback contract is mandatory: every AI feature must answer "what
 * happens when AI is off, over budget, or unavailable?" — and that answer is data here, not folklore.
 * The narrative form lives in {@code docs/AI-FALLBACKS.md}; this is the machine-readable mirror the
 * {@code /api/v1/ai/fallbacks} endpoint serves and tests assert against.
 *
 * <p>Pure (no I/O), so it is unit-testable in isolation.
 */
@Service
public class AiFallbackRegistry {

    /** One capability's fallback contract. */
    public record Fallback(String capability, String label, String deterministicBehavior,
                           boolean mutates) { }

    private static final List<Fallback> FALLBACKS = List.of(
        new Fallback("NL_TO_BQL", "Natural language → BQL",
            "A rule-based phrase parser (NlToBqlParser) maps the phrase to BQL and previews it; an "
                + "unrecognised phrase returns low confidence and the user falls back to the manual "
                + "BQL / visual builder. Never auto-runs a mutation.",
            false),
        new Fallback("SUMMARIZATION", "Summarization",
            "An extractive summarizer (Summarizer) selects the most salient sentences (first / "
                + "longest / last) deterministically. Read-only; no model required.",
            false));

    /** All registered fallbacks. */
    public List<Fallback> all() {
        return FALLBACKS;
    }

    /** Lookup by capability id (case-insensitive); null if unknown. */
    public Fallback forCapability(String capability) {
        if (capability == null) {
            return null;
        }
        return FALLBACKS.stream()
            .filter(f -> f.capability().equalsIgnoreCase(capability))
            .findFirst()
            .orElse(null);
    }

    /** Whether a capability is a known, state-changing one (so the plane must confirm before execute). */
    public boolean mutates(String capability) {
        Fallback f = forCapability(capability);
        return f != null && f.mutates();
    }

    /** As a list of plain maps for the API/UI. */
    public List<Map<String, Object>> asMaps() {
        return FALLBACKS.stream()
            .map(f -> Map.<String, Object>of(
                "capability", f.capability(),
                "label", f.label(),
                "deterministicBehavior", f.deterministicBehavior(),
                "mutates", f.mutates()))
            .toList();
    }
}
