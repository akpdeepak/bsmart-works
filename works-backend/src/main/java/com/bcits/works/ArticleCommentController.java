package com.bcits.works;

import org.springframework.data.domain.PageRequest;
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
import jakarta.validation.Valid;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/articles/{articleId}/comments")
public class ArticleCommentController {

    private final ArticleCommentRepository articleCommentRepository;
    private final UserRepository userRepository;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;
    private final ArticleRepository articleRepository;
    private final KnowledgeSpaceRepository knowledgeSpaceRepository;
    private final RbacService rbac;

    public ArticleCommentController(ArticleCommentRepository articleCommentRepository,
                                    UserRepository userRepository, EventService eventService,
                                    AuthenticatedUser authenticatedUser,
                                    ArticleRepository articleRepository,
                                    KnowledgeSpaceRepository knowledgeSpaceRepository,
                                    RbacService rbac) {
        this.articleCommentRepository = articleCommentRepository;
        this.userRepository = userRepository;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
        this.articleRepository = articleRepository;
        this.knowledgeSpaceRepository = knowledgeSpaceRepository;
        this.rbac = rbac;
    }

    private void requireArticleAccess(String articleId) {
        Article article = articleRepository.findById(articleId)
                .orElseThrow(() -> ApiException.notFound("Article", articleId));
        KnowledgeSpace space = knowledgeSpaceRepository.findById(article.getSpaceId())
                .orElseThrow(() -> ApiException.notFound("Article", articleId));
        rbac.require(authenticatedUser.id(), space.getWorkspaceId(), "view_items");
    }

    @GetMapping
    public List<ArticleComment> getComments(@PathVariable String articleId,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "50") int size) {
        int limit = Math.min(Math.max(size, 1), 200);
        List<ArticleComment> all = articleCommentRepository.findByArticleIdOrderByCreatedAtAsc(
                articleId, PageRequest.of(Math.max(page, 0), limit)).getContent();
        all.forEach(c -> userRepository.findById(c.getAuthorId() == null ? "" : c.getAuthorId())
                .ifPresent(u -> c.setAuthorName(u.getFullName())));
        return all;
    }

    @PostMapping
    public ArticleComment addComment(@PathVariable String articleId,
                                     @Valid @RequestBody ArticleComment comment) {
        String userId = authenticatedUser.id();
        comment.setId(null);
        comment.setArticleId(articleId);
        comment.setAuthorId(userId);
        comment.setResolved(false);
        comment.setCreatedAt(OffsetDateTime.now());
        comment.setUpdatedAt(OffsetDateTime.now());
        ArticleComment saved = articleCommentRepository.save(comment);
        userRepository.findById(userId).ifPresent(u -> saved.setAuthorName(u.getFullName()));
        eventService.record(articleId, "ARTICLE_COMMENT_ADDED", userId,
                "{\"commentId\":" + saved.getId() + "}");
        return saved;
    }

    @PutMapping("/{commentId}/resolve")
    public ArticleComment toggleResolved(@PathVariable String articleId, @PathVariable Long commentId,
                                         @RequestBody(required = false) Map<String, Object> body) {
        String userId = authenticatedUser.id();
        requireArticleAccess(articleId);
        ArticleComment comment = articleCommentRepository.findById(commentId).orElseThrow();
        boolean resolved = body != null && body.get("resolved") != null
                ? Boolean.TRUE.equals(body.get("resolved"))
                : !comment.isResolved();
        comment.setResolved(resolved);
        comment.setUpdatedAt(OffsetDateTime.now());
        ArticleComment saved = articleCommentRepository.save(comment);
        userRepository.findById(saved.getAuthorId() == null ? "" : saved.getAuthorId())
                .ifPresent(u -> saved.setAuthorName(u.getFullName()));
        eventService.record(articleId, resolved ? "ARTICLE_COMMENT_RESOLVED" : "ARTICLE_COMMENT_REOPENED",
                userId, "{\"commentId\":" + commentId + "}");
        return saved;
    }

    @DeleteMapping("/{commentId}")
    public ResponseEntity<Void> deleteComment(@PathVariable String articleId, @PathVariable Long commentId) {
        requireArticleAccess(articleId);
        articleCommentRepository.deleteById(commentId);
        return ResponseEntity.noContent().build();
    }
}
