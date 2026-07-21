package com.bcits.works.ai;

import com.bcits.works.shared.AiControlPlanePort;

import org.springframework.stereotype.Component;

/** AI-module implementation of the shared governed-invocation port. */
@Component
public class AiControlPlaneAdapter implements AiControlPlanePort {

    private final AiControlPlaneService controlPlane;

    public AiControlPlaneAdapter(AiControlPlaneService controlPlane) {
        this.controlPlane = controlPlane;
    }

    @Override
    public Outcome invoke(Request request) {
        AiControlPlaneService.AiOutcome outcome = controlPlane.invoke(new AiControlPlaneService.AiCall(
            request.workspaceId(), request.userId(), request.capability(), request.prompt(),
            request.fallback(), request.cacheKey(), request.inContextEnabled()));
        return new Outcome(outcome.usedAi(), outcome.fallback(), outcome.text(), outcome.policyState());
    }
}
