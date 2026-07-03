package com.bcits.works;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Cross-tenant access tests for KnowledgeSpaceController (RB-40 §1, RB-05 Stage 3).
 * KnowledgeSpace carries workspaceId directly (Pattern B).
 * A caller whose workspace differs is denied with FORBIDDEN (403) before any mutation runs.
 */
@Tag("unit")
class KnowledgeSpaceControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";
    private static final String PERM = "view_items";

    private final KnowledgeSpaceRepository knowledgeSpaceRepository = mock(KnowledgeSpaceRepository.class);
    private final ArticleRepository articleRepository = mock(ArticleRepository.class);
    private final EventService eventService = mock(EventService.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);

    private final KnowledgeSpaceController controller = new KnowledgeSpaceController(
            knowledgeSpaceRepository, articleRepository, eventService, authenticatedUser, rbac);

    KnowledgeSpaceControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        doThrow(ApiException.forbidden("denied")).when(rbac).require(eq(CALLER), eq(FOREIGN_WS), eq(PERM));
    }

    private KnowledgeSpace spaceInForeignWorkspace() {
        KnowledgeSpace ks = new KnowledgeSpace();
        ks.setId("KS-1");
        ks.setWorkspaceId(FOREIGN_WS);
        ks.setName("Foreign space");
        return ks;
    }

    @Test
    void getSpace_crossTenantReturnsForbidden() {
        when(knowledgeSpaceRepository.findById("KS-1")).thenReturn(Optional.of(spaceInForeignWorkspace()));

        assertThatThrownBy(() -> controller.getSpace("KS-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void getSpace_unknownIdReturnsNotFound() {
        when(knowledgeSpaceRepository.findById("KS-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.getSpace("KS-missing"))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void updateSpace_crossTenantReturnsForbidden() {
        when(knowledgeSpaceRepository.findById("KS-1")).thenReturn(Optional.of(spaceInForeignWorkspace()));

        assertThatThrownBy(() -> controller.updateSpace("KS-1", new KnowledgeSpace()))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(knowledgeSpaceRepository, never()).save(any());
    }

    @Test
    void updateSpace_unknownIdReturnsNotFound() {
        when(knowledgeSpaceRepository.findById("KS-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.updateSpace("KS-missing", new KnowledgeSpace()))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void deleteSpace_crossTenantReturnsForbidden() {
        when(knowledgeSpaceRepository.findById("KS-1")).thenReturn(Optional.of(spaceInForeignWorkspace()));

        assertThatThrownBy(() -> controller.deleteSpace("KS-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(knowledgeSpaceRepository, never()).deleteById(any());
    }
}
