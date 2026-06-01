package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
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

    public ReleaseController(ReleaseRepository releaseRepository, EventService eventService,
                              AuthenticatedUser authenticatedUser, JdbcTemplate jdbc) {
        this.releaseRepository = releaseRepository;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
        this.jdbc = jdbc;
    }

    @GetMapping
    public List<Release> getReleases(@RequestParam(required = false) String projectId) {
        return projectId != null
            ? releaseRepository.findByProjectIdOrderByCreatedAtDesc(projectId)
            : releaseRepository.findAll();
    }

    @GetMapping("/{id}")
    public Release getRelease(@PathVariable String id) {
        return releaseRepository.findById(id).orElseThrow();
    }

    @GetMapping("/{id}/items")
    public List<Map<String, Object>> getReleaseItems(@PathVariable String id) {
        return jdbc.queryForList(
            "SELECT w.id, w.title, w.type, w.status, w.assignee_id, w.story_points " +
            "FROM work_items w " +
            "JOIN work_item_releases r ON r.work_item_id = w.id " +
            "WHERE r.release_id = ? ORDER BY w.type, w.title", id);
    }

    @PostMapping
    public Release createRelease(@Valid @RequestBody Release release) {
        String userId = authenticatedUser.id();
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
        jdbc.update("INSERT INTO work_item_releases (work_item_id, release_id, created_at) VALUES (?, ?, NOW()) " +
                    "ON CONFLICT DO NOTHING", workItemId, id);
        return Map.of("message", "Item added to release");
    }

    @DeleteMapping("/{id}/items/{workItemId}")
    public Map<String, String> removeItemFromRelease(@PathVariable String id, @PathVariable String workItemId) {
        jdbc.update("DELETE FROM work_item_releases WHERE work_item_id = ? AND release_id = ?", workItemId, id);
        return Map.of("message", "Item removed from release");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRelease(@PathVariable String id) {
        releaseRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
