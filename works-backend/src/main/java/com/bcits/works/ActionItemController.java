package com.bcits.works;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/action-items")
public class ActionItemController {

    private final ActionItemRepository repo;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public ActionItemController(ActionItemRepository repo, AuthenticatedUser authenticatedUser,
                                RbacService rbac) {
        this.repo = repo;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping
    public List<ActionItem> list(@RequestParam(required = false) String projectId,
                                  @RequestParam(required = false) String meetingId,
                                  @RequestParam(required = false) String ownerId) {
        String userId = authenticatedUser.id();
        // Every path is workspace-scoped (RB-40 §1) — caller sees only items from their workspaces.
        if (meetingId != null) return repo.findBySourceMeetingIdScopedToUser(meetingId, userId);
        if (ownerId != null)   return repo.findByOwnerIdScopedToUser(ownerId, userId);
        if (projectId != null) return repo.findByProjectIdScopedToUser(projectId, userId); {
        return repo.findAllScopedToUser(userId);
        }
    }

    @GetMapping("/{id}")
    public ActionItem get(@PathVariable String id) {
        ActionItem item = repo.findById(id).orElseThrow();
        String wsId = rbac.workspaceForProject(item.getProjectId());
        if (wsId == null || rbac.getUserTier(authenticatedUser.id(), wsId) < 1) {
            throw ApiException.notFound("ActionItem", id);
        }
        return item;
    }

    @PostMapping
    public ActionItem create(@Valid @RequestBody ActionItem item) {
        item.setId("ACT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        item.setCreatedBy(authenticatedUser.id());
        item.setCreatedAt(OffsetDateTime.now());
        item.setUpdatedAt(OffsetDateTime.now());
        return repo.save(item);
    }

    @PutMapping("/{id}")
    public ActionItem update(@PathVariable String id, @Valid @RequestBody ActionItem updated) {
        ActionItem existing = repo.findById(id).orElseThrow(() -> ApiException.notFound("ActionItem", id));
        String wsId = rbac.workspaceForProject(existing.getProjectId());
        if (wsId == null || rbac.getUserTier(authenticatedUser.id(), wsId) < 1) {
            throw ApiException.notFound("ActionItem", id);
        }
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
        repo.findById(id).ifPresent(a -> {
            String wsId = rbac.workspaceForProject(a.getProjectId());
            if (wsId == null || rbac.getUserTier(authenticatedUser.id(), wsId) < 1) {
                throw ApiException.notFound("ActionItem", id);
            }
            a.setDeletedAt(OffsetDateTime.now());
            repo.save(a);
        });
        return ResponseEntity.noContent().build();
    }
}
