package com.bcits.works.workitems;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.AuthenticatedUser;
import com.bcits.works.shared.RbacGate;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/field-layouts")
public class FieldLayoutController {

    private final FieldLayoutRepository layoutRepo;
    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;

    public FieldLayoutController(FieldLayoutRepository layoutRepo,
                                  AuthenticatedUser authenticatedUser,
                                  RbacGate rbac) {
        this.layoutRepo = layoutRepo;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping
    public List<FieldLayout> list(@RequestParam(required = false) String workspaceId,
                                  @RequestParam(required = false) String projectId) {
        String userId = authenticatedUser.id();
        if (projectId != null) {
            String resolvedWorkspaceId = workspaceForProjectOrThrow(projectId);
            rbac.require(userId, resolvedWorkspaceId, "view_items");
            return layoutRepo.findByWorkspaceId(resolvedWorkspaceId);
        }
        if (workspaceId != null) {
            rbac.require(userId, workspaceId, "view_items");
            return layoutRepo.findByWorkspaceId(workspaceId);
        }
        return layoutRepo.findAllScopedToUser(userId);
    }

    @GetMapping("/{itemType}")
    public FieldLayout getByType(@PathVariable String itemType,
                                  @RequestParam(required = false) String projectId,
                                  @RequestParam(required = false) String workspaceId) {
        String userId = authenticatedUser.id();
        String resolvedWorkspaceId = workspaceFor(projectId, workspaceId);
        rbac.require(userId, resolvedWorkspaceId, "view_items");
        Optional<FieldLayout> found = projectId != null
            ? layoutRepo.findByProjectIdAndItemType(projectId, itemType)
            : layoutRepo.findByWorkspaceIdAndItemType(resolvedWorkspaceId, itemType);
        return found.orElseGet(() -> {
            FieldLayout fl = new FieldLayout();
            fl.setItemType(itemType);
            fl.setWorkspaceId(resolvedWorkspaceId);
            fl.setProjectId(projectId);
            fl.setLayoutJson("[]");
            return fl;
        });
    }

    @PutMapping("/{itemType}")
    public FieldLayout saveLayout(@PathVariable String itemType,
                                   @RequestParam(required = false) String projectId,
                                   @RequestParam(required = false) String workspaceId,
                                   @Valid @RequestBody Map<String, Object> body) {
        String userId = authenticatedUser.id();
        String wsId = workspaceFor(projectId, workspaceId);
        rbac.require(userId, wsId, "manage_projects");
        FieldLayout fl = (projectId != null
            ? layoutRepo.findByProjectIdAndItemType(projectId, itemType)
            : layoutRepo.findByWorkspaceIdAndItemType(wsId, itemType))
            .orElseGet(() -> {
                FieldLayout newFl = new FieldLayout();
                newFl.setId("FL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                newFl.setWorkspaceId(wsId);
                newFl.setProjectId(projectId);
                newFl.setItemType(itemType);
                newFl.setCreatedAt(OffsetDateTime.now());
                return newFl;
            });
        if (body.get("layoutJson") != null) {
            fl.setLayoutJson(body.get("layoutJson").toString());
        }
        fl.setUpdatedAt(OffsetDateTime.now());
        return layoutRepo.save(fl);
    }

    private String workspaceFor(String projectId, String workspaceId) {
        if (projectId != null) {
            return workspaceForProjectOrThrow(projectId);
        }
        if (workspaceId == null) {
            throw ApiException.badRequest("WORKSPACE_REQUIRED", "workspaceId or projectId is required.");
        }
        return workspaceId;
    }

    private String workspaceForProjectOrThrow(String projectId) {
        String workspaceId = rbac.workspaceForProject(projectId);
        if (workspaceId == null) {
            throw ApiException.notFound("Project", projectId);
        }
        return workspaceId;
    }
}
