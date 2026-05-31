package com.example.demo;

import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/saved-filters")
public class SavedFilterController {

    private final SavedFilterRepository repository;

    public SavedFilterController(SavedFilterRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<SavedFilter> getFilters(
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        return repository.findByWorkspaceIdAndIsSharedOrCreatedBy("WS-001", true, userId != null ? userId : "");
    }

    @PostMapping
    public SavedFilter createFilter(@RequestBody SavedFilter filter,
                                    @RequestHeader(value = "X-User-Id", required = false) String userId) {
        filter.setWorkspaceId("WS-001");
        filter.setCreatedBy(userId);
        filter.setCreatedAt(OffsetDateTime.now());
        return repository.save(filter);
    }

    @DeleteMapping("/{id}")
    public void deleteFilter(@PathVariable Long id) {
        repository.deleteById(id);
    }
}

