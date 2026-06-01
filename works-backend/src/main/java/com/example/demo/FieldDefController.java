package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/field-defs")
public class FieldDefController {

    private final FieldDefRepository fieldDefRepo;
    private final WorkItemFieldValueRepository valueRepo;
    private final AuthenticatedUser authenticatedUser;

    public FieldDefController(FieldDefRepository fieldDefRepo,
                               WorkItemFieldValueRepository valueRepo,
                               AuthenticatedUser authenticatedUser) {
        this.fieldDefRepo = fieldDefRepo;
        this.valueRepo = valueRepo;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<FieldDef> list(@RequestParam(required = false) String projectId,
                               @RequestParam(required = false) String workspaceId) {
        if (projectId != null) return fieldDefRepo.findByProjectIdOrderByPosition(projectId);
        if (workspaceId != null) return fieldDefRepo.findByWorkspaceIdOrderByPosition(workspaceId);
        return fieldDefRepo.findAll();
    }

    @GetMapping("/{id}")
    public FieldDef get(@PathVariable String id) {
        return fieldDefRepo.findById(id).orElseThrow();
    }

    @PostMapping
    public FieldDef create(@Valid @RequestBody FieldDef fd) {
        fd.setId("FD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        fd.setCreatedAt(OffsetDateTime.now());
        if (fd.getConfig() == null) fd.setConfig("{}");
        return fieldDefRepo.save(fd);
    }

    @PutMapping("/{id}")
    public FieldDef update(@PathVariable String id, @Valid @RequestBody FieldDef updated) {
        return fieldDefRepo.findById(id).map(fd -> {
            fd.setName(updated.getName());
            fd.setFieldType(updated.getFieldType());
            if (updated.getConfig() != null) fd.setConfig(updated.getConfig());
            fd.setRequired(updated.getRequired());
            fd.setPosition(updated.getPosition());
            return fieldDefRepo.save(fd);
        }).orElseThrow();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        fieldDefRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // Get/set field values for a work item
    @GetMapping("/values/{workItemId}")
    public List<WorkItemFieldValue> getValues(@PathVariable String workItemId) {
        return valueRepo.findByWorkItemId(workItemId);
    }

    @PutMapping("/values/{workItemId}/{fieldDefId}")
    public WorkItemFieldValue setValue(@PathVariable String workItemId,
                                       @PathVariable String fieldDefId,
                                       @Valid @RequestBody Map<String, Object> body) {
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
        if (body.containsKey("valueJson")) fv.setValueJson(body.get("valueJson") != null ? body.get("valueJson").toString() : null);
        fv.setUpdatedAt(OffsetDateTime.now());
        return valueRepo.save(fv);
    }

    @DeleteMapping("/values/{workItemId}/{fieldDefId}")
    public ResponseEntity<Void> deleteValue(@PathVariable String workItemId, @PathVariable String fieldDefId) {
        valueRepo.findByWorkItemIdAndFieldDefId(workItemId, fieldDefId).ifPresent(valueRepo::delete);
        return ResponseEntity.noContent().build();
    }
}
