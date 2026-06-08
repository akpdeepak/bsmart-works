package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Cross-tenant access tests for LessonLearnedController (RB-40 §1, RB-05 Stage 3).
 * LessonLearned resolves its workspace via the parent project (Pattern A).
 * A caller outside that workspace receives NOT_FOUND (404) — never the real entity.
 */
@Tag("unit")
class LessonLearnedControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";

    private final LessonLearnedRepository repo = mock(LessonLearnedRepository.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);

    private final LessonLearnedController controller =
            new LessonLearnedController(repo, authenticatedUser, rbac);

    LessonLearnedControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        when(rbac.workspaceForProject("PROJ-B")).thenReturn(FOREIGN_WS);
        when(rbac.getUserTier(CALLER, FOREIGN_WS)).thenReturn(0);
    }

    private LessonLearned lessonInForeignWorkspace() {
        LessonLearned ll = new LessonLearned();
        ll.setId("LL-1");
        ll.setProjectId("PROJ-B");
        ll.setTitle("Foreign lesson");
        return ll;
    }

    @Test
    void get_crossTenantReturnsNotFound() {
        when(repo.findById("LL-1")).thenReturn(Optional.of(lessonInForeignWorkspace()));

        assertThatThrownBy(() -> controller.get("LL-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void get_unknownIdReturnsNotFound() {
        when(repo.findById("LL-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.get("LL-missing"))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void update_crossTenantReturnsNotFound() {
        when(repo.findById("LL-1")).thenReturn(Optional.of(lessonInForeignWorkspace()));

        assertThatThrownBy(() -> controller.update("LL-1", new LessonLearned()))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(repo, never()).save(any());
    }

    @Test
    void update_unknownIdReturnsNotFound() {
        when(repo.findById("LL-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.update("LL-missing", new LessonLearned()))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void delete_crossTenantReturnsNotFound() {
        when(repo.findById("LL-1")).thenReturn(Optional.of(lessonInForeignWorkspace()));

        assertThatThrownBy(() -> controller.delete("LL-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(repo, never()).deleteById(any());
    }
}
