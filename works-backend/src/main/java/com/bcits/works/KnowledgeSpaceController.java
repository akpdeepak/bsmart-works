package com.bcits.works;

import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/knowledge-spaces")
public class KnowledgeSpaceController {

    private final KnowledgeSpaceRepository knowledgeSpaceRepository;
    private final ArticleRepository articleRepository;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public KnowledgeSpaceController(KnowledgeSpaceRepository knowledgeSpaceRepository,
                                     ArticleRepository articleRepository,
                                     EventService eventService, AuthenticatedUser authenticatedUser,
                                     RbacService rbac) {
        this.knowledgeSpaceRepository = knowledgeSpaceRepository;
        this.articleRepository = articleRepository;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping
    public List<KnowledgeSpace> getSpaces(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        int limit = Math.min(Math.max(size, 1), 200);
        // Workspace-scoped (RB-40 §1): only spaces in the caller's workspaces, never every tenant's.
        return knowledgeSpaceRepository.findAllScopedToUser(authenticatedUser.id(),
                PageRequest.of(Math.max(page, 0), limit)).getContent();
    }

    @GetMapping("/{id}")
    public KnowledgeSpace getSpace(@PathVariable String id) {
        KnowledgeSpace space = knowledgeSpaceRepository.findById(id).orElseThrow();
        rbac.require(authenticatedUser.id(), space.getWorkspaceId(), "view_items");
        return space;
    }

    @GetMapping("/{id}/articles")
    public List<Article> getSpaceArticles(@PathVariable String id,
                                           @RequestParam(required = false) String status,
                                           @RequestParam(defaultValue = "0") int page,
                                           @RequestParam(defaultValue = "50") int size) {
        // Workspace-scoped (RB-40 §1): resolve the space and require membership before listing.
        KnowledgeSpace space = knowledgeSpaceRepository.findById(id).orElseThrow();
        rbac.require(authenticatedUser.id(), space.getWorkspaceId(), "view_items");
        int limit = Math.min(Math.max(size, 1), 200);
        PageRequest pr = PageRequest.of(Math.max(page, 0), limit);
        return status != null
            ? articleRepository.findBySpaceIdAndStatusOrderByUpdatedAtDesc(id, status, pr).getContent()
            : articleRepository.findBySpaceIdOrderByUpdatedAtDesc(id, pr).getContent();
    }

    /** KR-033: returns a depth-limited (4) article tree for the given space (KR-033). */
    @GetMapping("/{id}/tree")
    public List<ArticleTreeNode> getSpaceTree(@PathVariable String id) {
        KnowledgeSpace space = knowledgeSpaceRepository.findById(id).orElseThrow();
        rbac.require(authenticatedUser.id(), space.getWorkspaceId(), "view_items");
        List<Article> all = articleRepository.findBySpaceIdOrderByUpdatedAtDesc(id);
        return buildTree(all, null, 0);
    }

    private List<ArticleTreeNode> buildTree(List<Article> all, String parentId, int depth) {
        if (depth >= 4) return List.of();
        return all.stream()
            .filter(a -> parentId == null ? a.getParentId() == null : parentId.equals(a.getParentId()))
            .sorted(Comparator.comparingInt(a -> a.getSortOrder() != null ? a.getSortOrder() : 0))
            .map(a -> {
                ArticleTreeNode node = new ArticleTreeNode();
                node.setId(a.getId());
                node.setTitle(a.getTitle());
                node.setStatus(a.getStatus());
                node.setIcon(a.getIcon());
                node.setParentId(a.getParentId());
                node.setSortOrder(a.getSortOrder());
                node.setTemplateType(a.getTemplateType());
                node.setChildren(buildTree(all, a.getId(), depth + 1));
                return node;
            }).collect(Collectors.toList());
    }

    @PostMapping
    public KnowledgeSpace createSpace(@Valid @RequestBody KnowledgeSpace space) {
        String userId = authenticatedUser.id();
        space.setId("KS-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        space.setVisibility(space.getVisibility() != null ? space.getVisibility() : "TEAM");
        space.setIcon(space.getIcon() != null ? space.getIcon() : "book");
        space.setCreatedBy(userId);
        space.setCreatedAt(OffsetDateTime.now());
        space.setUpdatedAt(OffsetDateTime.now());
        KnowledgeSpace saved = knowledgeSpaceRepository.save(space);
        eventService.record(saved.getId(), "KNOWLEDGE_SPACE_CREATED", userId, "{\"name\":\"" + saved.getName() + "\"}");
        return saved;
    }

    @PutMapping("/{id}")
    public KnowledgeSpace updateSpace(@PathVariable String id, @Valid @RequestBody KnowledgeSpace updated) {
        String userId = authenticatedUser.id();
        KnowledgeSpace existing = knowledgeSpaceRepository.findById(id).orElseThrow();
        rbac.require(userId, existing.getWorkspaceId(), "view_items");
        return knowledgeSpaceRepository.findById(id).map(s -> {
            s.setName(updated.getName());
            s.setDescription(updated.getDescription());
            s.setIcon(updated.getIcon());
            s.setVisibility(updated.getVisibility());
            s.setUpdatedAt(OffsetDateTime.now());
            return knowledgeSpaceRepository.save(s);
        }).orElseThrow();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSpace(@PathVariable String id) {
        KnowledgeSpace existing = knowledgeSpaceRepository.findById(id).orElseThrow();
        rbac.require(authenticatedUser.id(), existing.getWorkspaceId(), "view_items");
        knowledgeSpaceRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * KR-037: set or clear the home article for a space.
     * PATCH /api/v1/knowledge-spaces/{id}/home-article
     * Body: { "articleId": "ART-..." }  (null or empty to clear)
     * RBAC: manage_projects.
     */
    @PatchMapping("/{id}/home-article")
    public KnowledgeSpace setHomeArticle(@PathVariable String id,
                                          @RequestBody Map<String, String> body) {
        String userId = authenticatedUser.id();
        KnowledgeSpace space = knowledgeSpaceRepository.findById(id).orElseThrow();
        rbac.require(userId, space.getWorkspaceId(), "manage_projects");
        String articleId = body.get("articleId");
        // Validate that the article belongs to this space (cross-space hijack prevention).
        if (articleId != null && !articleId.isBlank()) {
            Article article = articleRepository.findById(articleId)
                    .orElseThrow(() -> ApiException.notFound("Article", articleId));
            if (!id.equals(article.getSpaceId())) {
                throw ApiException.badRequest("ARTICLE_NOT_IN_SPACE",
                        "The article does not belong to this space.", "articleId");
            }
        }
        space.setHomeArticleId(articleId == null || articleId.isBlank() ? null : articleId);
        space.setUpdatedAt(OffsetDateTime.now());
        KnowledgeSpace saved = knowledgeSpaceRepository.save(space);
        eventService.record(id, "SPACE_HOME_ARTICLE_SET", userId,
                "{\"articleId\":\"" + (articleId == null ? "null" : articleId) + "\"}");
        return saved;
    }
}
