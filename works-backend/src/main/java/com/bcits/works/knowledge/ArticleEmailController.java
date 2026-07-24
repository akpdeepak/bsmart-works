package com.bcits.works.knowledge;
import com.bcits.works.knowledge.api.Article;
import com.bcits.works.knowledge.api.ArticleRepository;
import com.bcits.works.knowledge.api.KnowledgeSpace;
import com.bcits.works.knowledge.api.KnowledgeSpaceRepository;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.AuthenticatedUser;
import com.bcits.works.shared.EventService;
import com.bcits.works.shared.RbacGate;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/v1/articles")
public class ArticleEmailController {

    private static final int MAX_RECIPIENTS = 10;
    private static final Pattern EMAIL_PATTERN =
        Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    private final ArticleRepository articleRepository;
    private final KnowledgeSpaceRepository knowledgeSpaceRepository;
    private final ArticleEmailService emailService;
    private final RbacGate rbacService;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;

    public ArticleEmailController(
            ArticleRepository articleRepository,
            KnowledgeSpaceRepository knowledgeSpaceRepository,
            ArticleEmailService emailService,
            RbacGate rbacService,
            EventService eventService,
            AuthenticatedUser authenticatedUser) {
        this.articleRepository = articleRepository;
        this.knowledgeSpaceRepository = knowledgeSpaceRepository;
        this.emailService = emailService;
        this.rbacService = rbacService;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
    }

    /** POST /api/v1/articles/{id}/send-email — send an article by email. */
    @PostMapping("/{id}/send-email")
    public ResponseEntity<Map<String, Object>> sendEmail(
            @PathVariable String id,
            @Valid @RequestBody SendEmailRequest body) {

        String userId = authenticatedUser.id();

        // Load article — 404 if not found
        Article article = articleRepository.findById(id)
            .orElseThrow(() -> ApiException.notFound("Article", id));

        // Workspace-scoped: resolve workspace via space (RB-40 §1)
        KnowledgeSpace space = knowledgeSpaceRepository.findById(article.getSpaceId())
            .orElseThrow(() -> ApiException.notFound("Article", id)); // 404 not 403

        String workspaceId = space.getWorkspaceId();

        // RBAC check (consistent with requireArticleAccess pattern in ArticleController)
        rbacService.require(userId, workspaceId, "view_items");

        // Validate recipients
        List<String> recipients = body.getRecipients();
        if (recipients == null || recipients.isEmpty()) {
            throw ApiException.badRequest("RECIPIENTS_REQUIRED",
                "At least one recipient is required.", "recipients");
        }
        if (recipients.size() > MAX_RECIPIENTS) {
            throw ApiException.badRequest("TOO_MANY_RECIPIENTS",
                "Maximum " + MAX_RECIPIENTS + " recipients allowed.", "recipients");
        }
        for (String r : recipients) {
            if (r == null || !EMAIL_PATTERN.matcher(r.trim()).matches()) {
                throw ApiException.badRequest("INVALID_EMAIL",
                    "Invalid email address: " + r, "recipients");
            }
        }

        String subject = body.getSubject() != null && !body.getSubject().isBlank()
            ? body.getSubject()
            : (article.getTitle() != null ? article.getTitle() : "An article from bSmart Works");

        // Send
        emailService.send(article, recipients, subject, body.getMessage());

        // Audit event (workspace-scoped, RB-40 §1)
        eventService.recordInWorkspace(workspaceId, id, "ARTICLE_EMAILED", userId,
            Map.of("recipientCount", recipients.size(), "subject", subject));

        return ResponseEntity.ok(Map.of(
            "sent", true,
            "recipientCount", recipients.size()
        ));
    }

    /** Request DTO for the send-email endpoint. */
    public static class SendEmailRequest {
        @NotNull
        @Size(min = 1, max = 10)
        private List<String> recipients;
        private String subject;
        @Size(max = 500)
        private String message;

        public List<String> getRecipients() { return recipients; }
        public void setRecipients(List<String> recipients) { this.recipients = recipients; }
        public String getSubject() { return subject; }
        public void setSubject(String subject) { this.subject = subject; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
    }
}
