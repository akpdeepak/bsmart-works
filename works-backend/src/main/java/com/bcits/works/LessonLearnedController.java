package com.bcits.works;

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
@RequestMapping("/api/v1/lessons-learned")
public class LessonLearnedController {

    private final LessonLearnedRepository repo;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public LessonLearnedController(LessonLearnedRepository repo, AuthenticatedUser authenticatedUser,
                                   RbacService rbac) {
        this.repo = repo;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping
    public List<LessonLearned> list(@RequestParam(required = false) String projectId,
                                     @RequestParam(required = false) String workspaceId) {
        String userId = authenticatedUser.id();
        // Workspace-scoped (RB-40 §1): caller sees only lessons from their workspaces.
        if (projectId != null)   return repo.findByProjectIdScopedToUser(projectId, userId);
        if (workspaceId != null) return repo.findByWorkspaceIdScopedToUser(workspaceId, userId); {
        return repo.findAllScopedToUser(userId);
        }
    }

    @GetMapping("/{id}")
    public LessonLearned get(@PathVariable String id) {
        LessonLearned ll = repo.findById(id).orElseThrow();
        String wsId = rbac.workspaceForProject(ll.getProjectId());
        if (wsId == null || rbac.getUserTier(authenticatedUser.id(), wsId) < 1) {
            throw ApiException.notFound("LessonLearned", id);
        }
        return ll;
    }

    @PostMapping
    public LessonLearned create(@Valid @RequestBody LessonLearned ll) {
        ll.setId("LL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        ll.setCreatedBy(authenticatedUser.id());
        ll.setCreatedAt(OffsetDateTime.now());
        ll.setUpdatedAt(OffsetDateTime.now());
        if (ll.getTags() == null) ll.setTags("[]"); {
        return repo.save(ll);
        }
    }

    @PutMapping("/{id}")
    public LessonLearned update(@PathVariable String id, @Valid @RequestBody LessonLearned updated) {
        LessonLearned existing = repo.findById(id).orElseThrow(() -> ApiException.notFound("LessonLearned", id));
        String wsId = rbac.workspaceForProject(existing.getProjectId());
        if (wsId == null || rbac.getUserTier(authenticatedUser.id(), wsId) < 1) {
            throw ApiException.notFound("LessonLearned", id);
        }
        return repo.findById(id).map(ll -> {
            ll.setTitle(updated.getTitle());
            ll.setDescription(updated.getDescription());
            ll.setCategory(updated.getCategory());
            ll.setWhatWorked(updated.getWhatWorked());
            ll.setWhatDidntWork(updated.getWhatDidntWork());
            ll.setRecommendation(updated.getRecommendation());
            if (updated.getTags() != null) ll.setTags(updated.getTags()); {
            ll.setUpdatedAt(OffsetDateTime.now());
            }
            return repo.save(ll);
        }).orElseThrow();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        repo.findById(id).ifPresent(ll -> {
            String wsId = rbac.workspaceForProject(ll.getProjectId());
            if (wsId == null || rbac.getUserTier(authenticatedUser.id(), wsId) < 1) {
                throw ApiException.notFound("LessonLearned", id);
            }
            ll.setDeletedAt(OffsetDateTime.now());
            repo.save(ll);
        });
        return ResponseEntity.noContent().build();
    }
}
