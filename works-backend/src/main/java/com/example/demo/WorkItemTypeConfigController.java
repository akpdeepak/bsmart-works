package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.*;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/work-item-types")
public class WorkItemTypeConfigController {

    private final WorkItemTypeConfigRepository typeConfigRepo;
    private final AuthenticatedUser authenticatedUser;

    private static final List<Map<String, Object>> BUILT_IN_TYPES = List.of(
        Map.of("typeKey", "STORY",           "label", "Story",           "icon", "📖", "color", "#22c55e", "isCustom", false),
        Map.of("typeKey", "TASK",            "label", "Task",            "icon", "✓",  "color", "#3b82f6", "isCustom", false),
        Map.of("typeKey", "BUG",             "label", "Bug",             "icon", "🐛", "color", "#ef4444", "isCustom", false),
        Map.of("typeKey", "EPIC",            "label", "Epic",            "icon", "⚡", "color", "#a855f7", "isCustom", false),
        Map.of("typeKey", "SUBTASK",         "label", "Sub-task",        "icon", "↳",  "color", "#6b7280", "isCustom", false),
        Map.of("typeKey", "INCIDENT",        "label", "Incident",        "icon", "🔥", "color", "#f97316", "isCustom", false),
        Map.of("typeKey", "SERVICE_REQUEST", "label", "Service Request", "icon", "🎫", "color", "#0b2f5c", "isCustom", false)
    );

    public WorkItemTypeConfigController(WorkItemTypeConfigRepository typeConfigRepo,
                                         AuthenticatedUser authenticatedUser) {
        this.typeConfigRepo = typeConfigRepo;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public Map<String, Object> list(@RequestParam(required = false) String workspaceId,
                                    @RequestParam(required = false) String projectId) {
        List<WorkItemTypeConfig> customTypes = projectId != null
            ? typeConfigRepo.findByProjectId(projectId)
            : (workspaceId != null ? typeConfigRepo.findByWorkspaceId(workspaceId) : typeConfigRepo.findAll());
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("builtIn", BUILT_IN_TYPES);
        result.put("custom", customTypes);
        return result;
    }

    @PostMapping
    public WorkItemTypeConfig create(@Valid @RequestBody WorkItemTypeConfig config) {
        config.setId("WIT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        config.setIsCustom(true);
        config.setCreatedAt(OffsetDateTime.now());
        return typeConfigRepo.save(config);
    }

    @PutMapping("/{id}")
    public WorkItemTypeConfig update(@PathVariable String id, @Valid @RequestBody WorkItemTypeConfig updated) {
        return typeConfigRepo.findById(id).map(c -> {
            c.setLabel(updated.getLabel());
            c.setIcon(updated.getIcon());
            c.setColor(updated.getColor());
            c.setTypeKey(updated.getTypeKey());
            return typeConfigRepo.save(c);
        }).orElseThrow();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        typeConfigRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
