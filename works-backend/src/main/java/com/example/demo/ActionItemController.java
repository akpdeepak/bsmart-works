package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/action-items")
public class ActionItemController {

    private final ActionItemRepository repo;
    private final AuthenticatedUser authenticatedUser;

    public ActionItemController(ActionItemRepository repo, AuthenticatedUser authenticatedUser) {
        this.repo = repo;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<ActionItem> list(@RequestParam(required = false) String projectId,
                                  @RequestParam(required = false) String meetingId,
                                  @RequestParam(required = false) String ownerId) {
        if (meetingId != null) return repo.findBySourceMeetingIdAndDeletedAtIsNull(meetingId);
        if (ownerId != null)   return repo.findByOwnerIdAndDeletedAtIsNull(ownerId);
        if (projectId != null) return repo.findByProjectIdAndDeletedAtIsNull(projectId);
        return repo.findAll();
    }

    @GetMapping("/{id}")
    public ActionItem get(@PathVariable String id) { return repo.findById(id).orElseThrow(); }

    @PostMapping
    public ActionItem create(@RequestBody ActionItem item) {
        item.setId("ACT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        item.setCreatedBy(authenticatedUser.id());
        item.setCreatedAt(OffsetDateTime.now());
        item.setUpdatedAt(OffsetDateTime.now());
        return repo.save(item);
    }

    @PutMapping("/{id}")
    public ActionItem update(@PathVariable String id, @RequestBody ActionItem updated) {
        return repo.findById(id).map(a -> {
            a.setTitle(updated.getTitle());
            a.setDescription(updated.getDescription());
            a.setOwnerId(updated.getOwnerId());
            a.setDueDate(updated.getDueDate());
            a.setStatus(updated.getStatus());
            a.setPriority(updated.getPriority());
            a.setSourceMeetingId(updated.getSourceMeetingId());
            a.setUpdatedAt(OffsetDateTime.now());
            return repo.save(a);
        }).orElseThrow();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        repo.findById(id).ifPresent(a -> { a.setDeletedAt(OffsetDateTime.now()); repo.save(a); });
        return ResponseEntity.noContent().build();
    }
}
