package com.bcits.works.ai;

/**
 * Model tiering (RB-40 §2). The cheap/fast tier handles classification and intent; the capable
 * tier handles generation. The control plane never defaults everything to the expensive tier —
 * it picks the cheapest tier that fits the capability, and is forced down to {@link #HAIKU} once a
 * workspace crosses 80% of its monthly AI budget.
 *
 * <p>Costs are expressed in cents per 1,000 tokens. The numbers are an internal accounting unit
 * for the budget meter (intentionally rounded), not a public price list.
 */
public enum AiModelTier {
    /** Cheap/fast — intent parsing, classification, triage, routing. */
    HAIKU(2),
    /** Capable — generation, narratives, RAG synthesis. */
    SONNET(24),
    /** No model was called (deterministic fallback or AI disabled). */
    NONE(0);

    private final int centsPer1kTokens;

    AiModelTier(int centsPer1kTokens) {
        this.centsPer1kTokens = centsPer1kTokens;
    }

    /** Cost in whole cents for the given total token count, rounded to the nearest cent. */
    public int costCents(int totalTokens) {
        if (centsPer1kTokens == 0 || totalTokens <= 0) {
            return 0;
        }
        return Math.round((totalTokens / 1000f) * centsPer1kTokens);
    }
}
