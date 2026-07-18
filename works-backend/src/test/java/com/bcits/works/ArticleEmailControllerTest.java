package com.bcits.works;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;
import com.bcits.works.knowledge.Article;
import com.bcits.works.knowledge.ArticleEmailController;
import com.bcits.works.knowledge.ArticleEmailService;
import com.bcits.works.knowledge.ArticleRepository;
import com.bcits.works.knowledge.KnowledgeSpace;
import com.bcits.works.knowledge.KnowledgeSpaceRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.ResponseEntity;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@Tag("unit")
class ArticleEmailControllerTest {

    @Mock ArticleRepository articleRepository;
    @Mock KnowledgeSpaceRepository knowledgeSpaceRepository;
    @Mock ArticleEmailService emailService;
    @Mock RbacService rbacService;
    @Mock EventService eventService;
    @Mock AuthenticatedUser authenticatedUser;

    ArticleEmailController controller;

    private static final String ARTICLE_ID = "ART-001";
    private static final String SPACE_ID = "SPC-001";
    private static final String WS_ID = "WS-001";
    private static final String USER_ID = "USR-001";

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new ArticleEmailController(
            articleRepository, knowledgeSpaceRepository, emailService,
            rbacService, eventService, authenticatedUser);

        when(authenticatedUser.id()).thenReturn(USER_ID);

        Article article = new Article();
        article.setId(ARTICLE_ID);
        article.setSpaceId(SPACE_ID);
        article.setTitle("Test Article");
        article.setContentFormat("markdown");
        article.setContent("Hello world");
        when(articleRepository.findById(ARTICLE_ID)).thenReturn(Optional.of(article));

        KnowledgeSpace space = new KnowledgeSpace();
        space.setId(SPACE_ID);
        space.setWorkspaceId(WS_ID);
        when(knowledgeSpaceRepository.findById(SPACE_ID)).thenReturn(Optional.of(space));
    }

    private ArticleEmailController.SendEmailRequest req(List<String> recipients, String subject, String msg) {
        ArticleEmailController.SendEmailRequest r = new ArticleEmailController.SendEmailRequest();
        r.setRecipients(recipients);
        r.setSubject(subject);
        r.setMessage(msg);
        return r;
    }

    @Test
    void validRequest_callsEmailService_returns200() {
        var body = req(List.of("user@example.com"), "My Subject", "Hello");
        ResponseEntity<Map<String, Object>> res = controller.sendEmail(ARTICLE_ID, body);

        assertThat(res.getStatusCode().value()).isEqualTo(200);
        assertThat(res.getBody()).containsEntry("sent", true);
        verify(emailService).send(any(Article.class), eq(List.of("user@example.com")), eq("My Subject"), eq("Hello"));
    }

    @Test
    void tooManyRecipients_throws400() {
        List<String> many = Collections.nCopies(11, "a@b.com");
        var body = req(many, "s", null);
        assertThatThrownBy(() -> controller.sendEmail(ARTICLE_ID, body))
            .isInstanceOf(ApiException.class)
            .hasMessageContaining("10 recipients");
    }

    @Test
    void invalidEmail_throws400() {
        var body = req(List.of("not-an-email"), "s", null);
        assertThatThrownBy(() -> controller.sendEmail(ARTICLE_ID, body))
            .isInstanceOf(ApiException.class)
            .hasMessageContaining("Invalid email");
    }

    @Test
    void articleNotFound_throws404() {
        when(articleRepository.findById("MISSING")).thenReturn(Optional.empty());
        var body = req(List.of("a@b.com"), "s", null);
        assertThatThrownBy(() -> controller.sendEmail("MISSING", body))
            .isInstanceOf(ApiException.class)
            .extracting(e -> ((ApiException) e).getStatus().value())
            .isEqualTo(404);
    }

    @Test
    void noPermission_throws403() {
        doThrow(ApiException.forbidden("No permission"))
            .when(rbacService).require(USER_ID, WS_ID, "view_items");
        var body = req(List.of("a@b.com"), "s", null);
        assertThatThrownBy(() -> controller.sendEmail(ARTICLE_ID, body))
            .isInstanceOf(ApiException.class)
            .extracting(e -> ((ApiException) e).getStatus().value())
            .isEqualTo(403);
    }
}
