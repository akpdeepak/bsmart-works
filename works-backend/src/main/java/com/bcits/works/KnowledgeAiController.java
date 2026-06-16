package com.bcits.works;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Know Studio AI compose (Know section). Workspace-scoped (RB-40 §1) and RBAC-gated at the boundary
 * (RB-10 §2): any workspace member ({@code view_items}) may run a compose. Scope / budget / cache /
 * audit and the deterministic fallback are applied centrally by {@link AiControlPlaneService} via
 * {@link KnowledgeAiService}, so the editor always gets usable text — {@code meta.fallback} tells the
 * UI whether AI actually ran.
 */
@RestController
@RequestMapping("/api/v1/knowledge/ai/compose")
public class KnowledgeAiController {

    private final KnowledgeAiService service;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public KnowledgeAiController(KnowledgeAiService service, AuthenticatedUser authenticatedUser,
                                 RbacService rbac) {
        this.service = service;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @PostMapping
    public KnowledgeAiService.ComposeResult compose(@RequestParam String workspaceId,
                                                    @RequestBody Map<String, Object> body) {
        String userId = authenticatedUser.id();
        if (workspaceId == null || workspaceId.isBlank()) {
            throw ApiException.badRequest("WORKSPACE_REQUIRED", "workspaceId is required.");
        }
        rbac.require(userId, workspaceId, "view_items");
        return service.compose(workspaceId, userId, str(body, "mode"), str(body, "text"),
            str(body, "instruction"), inContext(body));
    }

    private static boolean inContext(Map<String, Object> body) {
        Object v = body == null ? null : body.get("aiInContext");
        return !(v instanceof Boolean b) || b; // default true
    }

    private static String str(Map<String, Object> body, String key) {
        Object v = body == null ? null : body.get(key);
        return v == null ? null : v.toString();
    }
}
