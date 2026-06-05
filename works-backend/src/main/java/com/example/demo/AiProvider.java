package com.example.demo;

/**
 * The single seam through which the AI Control Plane talks to a model (iteration 10, Cap O; RB-40 §2).
 * Every AI call in the product flows through {@link AiOrchestrationService}, which selects exactly one
 * provider — no capability calls a model on its own terms.
 *
 * <p>The always-available implementation is {@link DeterministicAiProvider}, which needs no external
 * service and <em>is</em> the spec's deterministic fallback. A future {@code LiveAiProvider} (behind
 * an API key, out of scope here) would implement this same interface; the orchestration would prefer
 * it when configured and under budget, and fall back to the deterministic provider when AI is off,
 * over budget, or unavailable.
 */
public interface AiProvider {

    /** What the plane asks a provider to do, with the (already boundary-redacted) input. */
    enum Capability { NL_TO_BQL, SUMMARIZATION }

    /** A unit of AI work: capability, the redacted input, and the user id for {@code currentUser()}. */
    record AiTask(Capability capability, String input, String currentUserId) { }

    /**
     * The provider's answer: the produced text/BQL, token accounting and the model tier used, plus a
     * confidence flag (a deterministic NL→BQL parse that couldn't interpret the phrase is
     * low-confidence) and whether this was the deterministic fallback.
     */
    record AiResult(String text, int tokensIn, int tokensOut, String modelTier,
                    boolean confident, boolean fallbackUsed) { }

    /** Run the task. Implementations must never throw on ordinary input — degrade, don't crash. */
    AiResult complete(AiTask task);

    /** Whether this provider is live (talks to an external model) or the deterministic fallback. */
    boolean isDeterministic();
}
