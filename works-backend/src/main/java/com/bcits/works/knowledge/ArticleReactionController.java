package com.bcits.works.knowledge;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.AuthenticatedUser;
import com.bcits.works.shared.RbacGate;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * KR-029 — Emoji reactions on articles.
 * POST /api/v1/articles/{articleId}/reactions  body: { emoji, workspaceId } — toggles the
 * calling user's reaction; returns the new reaction (201) or 204 when removed.
 * GET  /api/v1/articles/{articleId}/reactions?workspaceId=  — lists all reactions (tenant-scoped).
 *
 * RBAC: any workspace member (view_items) may react.  Authorisation happens here before any
 * DB access so the service layer enforces the check (RB-10 §2, RB-40 §1).
 */
@RestController
@RequestMapping("/api/v1/articles/{articleId}/reactions")
public class ArticleReactionController {

    private final ArticleReactionRepository reactionRepo;
    private final ArticleRepository articleRepository;
    private final KnowledgeSpaceRepository knowledgeSpaceRepository;
    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;

    public ArticleReactionController(ArticleReactionRepository reactionRepo,
                                     ArticleRepository articleRepository,
                                     KnowledgeSpaceRepository knowledgeSpaceRepository,
                                     AuthenticatedUser authenticatedUser,
                                     RbacGate rbac) {
        this.reactionRepo = reactionRepo;
        this.articleRepository = articleRepository;
        this.knowledgeSpaceRepository = knowledgeSpaceRepository;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    // ── Workspace-scoped access guard (RB-40 §1) ────────────────────────────
    private String requireAccess(String articleId, String workspaceId) {
        String userId = authenticatedUser.id();
        // Verify the article exists and belongs to the stated workspace.
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

    // ── GET — list reactions for an article (workspace-scoped) ──────────────
    @GetMapping
    public ResponseEntity<List<ArticleReactionDto>> list(
            @PathVariable String articleId,
            @RequestParam String workspaceId) {
        requireAccess(articleId, workspaceId);
        List<ArticleReaction> reactions =
                reactionRepo.findByArticleIdAndWorkspaceId(articleId, workspaceId);
        return ResponseEntity.ok(reactions.stream().map(this::toDto).toList());
    }

    // ── POST — toggle reaction (add if absent, remove if present) ───────────
    @PostMapping
    public ResponseEntity<ArticleReactionDto> toggle(
            @PathVariable String articleId,
            @RequestBody Map<String, String> body) {
        String workspaceId = body.get("workspaceId");
        String emoji = body.get("emoji");
        if (workspaceId == null || workspaceId.isBlank()) {
            throw ApiException.badRequest("WORKSPACE_REQUIRED", "workspaceId is required.", "workspaceId");
        }
        if (emoji == null || emoji.isBlank()) {
            throw ApiException.badRequest("EMOJI_REQUIRED", "emoji is required.", "emoji");
        }
        String userId = requireAccess(articleId, workspaceId);

        Optional<ArticleReaction> existing =
                reactionRepo.findByArticleIdAndUserIdAndEmoji(articleId, userId, emoji);
        if (existing.isPresent()) {
            reactionRepo.delete(existing.get());
            return ResponseEntity.noContent().build();
        }

        ArticleReaction reaction = new ArticleReaction();
        reaction.setArticleId(articleId);
        reaction.setWorkspaceId(workspaceId);
        reaction.setUserId(userId);
        reaction.setEmoji(emoji);
        return ResponseEntity.status(201).body(toDto(reactionRepo.save(reaction)));
    }

    // ── Mapping ─────────────────────────────────────────────────────────────
    private ArticleReactionDto toDto(ArticleReaction r) {
        ArticleReactionDto d = new ArticleReactionDto();
        d.setId(r.getId());
        d.setArticleId(r.getArticleId());
        d.setWorkspaceId(r.getWorkspaceId());
        d.setUserId(r.getUserId());
        d.setEmoji(r.getEmoji());
        d.setCreatedAt(r.getCreatedAt());
        return d;
    }
}
