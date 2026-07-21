package com.bcits.works;

import com.bcits.works.auth.RbacService;
import com.bcits.works.auth.User;
import com.bcits.works.auth.UserRepository;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;
import com.bcits.works.messaging.Comment;
import com.bcits.works.messaging.CommentRepository;
import com.bcits.works.messaging.CommentService;
import com.bcits.works.messaging.NotificationRepository;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Business-logic tests for CommentService (RB-10 §2: RBAC + domain logic live in the service).
 *
 * Covers:
 *   - workspace isolation (RB-40 §1): non-members and unknown work items are rejected
 *   - @mention resolution is scoped to workspace members only (RB-40 §1)
 *   - delete authorization: author vs. elevated role
 *   - scoped repository method is called (not the deprecated unscoped overload)
 */
@Tag("unit")
class CommentServiceTest {

    private static final String CALLER = "user-A";
    private static final String OTHER  = "user-B";
    private static final String WS     = "ws-A";
    private static final String ITEM   = "WI-001";

    private final CommentRepository commentRepository  = mock(CommentRepository.class);
    private final UserRepository     userRepository    = mock(UserRepository.class);
    private final NotificationRepository notifRepo     = mock(NotificationRepository.class);
    private final EventService       eventService      = mock(EventService.class);
    private final EmailService       emailService      = mock(EmailService.class);
    private final RbacService        rbac              = mock(RbacService.class);

    private final CommentService service = new CommentService(
            commentRepository, userRepository, notifRepo, eventService, emailService, rbac);

    CommentServiceTest() {
        when(rbac.workspaceForWorkItem(ITEM)).thenReturn(WS);
        when(commentRepository.save(any())).thenAnswer(inv -> {
            Comment c = inv.getArgument(0);
            c.setId(99L);
            return c;
        });
        when(userRepository.findById(CALLER))
                .thenReturn(Optional.of(user(CALLER, "Alice", "alice@example.com")));
    }

    // ── getThreaded ───────────────────────────────────────────────────────────────

    @Test
    void getThreaded_nonMember_throwsNotFound() {
        when(rbac.getUserTier(CALLER, WS)).thenReturn(0);

        assertThatThrownBy(() -> service.getThreaded(CALLER, ITEM, 0, 50))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus())
                        .isEqualTo(org.springframework.http.HttpStatus.NOT_FOUND));

        verify(commentRepository, never()).findByWorkItemIdScoped(any(), any(), any());
    }

    @Test
    void getThreaded_workItemNotFound_throwsNotFound() {
        when(rbac.workspaceForWorkItem(ITEM)).thenReturn(null);

        assertThatThrownBy(() -> service.getThreaded(CALLER, ITEM, 0, 50))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus())
                        .isEqualTo(org.springframework.http.HttpStatus.NOT_FOUND));
    }

    @Test
    void getThreaded_member_usesWorkspaceScopedQuery() {
        when(rbac.getUserTier(CALLER, WS)).thenReturn(1);
        Comment c = comment(1L, ITEM, CALLER, null);
        when(commentRepository.findByWorkItemIdScoped(eq(ITEM), eq(CALLER), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(c)));

        var result = service.getThreaded(CALLER, ITEM, 0, 50);

        assertThat(result).hasSize(1);
        verify(commentRepository).findByWorkItemIdScoped(eq(ITEM), eq(CALLER), any(Pageable.class));
        // Deprecated unscoped list overload must not be called from the service
        verify(commentRepository, never()).findByWorkItemIdOrderByCreatedAtAsc(anyString());
    }

    // ── add / @mention scoping ────────────────────────────────────────────────────

    @Test
    void add_withMention_queriesOnlyWorkspaceMembers() {
        when(rbac.getUserTier(CALLER, WS)).thenReturn(1);
        User wsUser = user("user-B", "Bob Smith", "bob@example.com");
        when(userRepository.findByWorkspaceId(WS)).thenReturn(List.of(wsUser));

        service.add(CALLER, ITEM, "@bob please review", false, null);

        verify(userRepository).findByWorkspaceId(WS);
        verify(userRepository, never()).findAll();
    }

    @Test
    void add_withoutMention_neverQueriesUsersList() {
        when(rbac.getUserTier(CALLER, WS)).thenReturn(1);

        service.add(CALLER, ITEM, "No mentions here", false, null);

        verify(userRepository, never()).findAll();
        verify(userRepository, never()).findByWorkspaceId(anyString());
    }

    // ── delete ────────────────────────────────────────────────────────────────────

    @Test
    void delete_authorCanDeleteOwnComment() {
        when(rbac.getUserTier(CALLER, WS)).thenReturn(1);
        Comment c = comment(42L, ITEM, CALLER, null);
        when(commentRepository.findById(42L)).thenReturn(Optional.of(c));

        service.delete(CALLER, ITEM, 42L);

        verify(commentRepository).deleteById(42L);
    }

    @Test
    void delete_nonAuthorWithEditAnyItem_canDelete() {
        when(rbac.getUserTier(CALLER, WS)).thenReturn(1);
        Comment c = comment(42L, ITEM, OTHER, null);
        when(commentRepository.findById(42L)).thenReturn(Optional.of(c));
        when(rbac.canDo(CALLER, WS, "edit_any_item")).thenReturn(true);

        service.delete(CALLER, ITEM, 42L);

        verify(commentRepository).deleteById(42L);
    }

    @Test
    void delete_nonAuthorWithoutPermission_throwsForbidden() {
        when(rbac.getUserTier(CALLER, WS)).thenReturn(1);
        Comment c = comment(42L, ITEM, OTHER, null);
        when(commentRepository.findById(42L)).thenReturn(Optional.of(c));
        when(rbac.canDo(CALLER, WS, "edit_any_item")).thenReturn(false);

        assertThatThrownBy(() -> service.delete(CALLER, ITEM, 42L))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus())
                        .isEqualTo(org.springframework.http.HttpStatus.FORBIDDEN));

        verify(commentRepository, never()).deleteById(42L);
    }

    @Test
    void delete_commentNotFound_throwsNotFound() {
        when(rbac.getUserTier(CALLER, WS)).thenReturn(1);
        when(commentRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(CALLER, ITEM, 99L))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus())
                        .isEqualTo(org.springframework.http.HttpStatus.NOT_FOUND));
    }

    // ── helpers ───────────────────────────────────────────────────────────────────

    private Comment comment(Long id, String workItemId, String authorId, Long parentId) {
        Comment c = new Comment();
        c.setId(id);
        c.setWorkItemId(workItemId);
        c.setAuthorId(authorId);
        c.setParentId(parentId);
        return c;
    }

    private User user(String id, String fullName, String email) {
        User u = new User();
        u.setId(id);
        u.setFullName(fullName);
        u.setEmail(email);
        return u;
    }
}
