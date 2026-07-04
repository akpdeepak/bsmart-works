package com.bcits.works;

import com.bcits.works.shared.AuthenticatedUser;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Board configuration that is workspace-scoped rather than per-project — currently the WIP
 * (work-in-progress) limits for the board's three fixed status columns. RBAC is applied here through
 * RbacService (the authorization logic lives in the service, RB-10 §2): any member may read the
 * limits, {@code manage_projects} is required to change them. Every call is workspace-scoped
 * (RB-40 §1).
 */
@RestController
@RequestMapping("/api/v1/board")
public class BoardController {

    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;
    private final BoardWipLimitService wipLimits;

    public BoardController(AuthenticatedUser authenticatedUser, RbacService rbac,
                           BoardWipLimitService wipLimits) {
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
        this.wipLimits = wipLimits;
    }

    @GetMapping("/wip-limits")
    public BoardWipLimit wipLimits(@RequestParam String workspaceId) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "view_items");
        return wipLimits.get(workspaceId);
    }

    public record WipLimitsRequest(Integer todoLimit, Integer inProgressLimit, Integer doneLimit) { }

    @PutMapping("/wip-limits")
    public BoardWipLimit setWipLimits(@RequestParam String workspaceId, @Valid @RequestBody WipLimitsRequest req) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_projects");
        return wipLimits.set(workspaceId, req.todoLimit(), req.inProgressLimit(), req.doneLimit());
    }
}
