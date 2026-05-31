package com.example.demo;

import org.springframework.web.bind.annotation.*;

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

    public CommentController(CommentRepository commentRepository, UserRepository userRepository,
                             NotificationRepository notificationRepository, EventService eventService) {
        this.commentRepository = commentRepository;
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.eventService = eventService;
    }

    @GetMapping
    public List<Comment> getComments(@PathVariable String workItemId,
                                     @RequestHeader(value = "X-User-Id", required = false) String userId) {
        List<Comment> all = commentRepository.findByWorkItemIdOrderByCreatedAtAsc(workItemId);
        all.forEach(c -> userRepository.findById(c.getAuthorId()).ifPresent(u -> c.setAuthorName(u.getFullName())));
        // Build threaded structure: top-level comments with replies nested
        java.util.Map<Long, Comment> byId = new java.util.LinkedHashMap<>();
        all.forEach(c -> byId.put(c.getId(), c));
        List<Comment> threaded = new java.util.ArrayList<>();
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

    @PostMapping
    public Comment addComment(@PathVariable String workItemId,
                              @RequestBody Map<String, Object> payload,
                              @RequestHeader(value = "X-User-Id", required = false) String userId) {
        Comment comment = new Comment();
        comment.setWorkItemId(workItemId);
        comment.setAuthorId(userId != null ? userId : "USR-001");
        comment.setBody((String) payload.get("body"));
        comment.setInternal(Boolean.TRUE.equals(payload.get("isInternal")));
        comment.setCreatedAt(OffsetDateTime.now());
        if (payload.get("parentId") != null) {
            comment.setParentId(((Number) payload.get("parentId")).longValue());
        }
        Comment saved = commentRepository.save(comment);
        userRepository.findById(saved.getAuthorId()).ifPresent(u -> saved.setAuthorName(u.getFullName()));

        eventService.record(workItemId, "COMMENT_ADDED", userId, "{\"commentId\":" + saved.getId() + "}");

        // Parse @mentions â€” match @FullName or @email
        String body = saved.getBody();
        if (body != null) {
            Pattern p = Pattern.compile("@([\\w.]+)");
            Matcher m = p.matcher(body);
            while (m.find()) {
                String mention = m.group(1).toLowerCase();
                userRepository.findAll().stream()
                    .filter(u -> u.getFullName().toLowerCase().replace(" ", "").contains(mention)
                            || u.getEmail().toLowerCase().contains(mention))
                    .filter(u -> !u.getId().equals(userId))
                    .forEach(u -> {
                        Notification n = new Notification();
                        n.setUserId(u.getId());
                        n.setType("MENTION");
                        n.setMessage(saved.getAuthorName() + " mentioned you in a comment");
                        n.setLink("/items/" + workItemId);
                        n.setRead(false);
                        n.setCreatedAt(OffsetDateTime.now());
                        notificationRepository.save(n);
                    });
            }
        }

        return saved;
    }

    @DeleteMapping("/{commentId}")
    public void deleteComment(@PathVariable String workItemId, @PathVariable Long commentId) {
        commentRepository.deleteById(commentId);
    }
}

