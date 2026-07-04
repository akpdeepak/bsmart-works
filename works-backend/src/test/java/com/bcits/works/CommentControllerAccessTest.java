package com.bcits.works;

import com.bcits.works.auth.RbacService;
import com.bcits.works.auth.User;
import com.bcits.works.auth.UserRepository;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.EventService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Proves that @mention resolution in CommentController scopes user lookup
 * to workspace members only — preventing cross-tenant user enumeration (RB-40 §1).
 */
@Tag("unit")
class CommentControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String WS_A = "ws-A";
    private static final String ITEM_ID = "WI-001";

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

    CommentControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        when(rbac.workspaceForWorkItem(ITEM_ID)).thenReturn(WS_A);
        when(rbac.getUserTier(CALLER, WS_A)).thenReturn(1);
        when(rbac.canDo(CALLER, WS_A, "comment")).thenReturn(true);
        // Save returns the comment with a stable ID so Map.of() in event emission does not NPE
        when(commentRepository.save(any())).thenAnswer(inv -> {
            Comment c = inv.getArgument(0);
            c.setId(99L);
            return c;
        });
        when(userRepository.findById(CALLER))
                .thenReturn(Optional.of(user(CALLER, "Alice", "alice@example.com")));
    }

    @Test
    void addComment_withMention_queriesOnlyWorkspaceMembers() {
        User wsUser = user("user-B", "Bob Smith", "bob@example.com");
        when(userRepository.findByWorkspaceId(WS_A)).thenReturn(List.of(wsUser));

        controller.addComment(ITEM_ID, Map.of("body", "@bob please review"));

        verify(userRepository).findByWorkspaceId(WS_A);
        verify(userRepository, never()).findAll();
    }

    @Test
    void addComment_withoutMention_neverQueriesUsersList() {
        controller.addComment(ITEM_ID, Map.of("body", "No mentions here"));

        verify(userRepository, never()).findAll();
        verify(userRepository, never()).findByWorkspaceId(anyString());
    }

    private User user(String id, String fullName, String email) {
        User u = new User();
        u.setId(id);
        u.setFullName(fullName);
        u.setEmail(email);
        return u;
    }
}
