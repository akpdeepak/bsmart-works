package com.bcits.works;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import jakarta.validation.Valid;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/v1/work-items/{workItemId}/comments")
public class CommentController {

    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final EventService eventService;
    private final EmailService emailService;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public CommentController(CommentRepository commentRepository, UserRepository userRepository,
                             NotificationRepository notificationRepository, EventService eventService,
                             EmailService emailService, AuthenticatedUser authenticatedUser,
                             RbacService rbac) {
        this.commentRepository = commentRepository;
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.eventService = eventService;
        this.emailService = emailService;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    /** Resolve the work item's workspace and require the caller is a member (RB-40 §1). 404 hides
     *  both a missing item and a foreign-tenant one. Returns the workspace id for further checks. */
    private String requireItemAccess(String callerId, String workItemId) {
        String wsId = rbac.workspaceForWorkItem(workItemId);
        if (wsId == null || rbac.getUserTier(callerId, wsId) < 1) {
            throw ApiException.notFound("Work item", workItemId);
        }
        return wsId;
    }

    @GetMapping
    public List<Comment> getComments(@PathVariable String workItemId,
                                      @RequestParam(defaultValue = "0") int page,
                                      @RequestParam(defaultValue = "100") int size) {
        requireItemAccess(authenticatedUser.id(), workItemId);
        int limit = Math.min(Math.max(size, 1), 500);
        org.springframework.data.domain.Pageable pageable =
            org.springframework.data.domain.PageRequest.of(Math.max(page, 0), limit);
        List<Comment> all = commentRepository.findByWorkItemIdOrderByCreatedAtAsc(workItemId, pageable).getContent();
        all.forEach(c -> userRepository.findById(c.getAuthorId()).ifPresent(u -> c.setAuthorName(u.getFullName())));
        Map<Long, Comment> byId = new java.util.LinkedHashMap<>();
        all.forEach(c -> byId.put(c.getId(), c));
        List<Comment> threaded = new java.util.ArrayList<>();
        for (Comment c : all) {
            if (c.getParentId() == null) {
                threaded.add(c);
            } else {
                Comment parent = byId.get(c.getParentId());
                if (parent != null) {
                    parent.getReplies().add(c);
                }
            }
        }
        return threaded;
    }

    @PostMapping
    public Comment addComment(@PathVariable String workItemId,
                              @Valid @RequestBody Map<String, Object> payload) {
        String userId = authenticatedUser.id();
        String wsId = requireItemAccess(userId, workItemId);
        rbac.require(userId, wsId, "comment");
        Comment comment = new Comment();
        comment.setWorkItemId(workItemId);
        comment.setAuthorId(userId);
        comment.setBody((String) payload.get("body"));
        comment.setInternal(Boolean.TRUE.equals(payload.get("isInternal")));
        comment.setCreatedAt(OffsetDateTime.now());
        if (payload.get("parentId") != null) {
            comment.setParentId(((Number) payload.get("parentId")).longValue());
        }
        Comment saved = commentRepository.save(comment);
        userRepository.findById(saved.getAuthorId()).ifPresent(u -> saved.setAuthorName(u.getFullName()));

        eventService.recordInWorkspace(wsId, workItemId, "COMMENT_ADDED", userId,
                Map.of("workspaceId", wsId, "commentId", saved.getId()));

        String actorName = saved.getAuthorName() != null ? saved.getAuthorName() : "Someone";
        String snippet = truncate(saved.getBody(), 120);

        // @mention notifications + emails — only fellow workspace members can be mentioned, so a
        // mention never notifies (or leaks the item to) someone outside the tenant (RB-40 §1).
        String body = saved.getBody();
        if (body != null) {
            Pattern p = Pattern.compile("@([\\w.]+)");
            Matcher m = p.matcher(body);
            while (m.find()) {
                String mention = m.group(1).toLowerCase();
                // Scoped to workspace members only — prevents cross-tenant mention leakage (RB-40 §1)
                userRepository.findByWorkspaceId(wsId).stream()
                    .filter(u -> u.getFullName().toLowerCase().replace(" ", "").contains(mention)
                            || u.getEmail().toLowerCase().contains(mention))
                    .filter(u -> !u.getId().equals(userId))
                    .forEach(u -> {
                        Notification n = new Notification();
                        n.setUserId(u.getId());
                        n.setType("MENTION");
                        n.setMessage(actorName + " mentioned you in a comment");
                        n.setLink("/items/" + workItemId);
                        n.setRead(false);
                        n.setCreatedAt(OffsetDateTime.now());
                        notificationRepository.save(n);
                        emailService.sendMentionEmail(u.getId(), actorName, workItemId, snippet);
                    });
            }
        }

        return saved;
    }

    @DeleteMapping("/{commentId}")
    public void deleteComment(@PathVariable String workItemId, @PathVariable Long commentId) {
        String userId = authenticatedUser.id();
        String wsId = requireItemAccess(userId, workItemId);
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> ApiException.notFound("Comment", String.valueOf(commentId)));
        // Author can delete their own comment; otherwise an elevated role is required.
        if (!userId.equals(comment.getAuthorId()) && !rbac.canDo(userId, wsId, "edit_any_item")) {
            throw ApiException.forbidden("You can only delete your own comments.");
        }
        commentRepository.deleteById(commentId);
    }

    private String truncate(String s, int max) {
        if (s == null) return ""; {
        return s.length() <= max ? s : s.substring(0, max) + "…";
        }
    }
}
