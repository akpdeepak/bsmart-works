package com.bcits.works.knowledge;
import com.bcits.works.knowledge.api.Article;
import com.bcits.works.knowledge.api.ArticleRepository;
import com.bcits.works.knowledge.api.KnowledgeSpace;
import com.bcits.works.knowledge.api.KnowledgeSpaceRepository;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.AuthenticatedUser;
import com.bcits.works.shared.RbacGate;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * KR-034 — article tags/labels.
 *
 * Workspace-scoped (RB-40 §1): all tag reads and writes are confined to the caller's workspace.
 * RBAC (RB-10 §2): mutations require edit_items; reads require view_items.
 */
@RestController
public class ArticleTagController {

    private final ArticleTagRepository tagRepository;
    private final ArticleRepository articleRepository;
    private final KnowledgeSpaceRepository spaceRepository;
    private final JdbcTemplate jdbc;
    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;

    public ArticleTagController(ArticleTagRepository tagRepository,
                                 ArticleRepository articleRepository,
                                 KnowledgeSpaceRepository spaceRepository,
                                 JdbcTemplate jdbc,
                                 AuthenticatedUser authenticatedUser,
                                 RbacGate rbac) {
        this.tagRepository = tagRepository;
        this.articleRepository = articleRepository;
        this.spaceRepository = spaceRepository;
        this.jdbc = jdbc;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    /** List all tags in a workspace. */
    @GetMapping("/api/v1/workspaces/{workspaceId}/article-tags")
    public List<ArticleTagDto> listTags(@PathVariable String workspaceId) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "view_items");
        return tagRepository.findByWorkspaceId(workspaceId).stream()
                .map(this::toDto)
                .toList();
    }

    /** Create a new tag in a workspace. */
    @PostMapping("/api/v1/workspaces/{workspaceId}/article-tags")
    public ArticleTagDto createTag(@PathVariable String workspaceId,
                                    @RequestBody Map<String, String> body) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "edit_items");
        String name = body.get("name");
        if (name == null || name.isBlank()) {
            throw ApiException.badRequest("NAME_REQUIRED", "Tag name is required.", "name");
        }
        ArticleTag tag = new ArticleTag();
        tag.setWorkspaceId(workspaceId);
        tag.setName(name.trim());
        String color = body.get("color");
        tag.setColor(color != null && !color.isBlank() ? color : "bg-neutral-200 dark:bg-neutral-700");
        return toDto(tagRepository.save(tag));
    }

    /** Delete a tag from a workspace. Cascades to all article_tag_assignments. */
    @DeleteMapping("/api/v1/workspaces/{workspaceId}/article-tags/{tagId}")
    public ResponseEntity<Void> deleteTag(@PathVariable String workspaceId,
                                           @PathVariable String tagId) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "edit_items");
        ArticleTag tag = tagRepository.findById(tagId)
                .orElseThrow(() -> ApiException.notFound("ArticleTag", tagId));
        if (!workspaceId.equals(tag.getWorkspaceId())) {
            throw ApiException.notFound("ArticleTag", tagId);
        }
        tagRepository.deleteById(tagId);
        return ResponseEntity.noContent().build();
    }

    /** Replace the full tag set on an article. Body: { tagIds: [...], workspaceId }. */
    @PutMapping("/api/v1/articles/{articleId}/tags")
    public List<ArticleTagDto> setArticleTags(@PathVariable String articleId,
                                               @RequestBody Map<String, Object> body) {
        String userId = authenticatedUser.id();
        String workspaceId = (String) body.get("workspaceId");
        if (workspaceId == null || workspaceId.isBlank()) {
            throw ApiException.badRequest("WORKSPACE_REQUIRED", "workspaceId is required.", "workspaceId");
        }
        // Workspace-scope: verify article belongs to caller's workspace.
        requireArticleInWorkspace(articleId, workspaceId, userId);
        rbac.require(userId, workspaceId, "edit_items");

        @SuppressWarnings("unchecked")
        List<String> tagIds = (List<String>) body.getOrDefault("tagIds", List.of());

        // Replace: delete all current assignments then insert new ones.
        jdbc.update("DELETE FROM article_tag_assignments WHERE article_id = ?", articleId);
        for (String tagId : tagIds) {
            // Verify tag belongs to the same workspace before assigning.
            tagRepository.findById(tagId).ifPresent(tag -> {
                if (workspaceId.equals(tag.getWorkspaceId())) {
                    jdbc.update(
                        "INSERT INTO article_tag_assignments (article_id, tag_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
                        articleId, tagId);
                }
            });
        }
        return getArticleTagsInWorkspace(articleId, workspaceId);
    }

    /** List tags on a specific article (workspace-scoped). */
    @GetMapping("/api/v1/articles/{articleId}/tags")
    public List<ArticleTagDto> getArticleTags(@PathVariable String articleId,
                                               @RequestParam String workspaceId) {
        String userId = authenticatedUser.id();
        requireArticleInWorkspace(articleId, workspaceId, userId);
        rbac.require(userId, workspaceId, "view_items");
        return getArticleTagsInWorkspace(articleId, workspaceId);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private List<ArticleTagDto> getArticleTagsInWorkspace(String articleId, String workspaceId) {
        return jdbc.query(
            "SELECT t.id, t.workspace_id, t.name, t.color " +
            "FROM article_tags t " +
            "JOIN article_tag_assignments a ON a.tag_id = t.id " +
            "WHERE a.article_id = ? AND t.workspace_id = ?",
            (rs, i) -> {
                ArticleTagDto dto = new ArticleTagDto();
                dto.setId(rs.getString("id"));
                dto.setWorkspaceId(rs.getString("workspace_id"));
                dto.setName(rs.getString("name"));
                dto.setColor(rs.getString("color"));
                return dto;
            },
            articleId, workspaceId);
    }

    /** Verify the article exists and its space belongs to the given workspace. */
    private void requireArticleInWorkspace(String articleId, String workspaceId, String userId) {
        Article article = articleRepository.findById(articleId)
                .orElseThrow(() -> ApiException.notFound("Article", articleId));
        KnowledgeSpace space = spaceRepository.findById(article.getSpaceId())
                .orElseThrow(() -> ApiException.notFound("Article", articleId));
        if (!workspaceId.equals(space.getWorkspaceId())) {
            throw ApiException.notFound("Article", articleId);
        }
        rbac.require(userId, workspaceId, "view_items");
    }

    private ArticleTagDto toDto(ArticleTag tag) {
        ArticleTagDto dto = new ArticleTagDto();
        dto.setId(tag.getId());
        dto.setWorkspaceId(tag.getWorkspaceId());
        dto.setName(tag.getName());
        dto.setColor(tag.getColor());
        return dto;
    }
}
