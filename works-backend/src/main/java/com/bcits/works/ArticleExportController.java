package com.bcits.works;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * KR-081 / KR-082: Server-side export of a Know Studio article to PDF and DOCX.
 *
 * <p><b>Tenant isolation + RBAC (RB-40 §1, RB-10 §2).</b>
 * The article is loaded via {@link ArticleRepository} and workspace-scoped by verifying
 * that the article's parent {@link KnowledgeSpace} belongs to the supplied
 * {@code workspaceId}. A cross-workspace caller receives 404 (same as "not found")
 * to avoid data-existence leakage. RBAC ({@code view_items}) is checked in the
 * service layer before any content is read.
 *
 * <p>No AI, no schema changes (KR-081/KR-082 are pure read-only exports).
 */
@RestController
@RequestMapping("/api/v1/articles")
public class ArticleExportController {

    private static final String DOCX_MEDIA_TYPE =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    private final ArticleRepository articleRepository;
    private final KnowledgeSpaceRepository spaceRepository;
    private final ArticlePdfExporter pdfExporter;
    private final ArticleDocxSerializer docxSerializer;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public ArticleExportController(ArticleRepository articleRepository,
                                    KnowledgeSpaceRepository spaceRepository,
                                    ArticlePdfExporter pdfExporter,
                                    ArticleDocxSerializer docxSerializer,
                                    AuthenticatedUser authenticatedUser,
                                    RbacService rbac) {
        this.articleRepository = articleRepository;
        this.spaceRepository = spaceRepository;
        this.pdfExporter = pdfExporter;
        this.docxSerializer = docxSerializer;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    // ── KR-081: PDF export ──────────────────────────────────────────────────

    @GetMapping("/{id}/export/pdf")
    public ResponseEntity<byte[]> exportPdf(@PathVariable String id,
                                             @RequestParam String workspaceId) throws Exception {
        Article article = loadScopedArticle(id, workspaceId);
        byte[] pdf = pdfExporter.export(article.getTitle(), article.getContentBlocks());
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"" + safeFilename(article.getTitle()) + ".pdf\"")
            .body(pdf);
    }

    // ── KR-082: DOCX export ─────────────────────────────────────────────────

    @GetMapping("/{id}/export/docx")
    public ResponseEntity<byte[]> exportDocx(@PathVariable String id,
                                              @RequestParam String workspaceId) throws Exception {
        Article article = loadScopedArticle(id, workspaceId);
        byte[] docx = docxSerializer.serialize(article.getTitle(), article.getContentBlocks());
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(DOCX_MEDIA_TYPE))
            .header(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"" + safeFilename(article.getTitle()) + ".docx\"")
            .body(docx);
    }

    // ── Shared helpers ───────────────────────────────────────────────────────

    /**
     * Load the article and verify it belongs to {@code workspaceId}.
     * RBAC ({@code view_items}) is enforced before the DB read (RB-10 §2).
     * Cross-tenant callers get 404, not 403, to avoid data-existence leakage (RB-40 §1).
     */
    private Article loadScopedArticle(String id, String workspaceId) {
        // RBAC first — a non-member must not learn that an article id even exists
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");

        Article article = articleRepository.findById(id)
            .orElseThrow(() -> ApiException.notFound("Article", id));

        // Workspace scope: the article's space must belong to the caller's workspace
        KnowledgeSpace space = spaceRepository.findById(article.getSpaceId())
            .orElseThrow(() -> ApiException.notFound("Article", id));
        if (!workspaceId.equals(space.getWorkspaceId())) {
            throw ApiException.notFound("Article", id);
        }

        return article;
    }

    /** Strip characters that are unsafe in HTTP Content-Disposition filenames. */
    private static String safeFilename(String title) {
        String base = title == null ? "article" : title;
        String sanitised = base.replaceAll("[^a-zA-Z0-9 _\\-]", "").trim();
        return sanitised.isBlank() ? "article" : sanitised;
    }
}
