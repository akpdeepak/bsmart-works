package com.bcits.works.knowledge;
import com.bcits.works.knowledge.api.KnowledgeSpace;
import com.bcits.works.knowledge.api.KnowledgeSpaceRepository;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.AuthenticatedUser;
import com.bcits.works.shared.RbacGate;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Space follow / subscribe endpoints (KR-068).
 *
 * <p>POST /api/v1/knowledge-spaces/{id}/follow  — toggle follow
 * <p>GET  /api/v1/knowledge-spaces/{id}/follow  — returns { following: bool, followerCount: int }
 *
 * <p>RBAC: view_items is sufficient to follow a space.
 * Workspace-scoping: the space's workspaceId is resolved and RBAC is checked before any mutation.
 */
@RestController
@RequestMapping("/api/v1/knowledge-spaces")
public class SpaceFollowerController {

    private final KnowledgeSpaceRepository knowledgeSpaceRepository;
    private final SpaceFollowerService followerService;
    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;

    public SpaceFollowerController(KnowledgeSpaceRepository knowledgeSpaceRepository,
                                    SpaceFollowerService followerService,
                                    AuthenticatedUser authenticatedUser,
                                    RbacGate rbac) {
        this.knowledgeSpaceRepository = knowledgeSpaceRepository;
        this.followerService = followerService;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    /** Toggle follow on/off. Returns { following, followerCount }. */
    @PostMapping("/{id}/follow")
    public Map<String, Object> toggleFollow(@PathVariable String id) {
        String userId = authenticatedUser.id();
        String workspaceId = requireSpaceAccess(id, userId);
        return followerService.toggle(userId, id, workspaceId);
    }

    /** Returns { following, followerCount } for the current user. */
    @GetMapping("/{id}/follow")
    public Map<String, Object> getFollowStatus(@PathVariable String id) {
        String userId = authenticatedUser.id();
        requireSpaceAccess(id, userId);
        return followerService.getStatus(userId, id);
    }

    // ── private helpers ───────────────────────────────────────────────────────

    /**
     * Verifies the space exists and the caller belongs to its workspace.
     * Returns the workspaceId for use in subsequent service calls.
     */
    private String requireSpaceAccess(String spaceId, String userId) {
        KnowledgeSpace space = knowledgeSpaceRepository.findById(spaceId)
                .orElseThrow(() -> ApiException.notFound("KnowledgeSpace", spaceId));
        rbac.require(userId, space.getWorkspaceId(), "view_items");
        return space.getWorkspaceId();
    }
}
