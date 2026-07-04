package com.bcits.works;

import com.bcits.works.shared.AuthenticatedUser;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import jakarta.validation.Valid;

import java.util.List;
import java.util.Map;

/**
 * HTTP surface for workspaces — parse the request, delegate to {@link WorkspaceService}, return the
 * response. No business logic, authorization, or data access lives here (RB-10 §2; CLAUDE.md §4).
 */
@RestController
@RequestMapping("/api/v1/workspaces")
public class WorkspaceController {

    private final WorkspaceService workspaceService;
    private final AuthenticatedUser authenticatedUser;

    public WorkspaceController(WorkspaceService workspaceService, AuthenticatedUser authenticatedUser) {
        this.workspaceService = workspaceService;
        this.authenticatedUser = authenticatedUser;
    }

    /** Workspaces the signed-in user belongs to — powers the workspace switcher. */
    @GetMapping("/mine")
    public List<Map<String, Object>> myWorkspaces() {
        return workspaceService.myWorkspaces(authenticatedUser.id());
    }

    @GetMapping("/{id}")
    public Workspace getWorkspace(@PathVariable String id) {
        return workspaceService.getWorkspace(authenticatedUser.id(), id);
    }

    @PutMapping("/{id}")
    public Workspace updateWorkspace(@PathVariable String id, @Valid @RequestBody Workspace updated) {
        return workspaceService.updateWorkspace(authenticatedUser.id(), id, updated.getName());
    }

    @GetMapping("/{id}/members")
    public List<Map<String, String>> getMembers(@PathVariable String id) {
        return workspaceService.getMembers(authenticatedUser.id(), id);
    }

    @PostMapping("/{id}/members")
    public Map<String, String> addMember(@PathVariable String id,
                                         @Valid @RequestBody Map<String, String> payload) {
        return workspaceService.addMember(authenticatedUser.id(), id,
                payload.get("email"), payload.get("role"));
    }

    @DeleteMapping("/{id}/members/{memberId}")
    public Map<String, String> removeMember(@PathVariable String id, @PathVariable String memberId) {
        return workspaceService.removeMember(authenticatedUser.id(), id, memberId);
    }

    @GetMapping("/{id}/branding")
    public Map<String, Object> getBranding(@PathVariable String id) {
        return workspaceService.getBranding(authenticatedUser.id(), id);
    }

    @PutMapping("/{id}/branding")
    public Map<String, Object> updateBranding(@PathVariable String id,
                                              @Valid @RequestBody Map<String, String> payload) {
        return workspaceService.updateBranding(authenticatedUser.id(), id,
                payload.get("primaryColor"), payload.get("logoUrl"), payload.get("description"));
    }

    @PutMapping("/{id}/sandbox-mode")
    public Workspace setSandboxMode(@PathVariable String id, @RequestBody Map<String, Boolean> payload) {
        return workspaceService.setSandboxMode(authenticatedUser.id(), id,
            Boolean.TRUE.equals(payload.get("enabled")));
    }

    @GetMapping("/{wsId}/projects/{projectId}/members")
    public List<Map<String, Object>> getProjectMembers(@PathVariable String wsId,
                                                       @PathVariable String projectId) {
        return workspaceService.getProjectMembers(authenticatedUser.id(), wsId, projectId);
    }

    @PostMapping("/{wsId}/projects/{projectId}/members")
    public Map<String, String> addProjectMember(@PathVariable String wsId, @PathVariable String projectId,
                                                @Valid @RequestBody Map<String, String> payload) {
        return workspaceService.addProjectMember(authenticatedUser.id(), wsId, projectId,
                payload.get("email"), payload.get("role"));
    }

    @DeleteMapping("/{wsId}/projects/{projectId}/members/{memberId}")
    public Map<String, String> removeProjectMember(@PathVariable String wsId, @PathVariable String projectId,
                                                   @PathVariable String memberId) {
        return workspaceService.removeProjectMember(authenticatedUser.id(), wsId, projectId, memberId);
    }
}
