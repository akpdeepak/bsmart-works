package com.bcits.works;

import com.bcits.works.shared.ApiException;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * KR-019 — Article approval workflow endpoints.
 *
 * POST /api/v1/articles/{id}/approvals  — submit APPROVED or CHANGES_REQUESTED
 * GET  /api/v1/articles/{id}/approvals  — list all approvals for the article
 *
 * RBAC (in ArticleService, RB-10 §2):
 *   GET  requires view_items.
 *   POST requires update_items; author cannot approve own article.
 *
 * Workspace scope (RB-40 §1): the article's space is resolved to a workspace and verified
 * on every request; a missing or cross-tenant article is returned as 404.
 */
@RestController
@RequestMapping("/api/v1/articles")
public class ArticleApprovalController {

    private final ArticleRepository articleRepository;
    private final KnowledgeSpaceRepository knowledgeSpaceRepository;
    private final ArticleApprovalRepository approvalRepository;
    private final ArticleService articleService;
    private final RbacService rbac;
    private final AuthenticatedUser authenticatedUser;

    public ArticleApprovalController(ArticleRepository articleRepository,
                                     KnowledgeSpaceRepository knowledgeSpaceRepository,
                                     ArticleApprovalRepository approvalRepository,
                                     ArticleService articleService,
                                     RbacService rbac,
                                     AuthenticatedUser authenticatedUser) {
        this.articleRepository = articleRepository;
        this.knowledgeSpaceRepository = knowledgeSpaceRepository;
        this.approvalRepository = approvalRepository;
        this.articleService = articleService;
        this.rbac = rbac;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping("/{id}/approvals")
    public List<ArticleApproval> listApprovals(@PathVariable String id) {
        String userId = authenticatedUser.id();
        String workspaceId = resolveWorkspaceId(id);
        rbac.require(userId, workspaceId, "view_items");
        return approvalRepository.findByArticleIdAndWorkspaceId(id, workspaceId);
    }

    @PostMapping("/{id}/approvals")
    public ArticleApproval submitApproval(@PathVariable String id,
                                          @RequestBody Map<String, String> body) {
        String userId = authenticatedUser.id();
        String workspaceId = resolveWorkspaceId(id);
        String decision = body.get("decision");
        String comment = body.get("comment");
        if (decision == null || decision.isBlank()) {
            throw ApiException.badRequest("DECISION_REQUIRED", "decision is required.", "decision");
        }
        // RBAC + author-cannot-approve-own enforced inside ArticleService (RB-10 §2)
        return articleService.approveArticle(id, userId, workspaceId, decision, comment);
    }

    /**
     * Resolves workspaceId from the article's space.
     * Returns 404 if the article or space is unknown — never leaks cross-tenant existence.
     */
    private String resolveWorkspaceId(String articleId) {
        Article article = articleRepository.findById(articleId)
                .orElseThrow(() -> ApiException.notFound("Article", articleId));
        KnowledgeSpace space = knowledgeSpaceRepository.findById(article.getSpaceId())
                .orElseThrow(() -> ApiException.notFound("Article", articleId));
        return space.getWorkspaceId();
    }
}
