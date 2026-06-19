package com.bcits.works;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Article-level presence signalling (KR-065 — real-time presence indicators in Know Studio).
 *
 * <p>{@code POST /api/v1/articles/{id}/presence?workspaceId=…}
 * body: {@code { "action": "join"|"leave", "cursorX": 50.0, "cursorY": 25.0 }}
 * (action is optional; defaults to "join")
 *
 * <p>On <b>join</b>: upserts the caller into {@link ArticlePresenceStore} and broadcasts a
 * {@code PRESENCE_UPDATE} SSE event to all clients subscribed to the workspace. Returns the
 * current viewer list so the client can hydrate immediately.
 *
 * <p>On <b>leave</b>: removes the caller and broadcasts the trimmed list.
 *
 * <p><b>Workspace scoping (RB-40 §1):</b> the article's owning workspace is resolved from the
 * database (article → space → workspace). A caller cannot join presence for an article in a
 * different tenant even if they supply a valid workspaceId that happens to belong to them.
 *
 * <p><b>RBAC (RB-10 §2):</b> enforced in this controller via {@link RbacService}; {@code view_items}
 * on the article's workspace is the minimum gate.
 */
@RestController
@RequestMapping("/api/v1/articles/{id}/presence")
public class ArticlePresenceController {

    private final ArticlePresenceStore store;
    private final ArticleRepository articleRepository;
    private final KnowledgeSpaceRepository knowledgeSpaceRepository;
    private final UserRepository userRepository;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public ArticlePresenceController(ArticlePresenceStore store,
                                     ArticleRepository articleRepository,
                                     KnowledgeSpaceRepository knowledgeSpaceRepository,
                                     UserRepository userRepository,
                                     AuthenticatedUser authenticatedUser,
                                     RbacService rbac) {
        this.store = store;
        this.articleRepository = articleRepository;
        this.knowledgeSpaceRepository = knowledgeSpaceRepository;
        this.userRepository = userRepository;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    public record PresenceRequest(String action, Double cursorX, Double cursorY) { }

    public record PresenceResponse(List<ArticlePresenceStore.PresenceRecord> presences) { }

    @PostMapping
    public PresenceResponse signal(@PathVariable("id") String articleId,
                                   @RequestParam String workspaceId,
                                   @RequestBody(required = false) PresenceRequest body) {
        String userId = authenticatedUser.id();

        // Resolve the article and verify it belongs to the declared workspace (RB-40 §1).
        Article article = articleRepository.findById(articleId)
                .orElseThrow(() -> ApiException.notFound("Article", articleId));
        KnowledgeSpace space = knowledgeSpaceRepository.findById(article.getSpaceId())
                .orElseThrow(() -> ApiException.notFound("Article", articleId));

        // Cross-tenant guard: supplied workspaceId must match the article's owning workspace.
        if (!space.getWorkspaceId().equals(workspaceId)) {
            throw ApiException.notFound("Article", articleId);
        }

        // RBAC: caller must be a workspace member with view access.
        rbac.require(userId, workspaceId, "view_items");

        String action = (body == null || body.action() == null) ? "join" : body.action();

        if ("leave".equalsIgnoreCase(action)) {
            store.remove(articleId, workspaceId, userId);
            return new PresenceResponse(store.getPresences(articleId));
        }

        // Default / "join": upsert the caller's presence record.
        String displayName = userRepository.findById(userId)
                .map(User::getFullName)
                .orElse("Unknown");
        String initial = (displayName != null && !displayName.isBlank())
                ? displayName.substring(0, 1).toUpperCase()
                : "?";

        ArticlePresenceStore.PresenceRecord record =
                new ArticlePresenceStore.PresenceRecord(
                        userId, displayName, initial, body == null ? null : body.cursorX(),
                        body == null ? null : body.cursorY(), Instant.now());

        List<ArticlePresenceStore.PresenceRecord> presences =
                store.upsert(articleId, workspaceId, record);

        return new PresenceResponse(presences);
    }

    private static String str(Map<String, Object> m, String key) {
        Object v = m == null ? null : m.get(key);
        return v == null ? null : v.toString();
    }
}
