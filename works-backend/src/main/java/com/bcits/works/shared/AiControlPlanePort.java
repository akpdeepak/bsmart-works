package com.bcits.works.shared;

/**
 * Domain-neutral port for governed AI invocation. Feature modules depend on this contract while the
 * AI module owns the policy, budget, cache, audit, rate-limit, and provider implementation.
 */
public interface AiControlPlanePort {

    record Request(
            String workspaceId,
            String userId,
            String capability,
            String prompt,
            String fallback,
            String cacheKey,
            boolean inContextEnabled) { }

    record Outcome(boolean usedAi, boolean fallback, String text, String policyState) { }

    Outcome invoke(Request request);
}
