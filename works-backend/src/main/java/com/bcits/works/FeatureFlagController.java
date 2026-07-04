package com.bcits.works;

import com.bcits.works.shared.AuthenticatedUser;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * WI-11 — feature-flag HTTP surface. Thin adapter; all logic in {@link FeatureFlagService}.
 */
@RestController
@RequestMapping("/api/v1/feature-flags")
public class FeatureFlagController {

    private final FeatureFlagService service;
    private final AuthenticatedUser authenticatedUser;

    public FeatureFlagController(FeatureFlagService service, AuthenticatedUser authenticatedUser) {
        this.service = service;
        this.authenticatedUser = authenticatedUser;
    }

    /** Any workspace member: returns all flags with workspace overrides applied. */
    @GetMapping
    public Map<String, Object> getFlags(@RequestParam String workspaceId) {
        return service.getFlags(authenticatedUser.id(), workspaceId);
    }

    /** ADMIN only: set or update a per-workspace flag override. */
    @PutMapping("/{flagName}/override")
    public void setFlagOverride(
            @RequestParam String workspaceId,
            @PathVariable String flagName,
            @RequestBody Map<String, Object> body) {
        boolean enabled = Boolean.TRUE.equals(body.get("enabled"));
        String variant = body.get("variant") instanceof String s ? s : null;
        service.setFlagOverride(authenticatedUser.id(), workspaceId, flagName, enabled, variant);
    }

    /** ADMIN only: remove the per-workspace override; flag reverts to its global default. */
    @DeleteMapping("/{flagName}/override")
    public void resetFlagOverride(
            @RequestParam String workspaceId,
            @PathVariable String flagName) {
        service.resetFlagOverride(authenticatedUser.id(), workspaceId, flagName);
    }
}
