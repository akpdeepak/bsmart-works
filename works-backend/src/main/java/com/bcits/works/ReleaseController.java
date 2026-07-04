package com.bcits.works;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
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
import java.util.Map;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/releases")
public class ReleaseController {

    private final ReleaseRepository releaseRepository;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;
    private final JdbcTemplate jdbc;
    private final RbacService rbac;

    public ReleaseController(ReleaseRepository releaseRepository, EventService eventService,
                              AuthenticatedUser authenticatedUser, JdbcTemplate jdbc,
                              RbacService rbac) {
        this.releaseRepository = releaseRepository;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
        this.jdbc = jdbc;
        this.rbac = rbac;
    }

    @GetMapping
    public List<Release> getReleases(@RequestParam(required = false) String projectId) {
        String userId = authenticatedUser.id();
        // Workspace-scoped (RB-40 §1): caller sees only releases in their workspaces' projects.
        return projectId != null
            ? releaseRepository.findByProjectIdScopedToUser(projectId, userId)
            : releaseRepository.findAllScopedToUser(userId);
    }

    @GetMapping("/{id}")
    public Release getRelease(@PathVariable String id) {
        Release release = releaseRepository.findById(id).orElseThrow();
        String wsId = rbac.workspaceForProject(release.getProjectId());
        if (wsId == null || rbac.getUserTier(authenticatedUser.id(), wsId) < 1) {
            throw ApiException.notFound("Release", id);
        }
        return release;
    }

    @GetMapping("/{id}/items")
    public List<Map<String, Object>> getReleaseItems(@PathVariable String id) {
        // Workspace-scoped (RB-40 §1): without this guard any authenticated user could read the
        // items of another tenant's release by id. Mirrors getRelease's access check above.
        Release release = releaseRepository.findById(id).orElseThrow(() -> ApiException.notFound("Release", id));
        String wsId = rbac.workspaceForProject(release.getProjectId());
        if (wsId == null || rbac.getUserTier(authenticatedUser.id(), wsId) < 1) {
            throw ApiException.notFound("Release", id);
        }
        return jdbc.queryForList(
            "SELECT w.id, w.title, w.type, w.status, w.assignee_id, w.story_points " +
            "FROM work_items w " +
            "JOIN work_item_releases r ON r.work_item_id = w.id " +
            "WHERE r.release_id = ? ORDER BY w.type, w.title", id);
    }

    @PostMapping
    public Release createRelease(@Valid @RequestBody Release release) {
        String userId = authenticatedUser.id();
        // Workspace-scoped (RB-40 §1): projectId comes from the request body, so without this guard
        // any authenticated user could create a release in another tenant's project. Mirrors the
        // access check in updateRelease / deleteRelease.
        String wsId = rbac.workspaceForProject(release.getProjectId());
        if (wsId == null || rbac.getUserTier(userId, wsId) < 1) {
            throw ApiException.notFound("Project", release.getProjectId());
        }
        release.setId("REL-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        release.setStatus(release.getStatus() != null ? release.getStatus() : "PLANNED");
        release.setCreatedBy(userId);
        release.setCreatedAt(OffsetDateTime.now());
        release.setUpdatedAt(OffsetDateTime.now());
        Release saved = releaseRepository.save(release);
        eventService.record(saved.getId(), "RELEASE_CREATED", userId, "{\"version\":\"" + saved.getVersion() + "\"}");
        return saved;
    }

    @PutMapping("/{id}")
    public Release updateRelease(@PathVariable String id, @Valid @RequestBody Release updated) {
        String userId = authenticatedUser.id();
        Release existing = releaseRepository.findById(id).orElseThrow(() -> ApiException.notFound("Release", id));
        String wsId = rbac.workspaceForProject(existing.getProjectId());
        if (wsId == null || rbac.getUserTier(userId, wsId) < 1) {
            throw ApiException.notFound("Release", id);
        }
        return releaseRepository.findById(id).map(r -> {
            r.setName(updated.getName());
            r.setDescription(updated.getDescription());
            r.setVersion(updated.getVersion());
            String oldStatus = r.getStatus();
            r.setStatus(updated.getStatus());
            r.setReleaseDate(updated.getReleaseDate());
            if ("RELEASED".equals(updated.getStatus()) && !"RELEASED".equals(oldStatus)) {
                r.setReleasedAt(OffsetDateTime.now());
            }
            r.setUpdatedAt(OffsetDateTime.now());
            Release saved = releaseRepository.save(r);
            eventService.record(id, "RELEASE_UPDATED", userId, "{\"status\":\"" + saved.getStatus() + "\"}");
            return saved;
        }).orElseThrow();
    }

    @PostMapping("/{id}/items/{workItemId}")
    public Map<String, String> addItemToRelease(@PathVariable String id, @PathVariable String workItemId) {
        String userId = authenticatedUser.id();
        Release release = releaseRepository.findById(id).orElseThrow(() -> ApiException.notFound("Release", id));
        String wsId = rbac.workspaceForProject(release.getProjectId());
        if (wsId == null || rbac.getUserTier(userId, wsId) < 1) {
            throw ApiException.notFound("Release", id);
        }
        // The item must live in the release's workspace — never associate another tenant's item (RB-40 §1).
        if (!wsId.equals(rbac.workspaceForWorkItem(workItemId))) throw ApiException.notFound("Work item", workItemId);
        jdbc.update("INSERT INTO work_item_releases (work_item_id, release_id, created_at) VALUES (?, ?, NOW()) " +
                    "ON CONFLICT DO NOTHING", workItemId, id);
        return Map.of("message", "Item added to release");
    }

    @DeleteMapping("/{id}/items/{workItemId}")
    public Map<String, String> removeItemFromRelease(@PathVariable String id, @PathVariable String workItemId) {
        String userId = authenticatedUser.id();
        Release release = releaseRepository.findById(id).orElseThrow(() -> ApiException.notFound("Release", id));
        String wsId = rbac.workspaceForProject(release.getProjectId());
        if (wsId == null || rbac.getUserTier(userId, wsId) < 1) {
            throw ApiException.notFound("Release", id);
        }
        jdbc.update("DELETE FROM work_item_releases WHERE work_item_id = ? AND release_id = ?", workItemId, id);
        return Map.of("message", "Item removed from release");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRelease(@PathVariable String id) {
        Release existing = releaseRepository.findById(id).orElseThrow(() -> ApiException.notFound("Release", id));
        String wsId = rbac.workspaceForProject(existing.getProjectId());
        if (wsId == null || rbac.getUserTier(authenticatedUser.id(), wsId) < 1) {
            throw ApiException.notFound("Release", id);
        }
        releaseRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
