package com.bcits.works;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

/**
 * REST surface for the KR-030 comment digest frequency setting.
 *
 * <pre>
 * GET   /api/v1/workspaces/{workspaceId}/settings/knowledge/comment-digest
 * PATCH /api/v1/workspaces/{workspaceId}/settings/knowledge/comment-digest
 * </pre>
 *
 * This controller is deliberately thin — it parses HTTP and delegates to
 * {@link KnowledgeWorkspaceSettings}. RBAC is enforced in the service layer (RB-10 §2).
 */
@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/settings/knowledge")
public class CommentDigestController {

    private final KnowledgeWorkspaceSettings settings;
    private final AuthenticatedUser authenticatedUser;

    public CommentDigestController(KnowledgeWorkspaceSettings settings,
                                    AuthenticatedUser authenticatedUser) {
        this.settings = settings;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping("/comment-digest")
    public Map<String, String> getCommentDigest(@PathVariable String workspaceId) {
        return Map.of("frequency", settings.getCommentDigestFrequency(workspaceId));
    }

    @PatchMapping("/comment-digest")
    public Map<String, String> setCommentDigest(@PathVariable String workspaceId,
                                                 @RequestBody Map<String, String> body) {
        String userId = authenticatedUser.id();
        String freq = settings.setCommentDigestFrequency(workspaceId, userId, body.get("frequency"));
        return Map.of("frequency", freq);
    }
}
