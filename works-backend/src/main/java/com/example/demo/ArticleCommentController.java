package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
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

    public ArticleCommentController(ArticleCommentRepository articleCommentRepository,
                                    UserRepository userRepository, EventService eventService,
                                    AuthenticatedUser authenticatedUser) {
        this.articleCommentRepository = articleCommentRepository;
        this.userRepository = userRepository;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<ArticleComment> getComments(@PathVariable String articleId) {
        List<ArticleComment> all = articleCommentRepository.findByArticleIdOrderByCreatedAtAsc(articleId);
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
        articleCommentRepository.deleteById(commentId);
        return ResponseEntity.noContent().build();
    }
}
