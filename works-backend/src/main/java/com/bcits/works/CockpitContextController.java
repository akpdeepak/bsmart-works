package com.bcits.works;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;
import java.util.Map;

/**
 * Cap V · Role-adaptive cockpit HTTP surface. Thin; delegates to {@link TeamRoleService}.
 */
@RestController
@RequestMapping("/api/v1")
public class CockpitContextController {

    private final TeamRoleService service;
    private final AuthenticatedUser authenticatedUser;

    public CockpitContextController(TeamRoleService service, AuthenticatedUser authenticatedUser) {
        this.service = service;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping("/cockpit/context")
    public Map<String, Object> context(@RequestParam String projectId) {
        return service.cockpitContext(authenticatedUser.id(), projectId);
    }

    @GetMapping("/team-roles")
    public List<ProjectTeamMember> list(@RequestParam String projectId) {
        return service.listByProject(authenticatedUser.id(), projectId);
    }

    @PutMapping("/team-roles")
    public ProjectTeamMember setRole(@RequestBody Map<String, String> body) {
        return service.setRole(authenticatedUser.id(),
                body.get("projectId"), body.get("userId"), body.get("roleKey"));
    }
}
