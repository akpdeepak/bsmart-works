package com.bcits.works.ai;
import com.bcits.works.workspaces.api.Workspace;
import com.bcits.works.ai.api.AiControlPlaneService;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.AuthenticatedUser;
import com.bcits.works.shared.RbacGate;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Structured data extraction (iteration-20 Cap I, Advanced Knowledge). Workspace-scoped (RB-40 §1) and
 * RBAC-gated at the boundary (RB-10 §2): any workspace member ({@code view_items}) may run an extraction.
 * Scope / budget / cache / audit and the deterministic fallback are applied centrally by
 * {@link AiControlPlaneService} via {@link StructuredExtractionService}.
 */
@RestController
@RequestMapping("/api/v1/knowledge/extract")
public class StructuredExtractionController {

    private final StructuredExtractionService service;
    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;

    public StructuredExtractionController(StructuredExtractionService service,
                                          AuthenticatedUser authenticatedUser, RbacGate rbac) {
        this.service = service;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @PostMapping
    public StructuredExtractionService.ExtractionResult extract(@RequestParam String workspaceId,
                                                                @RequestBody Map<String, Object> body) {
        String userId = authenticatedUser.id();
        if (workspaceId == null || workspaceId.isBlank()) {
            throw ApiException.badRequest("WORKSPACE_REQUIRED", "workspaceId is required.");
        }
        rbac.require(userId, workspaceId, "view_items");
        String text = str(body, "text");
        return service.extract(workspaceId, userId, text, inContext(body));
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
