package com.bcits.works;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

/**
 * Cap V · Sprint Cockpit Capacity tab endpoints. Per-member capacity is config CRUD (kept separate
 * from the AI/analytics cockpit endpoints in {@link Iteration15AiController}). Every endpoint is
 * workspace-scoped (RB-40 §1) and RBAC-gated at the boundary ({@code view_items} for members); the
 * upsert additionally requires {@code manage_sprints}, enforced in {@link SprintCapacityService} so
 * a non-manager can read the board but never mutate it.
 */
@RestController
@RequestMapping("/api/v1")
public class SprintCapacityController {

    private final SprintCapacityService service;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public SprintCapacityController(SprintCapacityService service, AuthenticatedUser authenticatedUser,
                                    RbacService rbac) {
        this.service = service;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    private String requireMember(String workspaceId) {
        String userId = authenticatedUser.id();
        if (workspaceId == null || workspaceId.isBlank()) {
            throw ApiException.badRequest("WORKSPACE_REQUIRED", "workspaceId is required.");
        }
        rbac.require(userId, workspaceId, "view_items");
        return userId;
    }

    private static String str(Map<String, Object> body, String key) {
        Object v = body == null ? null : body.get(key);
        return v == null ? null : v.toString();
    }

    private static Integer intOrNull(Map<String, Object> body, String key) {
        Object v = body == null ? null : body.get(key);
        return v instanceof Number n ? n.intValue() : null;
    }

    @GetMapping("/cockpit/capacity")
    public Map<String, Object> capacity(@RequestParam String workspaceId, @RequestParam String sprintId) {
        String userId = requireMember(workspaceId);
        return service.capacityBoard(workspaceId, userId, sprintId);
    }

    @PutMapping("/cockpit/capacity")
    public Map<String, Object> upsertCapacity(@RequestParam String workspaceId,
                                              @RequestBody Map<String, Object> body) {
        String userId = requireMember(workspaceId); // view_items at boundary; service re-checks manage_sprints
        return service.upsertMemberCapacity(workspaceId, userId,
            str(body, "sprintId"), str(body, "userId"),
            intOrNull(body, "workingDays"), intOrNull(body, "timeOffDays"), intOrNull(body, "focusFactor"));
    }
}
