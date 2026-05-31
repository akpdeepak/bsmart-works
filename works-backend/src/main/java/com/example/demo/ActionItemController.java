package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/action-items")
public class ActionItemController {

    private final ActionItemRepository actionItemRepository;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;

    public ActionItemController(ActionItemRepository actionItemRepository, EventService eventService, AuthenticatedUser authenticatedUser) {
        this.actionItemRepository = actionItemRepository;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<ActionItem> getActionItems(@RequestParam(required = false) String projectId,
                                           @RequestParam(required = false) String ownerId) {
        if (ownerId != null) {
            return actionItemRepository.findByOwnerIdAndStatusNotOrderByDueDateAsc(ownerId, "CANCELLED");
        }
        return projectId != null
            ? actionItemRepository.findByProjectIdOrderByCreatedAtDesc(projectId)
            : actionItemRepository.findAll();
    }

    @GetMapping("/{id}")
    public ActionItem getActionItem(@PathVariable String id) {
        return actionItemRepository.findById(id).orElseThrow();
    }

    @PostMapping
    public ActionItem createActionItem(@RequestBody ActionItem item) {
        String userId = authenticatedUser.id();
        item.setId("ACT-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        item.setStatus(item.getStatus() != null ? item.getStatus() : "OPEN");
        item.setPriority(item.getPriority() != null ? item.getPriority() : "MEDIUM");
        item.setCreatedBy(userId);
        item.setCreatedAt(OffsetDateTime.now());
        item.setUpdatedAt(OffsetDateTime.now());
        ActionItem saved = actionItemRepository.save(item);
        eventService.record(saved.getId(), "ACTION_ITEM_CREATED", userId, "{\"title\":\"" + saved.getTitle() + "\"}");
        return saved;
    }

    @PutMapping("/{id}")
    public ActionItem updateActionItem(@PathVariable String id, @RequestBody ActionItem updated) {
        String userId = authenticatedUser.id();
        return actionItemRepository.findById(id).map(a -> {
            a.setTitle(updated.getTitle());
            a.setDescription(updated.getDescription());
            a.setOwnerId(updated.getOwnerId());
            a.setDueDate(updated.getDueDate());
            a.setStatus(updated.getStatus());
            a.setPriority(updated.getPriority());
            a.setUpdatedAt(OffsetDateTime.now());
            ActionItem saved = actionItemRepository.save(a);
            eventService.record(id, "ACTION_ITEM_UPDATED", userId, "{\"status\":\"" + saved.getStatus() + "\"}");
            return saved;
        }).orElseThrow();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteActionItem(@PathVariable String id) {
        actionItemRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
