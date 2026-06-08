package com.bcits.works;

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
@RequestMapping("/api/v1/pm-issues")
public class PmIssueController {

    private final PmIssueRepository repo;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public PmIssueController(PmIssueRepository repo, AuthenticatedUser authenticatedUser, RbacService rbac) {
        this.repo = repo;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping
    public List<PmIssue> list(@RequestParam(required = false) String projectId,
                              @RequestParam(required = false) String workspaceId) {
        String callerId = authenticatedUser.id();
        if (projectId != null) {
            String wsId = rbac.workspaceForProject(projectId);
            if (wsId == null || rbac.getUserTier(callerId, wsId) < 1) {
                throw ApiException.notFound("Project", projectId);
            }
            return repo.findByProjectIdAndDeletedAtIsNull(projectId);
        }
        if (workspaceId != null) {
            if (rbac.getUserTier(callerId, workspaceId) < 1) {
                throw ApiException.notFound("Workspace", workspaceId);
            }
            return repo.findByWorkspaceIdAndDeletedAtIsNull(workspaceId);
        }
        throw ApiException.badRequest("MISSING_PARAM", "Either projectId or workspaceId is required");
    }

    @GetMapping("/{id}")
    public PmIssue get(@PathVariable String id) {
        PmIssue issue = repo.findById(id).orElseThrow();
        String wsId = rbac.workspaceForProject(issue.getProjectId());
        if (wsId == null || rbac.getUserTier(authenticatedUser.id(), wsId) < 1) {
            throw ApiException.notFound("PmIssue", id);
        }
        return issue;
    }

    @PostMapping
    public PmIssue create(@Valid @RequestBody PmIssue issue) {
        issue.setId("PMI-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        issue.setCreatedBy(authenticatedUser.id());
        issue.setCreatedAt(OffsetDateTime.now());
        issue.setUpdatedAt(OffsetDateTime.now());
        return repo.save(issue);
    }

    @PutMapping("/{id}")
    public PmIssue update(@PathVariable String id, @Valid @RequestBody PmIssue updated) {
        PmIssue existing = repo.findById(id).orElseThrow(() -> ApiException.notFound("PmIssue", id));
        String wsId = rbac.workspaceForProject(existing.getProjectId());
        if (wsId == null || rbac.getUserTier(authenticatedUser.id(), wsId) < 1) {
            throw ApiException.notFound("PmIssue", id);
        }
        return repo.findById(id).map(i -> {
            i.setTitle(updated.getTitle());
            i.setDescription(updated.getDescription());
            i.setImpact(updated.getImpact());
            i.setResolutionPath(updated.getResolutionPath());
            i.setStatus(updated.getStatus());
            i.setPriority(updated.getPriority());
            i.setOwnerId(updated.getOwnerId());
            i.setUpdatedAt(OffsetDateTime.now());
            return repo.save(i);
        }).orElseThrow();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        repo.findById(id).ifPresent(i -> {
            i.setDeletedAt(OffsetDateTime.now());
            repo.save(i);
        });
        return ResponseEntity.noContent().build();
    }
}
