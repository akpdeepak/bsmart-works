package com.bcits.works;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.AppEvent;

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
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import jakarta.validation.Valid;

/**
 * Thin HTTP delegate for the article API (RB-10 §2 — one job per layer).
 * All business logic, tenant scoping, and RBAC live in {@link ArticleService};
 * this controller only parses the request, calls the service, and returns the response.
 * REST contract: {@code /api/v1/articles}.
 */
@RestController
@RequestMapping("/api/v1/articles")
public class ArticleController {

    private final ArticleService articleService;
    private final AuthenticatedUser authenticatedUser;

    public ArticleController(ArticleService articleService, AuthenticatedUser authenticatedUser) {
        this.articleService = articleService;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<Article> getArticles(@RequestParam(required = false) String spaceId,
                                      @RequestParam(required = false) String query,
                                      @RequestParam(required = false) String search,
                                      @RequestParam(defaultValue = "0") int page,
                                      @RequestParam(defaultValue = "50") int size) {
        return articleService.list(spaceId, query, search, page, size, authenticatedUser.id());
    }

    // Top search terms typed into the KB — completes iteration-5 article analytics
    // (per-article views/votes/citations/stale live on /{id}/analytics; this is workspace-wide).
    @GetMapping("/analytics/search-terms")
    public List<Map<String, Object>> topSearchTerms(@RequestParam(defaultValue = "20") int limit) {
        return articleService.topSearchTerms(limit);
    }

    @GetMapping("/{id}")
    public Article getArticle(@PathVariable String id) {
        return articleService.getForRead(id, authenticatedUser.id());
    }

    /** Returns direct children of an article, for hierarchical navigation. */
    @GetMapping("/{id}/children")
    public List<Article> getChildren(@PathVariable String id) {
        return articleService.getChildren(id, authenticatedUser.id());
    }

    @GetMapping("/{id}/versions")
    public List<ArticleVersion> getVersions(@PathVariable String id,
                                            @RequestParam(defaultValue = "0") int page,
                                            @RequestParam(defaultValue = "50") int size) {
        return articleService.getVersions(id, page, size, authenticatedUser.id());
    }

    // Line-level diff between two stored versions, for the version "diff view".
    @GetMapping("/{id}/versions/{from}/diff/{to}")
    public Map<String, Object> diffVersions(@PathVariable String id,
                                            @PathVariable Integer from, @PathVariable Integer to) {
        return articleService.diffVersions(id, from, to, authenticatedUser.id());
    }

    // Restore a prior version: copies its title/content onto the article as a new
    // version (history is preserved — the restore is itself the latest version).
    @PostMapping("/{id}/versions/{versionNumber}/restore")
    public Article restoreVersion(@PathVariable String id, @PathVariable Integer versionNumber) {
        return articleService.restoreVersion(id, versionNumber, authenticatedUser.id());
    }

    @GetMapping("/{id}/links")
    public List<Map<String, Object>> getArticleLinks(@PathVariable String id) {
        return articleService.getArticleLinks(id, authenticatedUser.id());
    }

    @GetMapping("/{id}/analytics")
    public Map<String, Object> getAnalytics(@PathVariable String id) {
        return articleService.getAnalytics(id, authenticatedUser.id());
    }

    @GetMapping("/{id}/activity")
    public List<AppEvent> getActivity(@PathVariable String id) {
        return articleService.getActivity(id, authenticatedUser.id());
    }

    @PostMapping
    public Article createArticle(@Valid @RequestBody Article article) {
        return articleService.create(article, authenticatedUser.id());
    }

    // Content edits only — status changes go through the workflow endpoints so the
    // Author -> Review -> Publish gate cannot be bypassed (CLAUDE.md §5 iteration 5).
    @PutMapping("/{id}")
    public Article updateArticle(@PathVariable String id, @Valid @RequestBody Article updated) {
        return articleService.update(id, updated, authenticatedUser.id());
    }

    // ── Publishing workflow ───────────────────────────────────────────────────
    @PutMapping("/{id}/submit")
    public Article submitForReview(@PathVariable String id) {
        return articleService.applyTransition(id, "submit", authenticatedUser.id());
    }

    @PutMapping("/{id}/publish")
    public Article publish(@PathVariable String id) {
        return articleService.applyTransition(id, "publish", authenticatedUser.id());
    }

    @PutMapping("/{id}/reject")
    public Article reject(@PathVariable String id) {
        return articleService.applyTransition(id, "reject", authenticatedUser.id());
    }

    @PutMapping("/{id}/archive")
    public Article archive(@PathVariable String id) {
        return articleService.applyTransition(id, "archive", authenticatedUser.id());
    }

    @PutMapping("/{id}/restore")
    public Article restore(@PathVariable String id) {
        return articleService.applyTransition(id, "restore", authenticatedUser.id());
    }

    // ── KR-022: Duplicate article ─────────────────────────────────────────────

    /**
     * POST /api/v1/articles/{id}/duplicate?workspaceId=...
     * Creates a copy of the article as a fresh DRAFT with "(copy)" title suffix.
     * RBAC and workspace isolation are enforced in ArticleService (RB-10 §2, RB-40 §1).
     */
    @PostMapping("/{id}/duplicate")
    public Article duplicate(@PathVariable String id, @RequestParam String workspaceId) {
        return articleService.duplicate(id, authenticatedUser.id(), workspaceId);
    }

    /** Publish an already-PUBLISHED article to the customer portal KB (iteration 9, Cap N). */
    @PutMapping("/{id}/portal-publish")
    public Article portalPublish(@PathVariable String id) {
        return articleService.setPortalPublished(id, true, authenticatedUser.id());
    }

    /** Withdraw an article from the customer portal KB without un-publishing it internally. */
    @PutMapping("/{id}/portal-unpublish")
    public Article portalUnpublish(@PathVariable String id) {
        return articleService.setPortalPublished(id, false, authenticatedUser.id());
    }

    // ── KR-020: Schedule for later publish ───────────────────────────────────────
    @PostMapping("/{id}/schedule-publish")
    public Article schedulePublish(@PathVariable String id,
                                   @RequestBody Map<String, String> body) {
        String raw = body.get("scheduledAt");
        if (raw == null || raw.isBlank()) {
            throw ApiException.badRequest("SCHEDULED_AT_REQUIRED",
                    "scheduledAt is required.", "scheduledAt");
        }
        OffsetDateTime scheduledAt;
        try {
            scheduledAt = OffsetDateTime.parse(raw);
        } catch (Exception e) {
            throw ApiException.badRequest("INVALID_DATE_FORMAT",
                    "scheduledAt must be an ISO-8601 datetime with offset.", "scheduledAt");
        }
        return articleService.schedulePublish(id, authenticatedUser.id(), scheduledAt);
    }

    @PostMapping("/{id}/vote")
    public Article voteHelpful(@PathVariable String id) {
        return articleService.voteHelpful(id, authenticatedUser.id());
    }

    @PostMapping("/{id}/links")
    public Map<String, String> linkWorkItem(@PathVariable String id,
                                             @Valid @RequestBody Map<String, String> body) {
        String workItemId = body.get("workItemId");
        String linkType = body.getOrDefault("linkType", "RELATED");
        articleService.linkWorkItem(id, workItemId, linkType, authenticatedUser.id());
        return Map.of("message", "Link created");
    }

    @DeleteMapping("/{id}/links/{workItemId}")
    public ResponseEntity<Void> unlinkWorkItem(@PathVariable String id, @PathVariable String workItemId) {
        articleService.unlinkWorkItem(id, workItemId, authenticatedUser.id());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/move")
    public Article moveArticle(@PathVariable String id, @RequestBody Map<String, String> body) {
        return articleService.move(id, body.get("spaceId"), body.get("parentId"), authenticatedUser.id());
    }

    // ── KR-066: public share link ──────────────────────────────────────────────

    /**
     * Generate (or return existing) public share token for a PUBLISHED article.
     * POST /api/v1/articles/{id}/share  →  { token }
     * RBAC: edit_items (enforced in ArticleService). Only PUBLISHED articles may be publicly shared.
     */
    @PostMapping("/{id}/share")
    public Map<String, String> generateShareToken(@PathVariable String id) {
        return Map.of("token", articleService.generateShareToken(id, authenticatedUser.id()));
    }

    /**
     * Revoke the public share token for an article.
     * DELETE /api/v1/articles/{id}/share
     * RBAC: edit_items (enforced in ArticleService).
     */
    @DeleteMapping("/{id}/share")
    public ResponseEntity<Void> revokeShareToken(@PathVariable String id) {
        articleService.revokeShareToken(id, authenticatedUser.id());
        return ResponseEntity.noContent().build();
    }

    // ── KR-038: bulk operations ────────────────────────────────────────────────

    /**
     * Bulk-archive a list of articles.
     * POST /api/v1/articles/bulk-archive  body: { ids: [string], workspaceId: string }
     * RBAC: edit_items (enforced in ArticleService).
     */
    @PostMapping("/bulk-archive")
    public Map<String, Object> bulkArchive(@RequestBody Map<String, Object> body) {
        String workspaceId = (String) body.get("workspaceId");
        @SuppressWarnings("unchecked")
        List<String> ids = (List<String>) body.get("ids");
        if (workspaceId == null || workspaceId.isBlank()) {
            throw ApiException.badRequest("WORKSPACE_REQUIRED", "workspaceId is required.", "workspaceId");
        }
        if (ids == null || ids.isEmpty()) {
            return Map.of("processed", List.of(), "skipped", List.of());
        }
        ArticleService.BulkResult result = articleService.bulkArchive(ids, authenticatedUser.id(), workspaceId);
        return Map.of("processed", result.processed(), "skipped", result.skipped());
    }

    /**
     * Bulk-delete a list of articles.
     * POST /api/v1/articles/bulk-delete  body: { ids: [string], workspaceId: string }
     * RBAC: delete_items (enforced in ArticleService).
     */
    @PostMapping("/bulk-delete")
    public Map<String, Object> bulkDelete(@RequestBody Map<String, Object> body) {
        String workspaceId = (String) body.get("workspaceId");
        @SuppressWarnings("unchecked")
        List<String> ids = (List<String>) body.get("ids");
        if (workspaceId == null || workspaceId.isBlank()) {
            throw ApiException.badRequest("WORKSPACE_REQUIRED", "workspaceId is required.", "workspaceId");
        }
        if (ids == null || ids.isEmpty()) {
            return Map.of("processed", List.of(), "skipped", List.of());
        }
        ArticleService.BulkResult result = articleService.bulkDelete(ids, authenticatedUser.id(), workspaceId);
        return Map.of("processed", result.processed(), "skipped", result.skipped());
    }

    /**
     * Bulk-publish a list of articles (workflow shortcut for managers).
     * POST /api/v1/articles/bulk-publish  body: { ids: [string], workspaceId: string }
     * RBAC: approve_items (enforced in ArticleService). Articles not in IN_REVIEW are skipped.
     */
    @PostMapping("/bulk-publish")
    public Map<String, Object> bulkPublish(@RequestBody Map<String, Object> body) {
        String workspaceId = (String) body.get("workspaceId");
        @SuppressWarnings("unchecked")
        List<String> ids = (List<String>) body.get("ids");
        if (workspaceId == null || workspaceId.isBlank()) {
            throw ApiException.badRequest("WORKSPACE_REQUIRED", "workspaceId is required.", "workspaceId");
        }
        ArticleService.BulkResult result =
                articleService.bulkPublish(ids == null ? List.of() : ids, authenticatedUser.id(), workspaceId);
        return Map.of("processed", result.processed(), "skipped", result.skipped());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteArticle(@PathVariable String id) {
        articleService.delete(id, authenticatedUser.id());
        return ResponseEntity.noContent().build();
    }
}
