package com.bcits.works.workitems;
import com.bcits.works.workspaces.api.Workspace;
import com.bcits.works.workitems.api.StatusConfigService;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.AuthenticatedUser;
import com.bcits.works.shared.RbacGate;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Per-type status configuration for the Settings → Status Management editor:
 * {@code GET /api/v1/status-config?workspaceId=...} returns the status set for every built-in type,
 * seeding workspace defaults on first read. Mutations reuse the existing {@code /workflows/{id}/statuses}
 * CRUD — this endpoint only resolves which workflow owns each type and what its statuses are.
 *
 * <p>Workspace-scoped (RB-40 §1): the caller must be a member of the workspace.
 */
@Tag(name = "Status Config", description = "Per-type work-item status definitions (workflow-backed)")
@RestController
@RequestMapping("/api/v1/status-config")
public class StatusConfigController {

    private final StatusConfigService statusConfig;
    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;

    public StatusConfigController(StatusConfigService statusConfig,
                                  AuthenticatedUser authenticatedUser, RbacGate rbac) {
        this.statusConfig = statusConfig;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @Operation(summary = "Per-type status configuration for a workspace (seeds defaults on first read)")
    @GetMapping
    public List<StatusConfigService.TypeStatusConfig> get(@RequestParam String workspaceId) {
        if (rbac.getUserTier(authenticatedUser.id(), workspaceId) < 1) {
            throw ApiException.notFound("Workspace", workspaceId);
        }
        return statusConfig.readGrouped(workspaceId);
    }
}
