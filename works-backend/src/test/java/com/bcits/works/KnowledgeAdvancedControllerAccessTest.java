package com.bcits.works;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;
import com.bcits.works.ai.StructuredExtractionController;
import com.bcits.works.ai.StructuredExtractionService;
import com.bcits.works.knowledge.ArticleCollaborationController;
import com.bcits.works.knowledge.ArticleCollaborationService;
import com.bcits.works.knowledge.DocumentTemplate;
import com.bcits.works.knowledge.DocumentTemplateController;
import com.bcits.works.knowledge.DocumentTemplateService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unauthorized / cross-tenant access tests for the iteration-20 Advanced Knowledge endpoints
 * (Cap I — templates, collaboration, extraction; RB-05 Stage 3, RB-40 §1). A non-member is denied at
 * the controller boundary before any service runs, so no workspace data is read or mutated across the
 * tenant boundary. The mandatory missing-workspace rejection is covered too.
 */
@Tag("unit")
class KnowledgeAdvancedControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";

    private final DocumentTemplateService templates = mock(DocumentTemplateService.class);
    private final ArticleCollaborationService collaboration = mock(ArticleCollaborationService.class);
    private final StructuredExtractionService extraction = mock(StructuredExtractionService.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);

    private final DocumentTemplateController templateController =
        new DocumentTemplateController(templates, authenticatedUser, rbac);
    private final ArticleCollaborationController collaborationController =
        new ArticleCollaborationController(collaboration, authenticatedUser, rbac);
    private final StructuredExtractionController extractionController =
        new StructuredExtractionController(extraction, authenticatedUser, rbac);

    KnowledgeAdvancedControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        // A non-member fails any permission check on the foreign workspace.
        doThrow(ApiException.forbidden("denied")).when(rbac).require(eq(CALLER), eq(FOREIGN_WS), anyString());
    }

    @Test
    void createTemplate_deniedForNonMember_serviceNotInvoked() {
        DocumentTemplate body = new DocumentTemplate();
        body.setName("Runbook");
        assertThatThrownBy(() -> templateController.create(FOREIGN_WS, body))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verify(templates, never()).create(anyString(), anyString(), any());
    }

    @Test
    void extract_deniedForNonMember_serviceNotInvoked() {
        assertThatThrownBy(() -> extractionController.extract(FOREIGN_WS, Map.of("text", "Owner: Dev")))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verify(extraction, never()).extract(anyString(), anyString(), anyString(), anyBoolean());
    }

    @Test
    void addAuthor_deniedForNonMember_serviceNotInvoked() {
        assertThatThrownBy(() -> collaborationController.addAuthor("ART-1", FOREIGN_WS, Map.of("userId", "user-X")))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verify(collaboration, never()).addAuthor(anyString(), anyString(), anyString(), anyString(), any());
    }

    @Test
    void missingWorkspaceIsRejected() {
        assertThatThrownBy(() -> extractionController.extract("", Map.of("text", "x")))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        assertThatThrownBy(() -> templateController.list("", null))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
    }
}
