package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.anyLong;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Cross-tenant / authorization tests for comment endpoints (RB-40 §1). Comments are reachable only
 * by members of the work item's workspace, posting needs the {@code comment} permission, and only
 * the author (or an elevated role) may delete. Pure mocks, no DB.
 */
@Tag("unit")
class CommentControllerAccessTest {

    private static final String CALLER = "user-A";

    private final CommentRepository commentRepository = mock(CommentRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final NotificationRepository notificationRepository = mock(NotificationRepository.class);
    private final EventService eventService = mock(EventService.class);
    private final EmailService emailService = mock(EmailService.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);

    private final CommentController controller = new CommentController(
            commentRepository, userRepository, notificationRepository, eventService, emailService,
            authenticatedUser, rbac);

    CommentControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
    }

    @Test
    void getComments_nonMember_is404() {
        when(rbac.workspaceForWorkItem("WI-1")).thenReturn("WS-B");
        when(rbac.getUserTier(CALLER, "WS-B")).thenReturn(0); // not a member
        assertThatThrownBy(() -> controller.getComments("WI-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        verify(commentRepository, never()).findByWorkItemIdOrderByCreatedAtAsc(any());
    }

    @Test
    void getComments_unknownItem_is404() {
        when(rbac.workspaceForWorkItem("WI-missing")).thenReturn(null);
        assertThatThrownBy(() -> controller.getComments("WI-missing"))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void addComment_withoutCommentPermission_isForbidden_andDoesNotSave() {
        when(rbac.workspaceForWorkItem("WI-1")).thenReturn("WS-1");
        when(rbac.getUserTier(CALLER, "WS-1")).thenReturn(1);
        doThrow(ApiException.forbidden("denied")).when(rbac).require(CALLER, "WS-1", "comment");
        assertThatThrownBy(() -> controller.addComment("WI-1", Map.of("body", "hi")))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verify(commentRepository, never()).save(any());
    }

    @Test
    void deleteComment_nonAuthorWithoutElevatedRole_isForbidden() {
        when(rbac.workspaceForWorkItem("WI-1")).thenReturn("WS-1");
        when(rbac.getUserTier(CALLER, "WS-1")).thenReturn(2);
        Comment c = new Comment();
        c.setWorkItemId("WI-1");
        c.setAuthorId("someone-else");
        when(commentRepository.findById(7L)).thenReturn(Optional.of(c));
        when(rbac.canDo(CALLER, "WS-1", "edit_any_item")).thenReturn(false);
        assertThatThrownBy(() -> controller.deleteComment("WI-1", 7L))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verify(commentRepository, never()).deleteById(anyLong());
    }

    @Test
    void deleteComment_byAuthor_succeeds() {
        when(rbac.workspaceForWorkItem("WI-1")).thenReturn("WS-1");
        when(rbac.getUserTier(CALLER, "WS-1")).thenReturn(2);
        Comment c = new Comment();
        c.setWorkItemId("WI-1");
        c.setAuthorId(CALLER);
        when(commentRepository.findById(7L)).thenReturn(Optional.of(c));
        controller.deleteComment("WI-1", 7L);
        verify(commentRepository).deleteById(7L);
    }
}
