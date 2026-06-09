package com.bcits.works;

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
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/field-defs")
public class FieldDefController {

    private final FieldDefRepository fieldDefRepo;
    private final WorkItemFieldValueRepository valueRepo;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;
    private final JdbcTemplate jdbc;

    public FieldDefController(FieldDefRepository fieldDefRepo,
                               WorkItemFieldValueRepository valueRepo,
                               AuthenticatedUser authenticatedUser,
                               RbacService rbac,
                               JdbcTemplate jdbc) {
        this.fieldDefRepo = fieldDefRepo;
        this.valueRepo = valueRepo;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
        this.jdbc = jdbc;
    }

    /**
     * Returns the most-restrictive field visibility for a (fieldDefId, workspace, tier) tuple.
     * Looks up role_def entries in the workspace whose tier matches the user's tier, then finds
     * the most restrictive visibility rule across those roles (HIDDEN > READ_ONLY > EDITABLE).
     * Returns "EDITABLE" when no rule is configured — the safe default.
     */
    private String resolveFieldVisibility(String fieldDefId, String wsId, int tier) {
        try {
            String vis = jdbc.queryForObject(
                "SELECT fv.visibility FROM field_visibility fv " +
                "JOIN role_def rd ON rd.id = fv.role_def_id " +
                "WHERE fv.field_def_id = ? AND rd.workspace_id = ? AND rd.tier = ? " +
                "ORDER BY CASE fv.visibility WHEN 'HIDDEN' THEN 1 WHEN 'READ_ONLY' THEN 2 ELSE 3 END " +
                "LIMIT 1",
                String.class, fieldDefId, wsId, tier);
            return vis != null ? vis : "EDITABLE";
        } catch (Exception e) {
            return "EDITABLE";
        }
    }

    /** Returns the set of fieldDefIds that are HIDDEN for the user's tier in the workspace. */
    private Set<String> hiddenFieldIds(String wsId, int tier) {
        try {
            return new HashSet<>(jdbc.queryForList(
                "SELECT fv.field_def_id FROM field_visibility fv " +
                "JOIN role_def rd ON rd.id = fv.role_def_id " +
                "WHERE rd.workspace_id = ? AND rd.tier = ? AND fv.visibility = 'HIDDEN'",
                String.class, wsId, tier));
        } catch (Exception e) {
            return Set.of();
        }
    }

    @GetMapping
    public List<FieldDef> list(@RequestParam(required = false) String projectId,
                               @RequestParam(required = false) String workspaceId) {
        if (projectId != null) {
            return fieldDefRepo.findByProjectIdOrderByPosition(projectId);
        }
        if (workspaceId != null) {
            return fieldDefRepo.findByWorkspaceIdOrderByPosition(workspaceId);
        }
        throw ApiException.badRequest("MISSING_PARAM", "Either projectId or workspaceId is required");
    }

    @GetMapping("/{id}")
    public FieldDef get(@PathVariable String id) {
        FieldDef fd = fieldDefRepo.findById(id).orElseThrow();
        rbac.require(authenticatedUser.id(), fd.getWorkspaceId(), "view_items");
        return fd;
    }

    @PostMapping
    public FieldDef create(@Valid @RequestBody FieldDef fd) {
        fd.setId("FD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        fd.setCreatedAt(OffsetDateTime.now());
        if (fd.getConfig() == null) fd.setConfig("{}"); {
        return fieldDefRepo.save(fd);
        }
    }

    @PutMapping("/{id}")
    public FieldDef update(@PathVariable String id, @Valid @RequestBody FieldDef updated) {
        FieldDef existing = fieldDefRepo.findById(id).orElseThrow();
        rbac.require(authenticatedUser.id(), existing.getWorkspaceId(), "view_items");
        return fieldDefRepo.findById(id).map(fd -> {
            fd.setName(updated.getName());
            fd.setFieldType(updated.getFieldType());
            if (updated.getConfig() != null) fd.setConfig(updated.getConfig()); {
            fd.setRequired(updated.getRequired());
            }
            fd.setPosition(updated.getPosition());
            return fieldDefRepo.save(fd);
        }).orElseThrow();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        FieldDef existing = fieldDefRepo.findById(id).orElseThrow();
        rbac.require(authenticatedUser.id(), existing.getWorkspaceId(), "view_items");
        fieldDefRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // Get/set field values for a work item
    @GetMapping("/values/{workItemId}")
    public List<WorkItemFieldValue> getValues(@PathVariable String workItemId) {
        String userId = authenticatedUser.id();
        List<WorkItemFieldValue> values = valueRepo.findByWorkItemId(workItemId);
        // Field-level security (RB-40 §1, Cap C): filter out HIDDEN fields for the user's role.
        String wsId = rbac.workspaceForWorkItem(workItemId);
        if (wsId != null) {
            int tier = rbac.getUserTier(userId, wsId);
            if (tier > 0) {
                Set<String> hidden = hiddenFieldIds(wsId, tier);
                if (!hidden.isEmpty()) {
                    return values.stream().filter(v -> !hidden.contains(v.getFieldDefId())).toList();
                }
            }
        }
        return values;
    }

    @PutMapping("/values/{workItemId}/{fieldDefId}")
    public WorkItemFieldValue setValue(@PathVariable String workItemId,
                                       @PathVariable String fieldDefId,
                                       @Valid @RequestBody Map<String, Object> body) {
        String userId = authenticatedUser.id();
        // Field-level security (RB-40 §1, Cap C): reject writes to HIDDEN or READ_ONLY fields.
        String wsId = rbac.workspaceForWorkItem(workItemId);
        if (wsId != null) {
            int tier = rbac.getUserTier(userId, wsId);
            if (tier > 0) {
                String vis = resolveFieldVisibility(fieldDefId, wsId, tier);
                if ("HIDDEN".equals(vis)) {
                    throw ApiException.forbidden("You do not have permission to access this field.");
                }
                if ("READ_ONLY".equals(vis)) {
                    throw ApiException.forbidden("This field is read-only for your role.");
                }
            }
        }
        WorkItemFieldValue fv = valueRepo.findByWorkItemIdAndFieldDefId(workItemId, fieldDefId)
                .orElseGet(() -> {
                    WorkItemFieldValue newFv = new WorkItemFieldValue();
                    newFv.setId("FV-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                    newFv.setWorkItemId(workItemId);
                    newFv.setFieldDefId(fieldDefId);
                    newFv.setCreatedAt(OffsetDateTime.now());
                    return newFv;
                });
        if (body.containsKey("valueText")) fv.setValueText((String) body.get("valueText"));
        if (body.containsKey("valueNumber") && body.get("valueNumber") != null) {
            fv.setValueNumber(new BigDecimal(body.get("valueNumber").toString()));
        }
        if (body.containsKey("valueJson")) fv.setValueJson(body.get("valueJson") != null ? body.get("valueJson").toString() : null); {
        fv.setUpdatedAt(OffsetDateTime.now());
        }
        return valueRepo.save(fv);
    }

    @DeleteMapping("/values/{workItemId}/{fieldDefId}")
    public ResponseEntity<Void> deleteValue(@PathVariable String workItemId, @PathVariable String fieldDefId) {
        valueRepo.findByWorkItemIdAndFieldDefId(workItemId, fieldDefId).ifPresent(valueRepo::delete);
        return ResponseEntity.noContent().build();
    }
}
