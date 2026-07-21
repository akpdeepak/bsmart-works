package com.bcits.works.ai;

import org.springframework.stereotype.Component;

/**
 * The default, fully-offline {@link AiProvider} (RB-40 §2 data boundary: never makes a network
 * call, so no PII can leave the server). It "completes" a request by returning the capability's
 * deterministically-computed {@code draft} — the candidate the calling capability already built
 * from workspace-scoped data — and reports token/cost accounting so the budget meter and audit log
 * behave exactly as they would against a hosted model.
 *
 * <p>This is intentionally not a language model. It is the seam where one is plugged in: register a
 * higher-priority {@link AiProvider} bean and every capability transparently upgrades, because they
 * all route through {@link AiControlPlaneService}. Until then the product is whole and deterministic.
 */
@Component
public class DeterministicAiProvider implements AiProvider {

    /** Rough token estimate: ~4 characters per token, the common heuristic. */
    static int estimateTokens(String text) {
        if (text == null || text.isEmpty()) {
            return 0;
        }
        return Math.max(1, (int) Math.ceil(text.length() / 4.0));
    }

    @Override
    public String name() {
        return "deterministic-offline";
    }

    @Override
    public AiResult complete(AiRequest request) {
        String draft = request.draft() == null ? "" : request.draft();
        int tokensIn = estimateTokens(request.prompt());
        int tokensOut = estimateTokens(draft);
        return new AiResult(draft, request.tier(), tokensIn, tokensOut);
    }
}
