package com.example.demo;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

/**
 * The two AI surfaces of iteration 10 (Cap O): natural language → BQL (I10-S12) and summarization
 * (I10-S13). Both flow through the single {@link AiOrchestrationService} — no model is called on its
 * own terms (RB-40 §2). Reads require workspace membership ({@code view_items}); RBAC lives here at
 * the service boundary, never the UI. Confirmation-first (I10-S02): NL→BQL returns a <b>preview</b>
 * with a plan and never mutates — the client runs the previewed BQL through the existing executor on
 * Confirm.
 */
@RestController
@RequestMapping("/api/v1/ai")
public class AiOrchestrationController {

    private final AiOrchestrationService orchestration;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public AiOrchestrationController(AiOrchestrationService orchestration,
                                     AuthenticatedUser authenticatedUser, RbacService rbac) {
        this.orchestration = orchestration;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @PostMapping("/nl-to-bql")
    public AiOrchestrationService.AiResponse nlToBql(@Valid @RequestBody Map<String, Object> body) {
        String workspaceId = str(body, "workspaceId");
        requireWorkspace(workspaceId);
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "view_items");
        return orchestration.nlToBql(workspaceId, userId, str(body, "phrase"), optOut(body));
    }

    @PostMapping("/summarize")
    public AiOrchestrationService.AiResponse summarize(@Valid @RequestBody Map<String, Object> body) {
        String workspaceId = str(body, "workspaceId");
        requireWorkspace(workspaceId);
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "view_items");
        return orchestration.summarize(workspaceId, userId, str(body, "text"), optOut(body));
    }

    private void requireWorkspace(String workspaceId) {
        if (workspaceId == null || workspaceId.isBlank()) {
            throw ApiException.badRequest("WORKSPACE_REQUIRED", "workspaceId is required.");
        }
    }

    private String str(Map<String, Object> body, String key) {
        Object v = body.get(key);
        return v == null ? "" : v.toString();
    }

    private boolean optOut(Map<String, Object> body) {
        return Boolean.TRUE.equals(body.get("contextOptOut"));
    }
}
