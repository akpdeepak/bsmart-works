package com.bcits.works.knowledge;
import com.bcits.works.knowledge.api.Article;
import com.bcits.works.knowledge.api.ArticleRepository;
import com.bcits.works.knowledge.api.KnowledgeSpace;
import com.bcits.works.knowledge.api.KnowledgeSpaceRepository;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.AuthenticatedUser;
import com.bcits.works.shared.EventService;
import com.bcits.works.shared.RbacGate;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Block-level comment threads (KR-025, KR-026, KR-027).
 * Endpoints under /api/v1/articles/{articleId}/block-comments.
 */
@RestController
@RequestMapping("/api/v1/articles/{articleId}/block-comments")
public class ArticleBlockCommentController {

    private final ArticleBlockCommentRepository commentRepository;
    private final ArticleRepository articleRepository;
    private final KnowledgeSpaceRepository spaceRepository;
    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;
    private final EventService eventService;

    public ArticleBlockCommentController(ArticleBlockCommentRepository commentRepository,
                                          ArticleRepository articleRepository,
                                          KnowledgeSpaceRepository spaceRepository,
                                          AuthenticatedUser authenticatedUser,
                                          RbacGate rbac,
                                          EventService eventService) {
        this.commentRepository = commentRepository;
        this.articleRepository = articleRepository;
        this.spaceRepository = spaceRepository;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
        this.eventService = eventService;
    }

    /** List comments for a specific block (or all blocks when blockId is omitted). */
    @GetMapping
    public List<ArticleBlockComment> list(@PathVariable String articleId,
                                           @RequestParam(required = false) String blockId) {
        String wid = requireArticleWorkspace(articleId);
        if (blockId != null) {
            return commentRepository.findByArticleIdAndBlockIdAndWorkspaceId(articleId, blockId, wid);
        }
        return commentRepository.findByArticleIdAndWorkspaceId(articleId, wid);
    }

    /** Post a new comment (root or reply). */
    @PostMapping
    public ArticleBlockComment create(@PathVariable String articleId,
                                       @RequestBody Map<String, Object> body) {
        String userId = authenticatedUser.id();
        String wid = requireArticleWorkspace(articleId);

        String blockId = (String) body.get("blockId");
        String content = (String) body.get("content");
        String parentId = (String) body.get("parentId");

        if (blockId == null || blockId.isBlank()) {
            throw ApiException.badRequest("BLOCK_ID_REQUIRED", "blockId is required.", "blockId");
        }
        if (content == null || content.isBlank()) {
            throw ApiException.badRequest("CONTENT_REQUIRED", "content is required.", "content");
        }

        // KR-027: validate parentId — must be a root comment in the same article + workspace
        if (parentId != null && !parentId.isBlank()) {
            ArticleBlockComment parent = commentRepository.findByIdAndWorkspaceId(parentId, wid)
                .orElseThrow(() -> ApiException.notFound("ArticleBlockComment", parentId));
            if (parent.getParentId() != null) {
                throw ApiException.badRequest("DEPTH_EXCEEDED",
                    "Replies cannot have sub-replies (max depth 1).", "parentId");
            }
        }

        ArticleBlockComment c = new ArticleBlockComment();
        c.setId("ABC-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        c.setArticleId(articleId);
        c.setBlockId(blockId);
        c.setWorkspaceId(wid);
        c.setAuthorId(userId);
        c.setContent(content);
        c.setResolved(false);
        c.setParentId(parentId != null && !parentId.isBlank() ? parentId : null);

        // KR-026: inline selection metadata (selectionStart, selectionEnd, selectedText)
        Object meta = body.get("metadata");
        if (meta != null) {
            try {
                c.setMetadata(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(meta));
            } catch (Exception e) {
                c.setMetadata(null);
            }
        }

        c.setCreatedAt(OffsetDateTime.now());
        c.setUpdatedAt(OffsetDateTime.now());
        ArticleBlockComment saved = commentRepository.save(c);

        // KR-028: emit ARTICLE_MENTION event per @username found in the comment content.
        emitMentions(saved, wid);

        return saved;
    }

    /** Edit or resolve a comment. Only the author can edit; any workspace member can resolve. */
    @PatchMapping("/{commentId}")
    public ArticleBlockComment update(@PathVariable String articleId,
                                       @PathVariable String commentId,
                                       @RequestBody Map<String, Object> body) {
        String userId = authenticatedUser.id();
        String wid = requireArticleWorkspace(articleId);
        ArticleBlockComment c = commentRepository.findByIdAndWorkspaceId(commentId, wid)
            .orElseThrow(() -> ApiException.notFound("ArticleBlockComment", commentId));

        if (body.containsKey("content")) {
            if (!c.getAuthorId().equals(userId)) {
                throw ApiException.forbidden("Only the comment author can edit content.");
            }
            c.setContent((String) body.get("content"));
        }
        if (body.containsKey("resolved")) {
            boolean resolve = Boolean.TRUE.equals(body.get("resolved"));
            c.setResolved(resolve);
            // KR-027: resolving a root comment also resolves its replies
            if (resolve && c.getParentId() == null) {
                commentRepository.findByParentIdOrderByCreatedAtAsc(commentId)
                    .forEach(reply -> {
                        reply.setResolved(true);
                        reply.setUpdatedAt(OffsetDateTime.now());
                        commentRepository.save(reply);
                    });
            }
        }
        c.setUpdatedAt(OffsetDateTime.now());
        return commentRepository.save(c);
    }

    @DeleteMapping("/{commentId}")
    public ResponseEntity<Void> delete(@PathVariable String articleId,
                                        @PathVariable String commentId) {
        String userId = authenticatedUser.id();
        String wid = requireArticleWorkspace(articleId);
        ArticleBlockComment c = commentRepository.findByIdAndWorkspaceId(commentId, wid)
            .orElseThrow(() -> ApiException.notFound("ArticleBlockComment", commentId));
        if (!c.getAuthorId().equals(userId)) {
            throw ApiException.forbidden("Only the comment author can delete it.");
        }
        commentRepository.deleteById(commentId);
        return ResponseEntity.noContent().build();
    }

    private static final Pattern MENTION_PATTERN = Pattern.compile("@(\\w+)");

    private void emitMentions(ArticleBlockComment comment, String workspaceId) {
        Matcher m = MENTION_PATTERN.matcher(comment.getContent() == null ? "" : comment.getContent());
        while (m.find()) {
            String username = m.group(1);
            String payload = String.format("{\"articleId\":\"%s\",\"commentId\":\"%s\",\"workspaceId\":\"%s\",\"mentionedUser\":\"%s\"}",
                comment.getArticleId(), comment.getId(), workspaceId, username);
            eventService.record(comment.getArticleId(), "ARTICLE_MENTION", comment.getAuthorId(), payload);
        }
    }

    // Resolve the workspace for the article and enforce RBAC (view_items).
    private String requireArticleWorkspace(String articleId) {
        Article article = articleRepository.findById(articleId)
            .orElseThrow(() -> ApiException.notFound("Article", articleId));
        KnowledgeSpace space = spaceRepository.findById(article.getSpaceId())
            .orElseThrow(() -> ApiException.notFound("Article", articleId));
        rbac.require(authenticatedUser.id(), space.getWorkspaceId(), "view_items");
        return space.getWorkspaceId();
    }
}
