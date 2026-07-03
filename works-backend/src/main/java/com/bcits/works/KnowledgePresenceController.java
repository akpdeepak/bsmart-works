package com.bcits.works;

import com.bcits.works.shared.ApiException;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/v1/knowledge")
public class KnowledgePresenceController {

    private final ArticlePresenceStore presenceStore;
    private final ArticleRepository articleRepository;
    private final KnowledgeSpaceRepository knowledgeSpaceRepository;
    private final UserRepository userRepository;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;
    private final Map<String, LockRecord> locks = new ConcurrentHashMap<>();

    public KnowledgePresenceController(ArticlePresenceStore presenceStore,
                                       ArticleRepository articleRepository,
                                       KnowledgeSpaceRepository knowledgeSpaceRepository,
                                       UserRepository userRepository,
                                       AuthenticatedUser authenticatedUser,
                                       RbacService rbac) {
        this.presenceStore = presenceStore;
        this.articleRepository = articleRepository;
        this.knowledgeSpaceRepository = knowledgeSpaceRepository;
        this.userRepository = userRepository;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    public record PresenceRequest(String workspaceId, String articleId, String userId,
                                  Double cursorX, Double cursorY) { }

    public record EditLockRequest(String workspaceId, String articleId, String userId) { }

    public record EditLockResponse(boolean granted, String lockedBy) { }

    private record LockRecord(String userId, String displayName, Instant updatedAt) { }

    @PostMapping("/presence/heartbeat")
    public Object heartbeat(@Valid @RequestBody PresenceRequest request) {
        String userId = requireArticleAccess(request.workspaceId(), request.articleId());
        String displayName = displayName(userId);
        String initial = (displayName == null || displayName.isBlank()) ? "?" : displayName.substring(0, 1).toUpperCase();
        return presenceStore.upsert(request.articleId(), request.workspaceId(),
                new ArticlePresenceStore.PresenceRecord(
                        userId, displayName, initial, request.cursorX(), request.cursorY(), Instant.now()));
    }

    @PostMapping("/presence/leave")
    public void leave(@Valid @RequestBody PresenceRequest request) {
        String userId = requireArticleAccess(request.workspaceId(), request.articleId());
        presenceStore.remove(request.articleId(), request.workspaceId(), userId);
    }

    @PostMapping("/edit-lock")
    public EditLockResponse requestEditLock(@Valid @RequestBody EditLockRequest request) {
        String userId = requireArticleAccess(request.workspaceId(), request.articleId());
        LockRecord current = locks.get(request.articleId());
        if (current != null && !current.userId().equals(userId)) {
            return new EditLockResponse(false, current.displayName());
        }
        LockRecord mine = new LockRecord(userId, displayName(userId), Instant.now());
        locks.put(request.articleId(), mine);
        return new EditLockResponse(true, null);
    }

    @PostMapping("/edit-lock/release")
    public void releaseEditLock(@Valid @RequestBody EditLockRequest request) {
        String userId = requireArticleAccess(request.workspaceId(), request.articleId());
        locks.computeIfPresent(request.articleId(), (ignored, current) ->
                current.userId().equals(userId) ? null : current);
    }

    private String requireArticleAccess(String workspaceId, String articleId) {
        String userId = authenticatedUser.id();
        Article article = articleRepository.findById(articleId)
                .orElseThrow(() -> ApiException.notFound("Article", articleId));
        KnowledgeSpace space = knowledgeSpaceRepository.findById(article.getSpaceId())
                .orElseThrow(() -> ApiException.notFound("Article", articleId));
        if (!space.getWorkspaceId().equals(workspaceId)) {
            throw ApiException.notFound("Article", articleId);
        }
        rbac.require(userId, workspaceId, "view_items");
        return userId;
    }

    private String displayName(String userId) {
        return userRepository.findById(userId).map(User::getFullName).orElse("Unknown");
    }
}
