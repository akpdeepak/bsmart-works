package com.bcits.works;

import com.bcits.works.auth.UserRepository;
import com.bcits.works.shared.RbacGate;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class CommentService {

    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final EventService eventService;
    private final EmailService emailService;
    private final RbacGate rbac;

    public CommentService(CommentRepository commentRepository,
                          UserRepository userRepository,
                          NotificationRepository notificationRepository,
                          EventService eventService,
                          EmailService emailService,
                          RbacGate rbac) {
        this.commentRepository = commentRepository;
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.eventService = eventService;
        this.emailService = emailService;
        this.rbac = rbac;
    }

    /** Resolves the workspace for a work item and requires the caller is a member (RB-40 §1).
     *  Returns 404 for both missing items and items in workspaces the caller cannot see. */
    String requireAccess(String callerId, String workItemId) {
        String wsId = rbac.workspaceForWorkItem(workItemId);
        if (wsId == null || rbac.getUserTier(callerId, wsId) < 1) {
            throw ApiException.notFound("Work item", workItemId);
        }
        return wsId;
    }

    public List<Comment> getThreaded(String callerId, String workItemId, int page, int size) {
        requireAccess(callerId, workItemId);
        int limit = Math.min(Math.max(size, 1), 500);
        List<Comment> all = commentRepository
                .findByWorkItemIdScoped(workItemId, callerId,
                        PageRequest.of(Math.max(page, 0), limit))
                .getContent();
        all.forEach(c -> userRepository.findById(c.getAuthorId())
                .ifPresent(u -> c.setAuthorName(u.getFullName())));
        Map<Long, Comment> byId = new LinkedHashMap<>();
        all.forEach(c -> byId.put(c.getId(), c));
        List<Comment> threaded = new ArrayList<>();
        for (Comment c : all) {
            if (c.getParentId() == null) {
                threaded.add(c);
            } else {
                Comment parent = byId.get(c.getParentId());
                if (parent != null) parent.getReplies().add(c);
            }
        }
        return threaded;
    }

    public Comment add(String callerId, String workItemId,
                       String body, boolean isInternal, Long parentId) {
        String wsId = requireAccess(callerId, workItemId);
        rbac.require(callerId, wsId, "comment");
        Comment comment = new Comment();
        comment.setWorkItemId(workItemId);
        comment.setAuthorId(callerId);
        comment.setBody(body);
        comment.setInternal(isInternal);
        comment.setCreatedAt(OffsetDateTime.now());
        comment.setParentId(parentId);
        Comment saved = commentRepository.save(comment);
        userRepository.findById(saved.getAuthorId())
                .ifPresent(u -> saved.setAuthorName(u.getFullName()));

        eventService.recordInWorkspace(wsId, workItemId, "COMMENT_ADDED", callerId,
                Map.of("workspaceId", wsId, "commentId", saved.getId()));

        notifyMentions(wsId, workItemId, callerId, saved);
        return saved;
    }

    public void delete(String callerId, String workItemId, Long commentId) {
        String wsId = requireAccess(callerId, workItemId);
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> ApiException.notFound("Comment", String.valueOf(commentId)));
        if (!callerId.equals(comment.getAuthorId()) && !rbac.canDo(callerId, wsId, "edit_any_item")) {
            throw ApiException.forbidden("You can only delete your own comments.");
        }
        commentRepository.deleteById(commentId);
    }

    // Mention lookup is scoped to workspace members only — prevents cross-tenant user enumeration (RB-40 §1).
    private void notifyMentions(String wsId, String workItemId, String authorId, Comment saved) {
        String body = saved.getBody();
        if (body == null) return;
        String actorName = saved.getAuthorName() != null ? saved.getAuthorName() : "Someone";
        String snippet = body.length() <= 120 ? body : body.substring(0, 120) + "…";
        Matcher m = Pattern.compile("@([\\w.]+)").matcher(body);
        while (m.find()) {
            String mention = m.group(1).toLowerCase();
            userRepository.findByWorkspaceId(wsId).stream()
                    .filter(u -> u.getFullName().toLowerCase().replace(" ", "").contains(mention)
                            || u.getEmail().toLowerCase().contains(mention))
                    .filter(u -> !u.getId().equals(authorId))
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
}
