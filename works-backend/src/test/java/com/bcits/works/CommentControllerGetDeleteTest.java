package com.bcits.works;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EmailService;
import com.bcits.works.shared.EventService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests for CommentController.getComments() pagination access control and
 * deleteComment() authorization rules (RB-40 §1 — only members can read;
 * only the author or an elevated role can delete).
 */
@Tag("unit")
class CommentControllerGetDeleteTest {

    private static final String CALLER = "user-A";
    private static final String OTHER  = "user-B";
    private static final String WS     = "ws-A";
    private static final String ITEM   = "WI-001";

    private final CommentRepository commentRepository = mock(CommentRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final NotificationRepository notificationRepository = mock(NotificationRepository.class);
    private final EventService eventService = mock(EventService.class);
    private final EmailService emailService = mock(EmailService.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);

    private final CommentController controller = new CommentController(
            commentRepository, userRepository, notificationRepository,
            eventService, emailService, authenticatedUser, rbac, mock(WatcherService.class));

    CommentControllerGetDeleteTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        when(rbac.workspaceForWorkItem(ITEM)).thenReturn(WS);
    }

    // ── getComments ──────────────────────────────────────────────────────────────

    @Test
    void getComments_nonMember_throwsNotFound() {
        when(rbac.getUserTier(CALLER, WS)).thenReturn(0);

        assertThatThrownBy(() -> controller.getComments(ITEM, 0, 50))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus())
                        .isEqualTo(org.springframework.http.HttpStatus.NOT_FOUND));

        verify(commentRepository, never()).findByWorkItemIdOrderByCreatedAtAsc(any(), any());
    }

    @Test
    @SuppressWarnings("unchecked")
    void getComments_member_returnsPagedResults() {
        when(rbac.getUserTier(CALLER, WS)).thenReturn(1);
        Comment c = comment(1L, ITEM, CALLER, null);
        when(commentRepository.findByWorkItemIdOrderByCreatedAtAsc(eq(ITEM), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(c)));
        when(userRepository.findById(CALLER)).thenReturn(Optional.of(user(CALLER, "Alice")));

        var result = controller.getComments(ITEM, 0, 50);

        assertThat(result).hasSize(1);
        verify(commentRepository).findByWorkItemIdOrderByCreatedAtAsc(eq(ITEM), any(Pageable.class));
    }

    @Test
    void getComments_workItemNotFound_throwsNotFound() {
        when(rbac.workspaceForWorkItem(ITEM)).thenReturn(null);

        assertThatThrownBy(() -> controller.getComments(ITEM, 0, 50))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus())
                        .isEqualTo(org.springframework.http.HttpStatus.NOT_FOUND));
    }

    // ── deleteComment ────────────────────────────────────────────────────────────

    @Test
    void deleteComment_authorCanDeleteOwnComment() {
        when(rbac.getUserTier(CALLER, WS)).thenReturn(1);
        Comment c = comment(42L, ITEM, CALLER, null);
        when(commentRepository.findById(42L)).thenReturn(Optional.of(c));

        controller.deleteComment(ITEM, 42L);

        verify(commentRepository).deleteById(42L);
    }

    @Test
    void deleteComment_nonAuthorWithEditAnyItem_canDelete() {
        when(rbac.getUserTier(CALLER, WS)).thenReturn(1);
        Comment c = comment(42L, ITEM, OTHER, null);
        when(commentRepository.findById(42L)).thenReturn(Optional.of(c));
        when(rbac.canDo(CALLER, WS, "edit_any_item")).thenReturn(true);

        controller.deleteComment(ITEM, 42L);

        verify(commentRepository).deleteById(42L);
    }

    @Test
    void deleteComment_nonAuthorWithoutPermission_throwsForbidden() {
        when(rbac.getUserTier(CALLER, WS)).thenReturn(1);
        Comment c = comment(42L, ITEM, OTHER, null);
        when(commentRepository.findById(42L)).thenReturn(Optional.of(c));
        when(rbac.canDo(CALLER, WS, "edit_any_item")).thenReturn(false);

        assertThatThrownBy(() -> controller.deleteComment(ITEM, 42L))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus())
                        .isEqualTo(org.springframework.http.HttpStatus.FORBIDDEN));

        verify(commentRepository, never()).deleteById(42L);
    }

    @Test
    void deleteComment_notFound_throwsNotFound() {
        when(rbac.getUserTier(CALLER, WS)).thenReturn(1);
        when(commentRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.deleteComment(ITEM, 99L))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus())
                        .isEqualTo(org.springframework.http.HttpStatus.NOT_FOUND));
    }

    // ── helpers ──────────────────────────────────────────────────────────────────

    private Comment comment(Long id, String workItemId, String authorId, Long parentId) {
        Comment c = new Comment();
        c.setId(id);
        c.setWorkItemId(workItemId);
        c.setAuthorId(authorId);
        c.setParentId(parentId);
        return c;
    }

    private User user(String id, String name) {
        User u = new User();
        u.setId(id);
        u.setFullName(name);
        return u;
    }
}
