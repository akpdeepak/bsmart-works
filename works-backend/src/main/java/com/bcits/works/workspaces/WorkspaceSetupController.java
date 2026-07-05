package com.bcits.works.workspaces;

import com.bcits.works.shared.AuthenticatedUser;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * First-run workspace setup wizard (WI-12). Thin HTTP surface; delegates to
 * {@link WorkspaceSetupService}.
 */
@RestController
@RequestMapping("/api/v1/workspace-setup")
public class WorkspaceSetupController {

    private final WorkspaceSetupService service;
    private final AuthenticatedUser authenticatedUser;

    public WorkspaceSetupController(WorkspaceSetupService service, AuthenticatedUser authenticatedUser) {
        this.service = service;
        this.authenticatedUser = authenticatedUser;
    }

    /**
     * Returns the workspace's setup completeness status. Any workspace member may call this.
     * Side-effect: emits the WORKSPACE_CREATED funnel event (step 1) on first call.
     */
    @GetMapping("/status")
    public Map<String, Object> status(@RequestParam String workspaceId) {
        return service.getSetupStatus(authenticatedUser.id(), workspaceId);
    }
}
