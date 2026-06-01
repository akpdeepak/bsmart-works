package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.*;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/lessons-learned")
public class LessonLearnedController {

    private final LessonLearnedRepository repo;
    private final AuthenticatedUser authenticatedUser;

    public LessonLearnedController(LessonLearnedRepository repo, AuthenticatedUser authenticatedUser) {
        this.repo = repo;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<LessonLearned> list(@RequestParam(required = false) String projectId,
                                     @RequestParam(required = false) String workspaceId) {
        if (projectId != null)   return repo.findByProjectIdAndDeletedAtIsNull(projectId);
        if (workspaceId != null) return repo.findByWorkspaceIdAndDeletedAtIsNull(workspaceId);
        return repo.findAll();
    }

    @GetMapping("/{id}")
    public LessonLearned get(@PathVariable String id) { return repo.findById(id).orElseThrow(); }

    @PostMapping
    public LessonLearned create(@Valid @RequestBody LessonLearned ll) {
        ll.setId("LL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        ll.setCreatedBy(authenticatedUser.id());
        ll.setCreatedAt(OffsetDateTime.now());
        ll.setUpdatedAt(OffsetDateTime.now());
        if (ll.getTags() == null) ll.setTags("[]");
        return repo.save(ll);
    }

    @PutMapping("/{id}")
    public LessonLearned update(@PathVariable String id, @Valid @RequestBody LessonLearned updated) {
        return repo.findById(id).map(ll -> {
            ll.setTitle(updated.getTitle());
            ll.setDescription(updated.getDescription());
            ll.setCategory(updated.getCategory());
            ll.setWhatWorked(updated.getWhatWorked());
            ll.setWhatDidntWork(updated.getWhatDidntWork());
            ll.setRecommendation(updated.getRecommendation());
            if (updated.getTags() != null) ll.setTags(updated.getTags());
            ll.setUpdatedAt(OffsetDateTime.now());
            return repo.save(ll);
        }).orElseThrow();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        repo.findById(id).ifPresent(ll -> { ll.setDeletedAt(OffsetDateTime.now()); repo.save(ll); });
        return ResponseEntity.noContent().build();
    }
}
