package com.bcits.works;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Multi-author collaboration on a knowledge article (iteration-20 Cap I). Workspace-scoped (RB-40 §1)
 * and RBAC-gated at the boundary (RB-10 §2): reading the roster requires workspace membership
 * ({@code view_items}); adding or removing a co-author requires {@code create_items}. The service
 * resolves the article's owning workspace and treats a foreign article as {@code NOT_FOUND}.
 */
@RestController
@RequestMapping("/api/v1/knowledge/articles/{articleId}/authors")
public class ArticleCollaborationController {

    private final ArticleCollaborationService service;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public ArticleCollaborationController(ArticleCollaborationService service,
                                          AuthenticatedUser authenticatedUser, RbacService rbac) {
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
    public List<ArticleAuthor> listAuthors(@PathVariable String articleId, @RequestParam String workspaceId) {
        require(workspaceId, "view_items");
        return service.listAuthors(workspaceId, articleId);
    }

    @PostMapping
    public ArticleAuthor addAuthor(@PathVariable String articleId, @RequestParam String workspaceId,
                                   @RequestBody Map<String, Object> body) {
        String userId = require(workspaceId, "create_items");
        String targetUserId = str(body, "userId");
        String role = str(body, "role");
        return service.addAuthor(workspaceId, userId, articleId, targetUserId, role);
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> removeAuthor(@PathVariable String articleId, @PathVariable("userId") String targetUserId,
                                             @RequestParam String workspaceId) {
        String userId = require(workspaceId, "create_items");
        service.removeAuthor(workspaceId, userId, articleId, targetUserId);
        return ResponseEntity.noContent().build();
    }

    private static String str(Map<String, Object> body, String key) {
        Object v = body == null ? null : body.get(key);
        return v == null ? null : v.toString();
    }
}
