package com.example.demo;

import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/work-items/{workItemId}/comments")
@CrossOrigin(origins = "http://localhost:5173")
public class CommentController {

    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final EventService eventService;

    public CommentController(CommentRepository commentRepository, UserRepository userRepository,
                             EventService eventService) {
        this.commentRepository = commentRepository;
        this.userRepository = userRepository;
        this.eventService = eventService;
    }

    @GetMapping
    public List<Comment> getComments(@PathVariable String workItemId) {
        List<Comment> comments = commentRepository.findByWorkItemIdOrderByCreatedAtAsc(workItemId);
        comments.forEach(c -> userRepository.findById(c.getAuthorId())
                .ifPresent(u -> c.setAuthorName(u.getFullName())));
        return comments;
    }

    @PostMapping
    public Comment addComment(@PathVariable String workItemId,
                              @RequestBody Map<String, String> payload,
                              @RequestHeader(value = "X-User-Id", required = false) String userId) {
        Comment comment = new Comment();
        comment.setWorkItemId(workItemId);
        comment.setAuthorId(userId != null ? userId : "USR-001");
        comment.setBody(payload.get("body"));
        comment.setCreatedAt(OffsetDateTime.now());
        Comment saved = commentRepository.save(comment);
        userRepository.findById(saved.getAuthorId()).ifPresent(u -> saved.setAuthorName(u.getFullName()));
        eventService.record(workItemId, "COMMENT_ADDED", userId, "{\"commentId\":" + saved.getId() + "}");
        return saved;
    }

    @DeleteMapping("/{commentId}")
    public void deleteComment(@PathVariable String workItemId, @PathVariable Long commentId) {
        commentRepository.deleteById(commentId);
    }
}
