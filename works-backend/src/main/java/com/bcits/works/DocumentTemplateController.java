package com.bcits.works;
import com.bcits.works.shared.RbacGate;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Document template library (iteration-20 Cap I, Advanced Knowledge). Workspace-scoped (RB-40 §1) and
 * RBAC-gated at the boundary (RB-10 §2): reads require workspace membership ({@code view_items}); managing
 * the library — create / update / delete — requires {@code manage_projects}. The service applies the
 * workspace-scope guard so a foreign-workspace template id is a {@code NOT_FOUND}.
 */
@RestController
@RequestMapping("/api/v1/knowledge/templates")
public class DocumentTemplateController {

    private final DocumentTemplateService service;
    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;

    public DocumentTemplateController(DocumentTemplateService service, AuthenticatedUser authenticatedUser,
                                      RbacGate rbac) {
        this.service = service;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    private String require(String workspaceId, String permission) {
        String userId = authenticatedUser.id();
        if (workspaceId == null || workspaceId.isBlank()) {
            throw ApiException.badRequest("WORKSPACE_REQUIRED", "workspaceId is required.");
        }
        rbac.require(userId, workspaceId, permission);
        return userId;
    }

    @GetMapping
    public List<DocumentTemplate> list(@RequestParam String workspaceId,
                                       @RequestParam(required = false) String category) {
        require(workspaceId, "view_items");
        return service.list(workspaceId, category);
    }

    @GetMapping("/{id}")
    public DocumentTemplate get(@RequestParam String workspaceId, @PathVariable String id) {
        require(workspaceId, "view_items");
        return service.get(workspaceId, id);
    }

    @PostMapping
    public DocumentTemplate create(@RequestParam String workspaceId, @Valid @RequestBody DocumentTemplate body) {
        String userId = require(workspaceId, "manage_projects");
        return service.create(workspaceId, userId, body);
    }

    @PutMapping("/{id}")
    public DocumentTemplate update(@RequestParam String workspaceId, @PathVariable String id,
                                   @Valid @RequestBody DocumentTemplate body) {
        String userId = require(workspaceId, "manage_projects");
        return service.update(workspaceId, userId, id, body);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@RequestParam String workspaceId, @PathVariable String id) {
        String userId = require(workspaceId, "manage_projects");
        service.delete(workspaceId, userId, id);
        return ResponseEntity.noContent().build();
    }
}
