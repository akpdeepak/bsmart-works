package com.bcits.works;

import java.util.Map;

/**
 * The model gateway abstraction. The AI Control Plane is the <em>only</em> caller of this interface
 * (RB-40 §2: AI calls originate server-side only, RB-10 §8). Swapping in a real LLM is a matter of
 * registering a different {@link AiProvider} bean — no capability code changes, because every
 * feature goes through {@link AiControlPlaneService}.
 *
 * <p>The shipped default is {@link DeterministicAiProvider}: a rule-based, fully offline engine so
 * the product is functional (and its budget/audit/cache machinery exercised) without an external
 * API key or network egress. A hosted provider can be layered on later without touching callers.
 */
public interface AiProvider {

    /** A request to the model gateway. {@code draft} is the deterministically-computed candidate the
     *  capability already assembled from workspace-scoped data; a real model would refine it. */
    record AiRequest(String capability, AiModelTier tier, String prompt, String draft, Map<String, Object> context) {
        public AiRequest {
            context = context == null ? Map.of() : context;
        }
    }

    /** A model result. {@code text} is the rendered output; {@code tokensIn}/{@code tokensOut} feed
     *  the budget meter and audit log. */
    record AiResult(String text, AiModelTier tier, int tokensIn, int tokensOut) { }

    /** Identifier of the backing provider, for the audit log and ops. */
    String name();

    AiResult complete(AiRequest request);
}
