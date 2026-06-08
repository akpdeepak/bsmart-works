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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/work-item-types")
public class WorkItemTypeConfigController {

    private final WorkItemTypeConfigRepository typeConfigRepo;
    private final AuthenticatedUser authenticatedUser;

    // The 7 MVP defaults live in one place (DefaultWorkItemTypes) so backend + frontend never drift.
    private static final List<Map<String, Object>> BUILT_IN_TYPES = DefaultWorkItemTypes.ALL;

    public WorkItemTypeConfigController(WorkItemTypeConfigRepository typeConfigRepo,
                                         AuthenticatedUser authenticatedUser) {
        this.typeConfigRepo = typeConfigRepo;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public Map<String, Object> list(@RequestParam(required = false) String workspaceId,
                                    @RequestParam(required = false) String projectId) {
        String userId = authenticatedUser.id();
        // Workspace-scoped (RB-40 §1): caller sees only custom types from their workspaces.
        List<WorkItemTypeConfig> customTypes = projectId != null
            ? typeConfigRepo.findByProjectId(projectId)
            : (workspaceId != null ? typeConfigRepo.findByWorkspaceId(workspaceId)
                                   : typeConfigRepo.findAllScopedToUser(userId));
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
