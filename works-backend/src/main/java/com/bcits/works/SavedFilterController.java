package com.bcits.works;

import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.List;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/saved-filters")
public class SavedFilterController {

    private final SavedFilterRepository repository;
    private final AuthenticatedUser authenticatedUser;

    public SavedFilterController(SavedFilterRepository repository, AuthenticatedUser authenticatedUser) {
        this.repository = repository;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<SavedFilter> getFilters() {
        String userId = authenticatedUser.id();
        return repository.findByWorkspaceIdAndIsSharedOrCreatedBy("WS-001", true, userId);
    }

    @PostMapping
    public SavedFilter createFilter(@Valid @RequestBody SavedFilter filter) {
        String userId = authenticatedUser.id();
        filter.setWorkspaceId("WS-001");
        filter.setCreatedBy(userId);
        filter.setCreatedAt(OffsetDateTime.now());
        return repository.save(filter);
    }

    @PutMapping("/{id}/share")
    public SavedFilter toggleShare(@PathVariable Long id) {
        return repository.findById(id).map(f -> {
            f.setShared(!Boolean.TRUE.equals(f.isShared()));
            return repository.save(f);
        }).orElseThrow();
    }

    @DeleteMapping("/{id}")
    public void deleteFilter(@PathVariable Long id) {
        repository.deleteById(id);
    }
}
