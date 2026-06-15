package com.bcits.works;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * WI-10 — HEART / activation-funnel metrics endpoint (HEART-METRICS.md §7).
 * Thin HTTP adapter; admin-gating and all logic live in {@link FunnelMetricsService}.
 */
@RestController
@RequestMapping("/api/v1/funnel")
public class FunnelMetricsController {

    private final FunnelMetricsService service;
    private final AuthenticatedUser authenticatedUser;

    public FunnelMetricsController(FunnelMetricsService service, AuthenticatedUser authenticatedUser) {
        this.service = service;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping("/heart")
    public Map<String, Object> heartMetrics(@RequestParam String workspaceId) {
        return service.heartMetrics(authenticatedUser.id(), workspaceId);
    }
}
