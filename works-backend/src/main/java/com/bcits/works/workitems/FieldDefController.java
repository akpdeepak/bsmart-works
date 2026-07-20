package com.bcits.works.workitems;

import com.bcits.works.FieldDef;
import com.bcits.works.FieldDefRepository;

import com.bcits.works.security.CustomerAttributionPiiService;
import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.AuthenticatedUser;
import com.bcits.works.shared.FieldVisibilityService;
import com.bcits.works.shared.RbacGate;

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
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/field-defs")
public class FieldDefController {

    private final FieldDefRepository fieldDefRepo;
    private final WorkItemFieldValueRepository valueRepo;
    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;
    private final FieldVisibilityService fieldVisibility;
    // Generic per-record free-text vault tokenizer (shared with chat/feedback denorm copies, RB-40 §3):
    // tokenizes a PII-flagged custom field's text value under a per-value token and resolves it at render.
    private final CustomerAttributionPiiService fieldValuePii;

    public FieldDefController(FieldDefRepository fieldDefRepo,
                               WorkItemFieldValueRepository valueRepo,
                               AuthenticatedUser authenticatedUser,
                               RbacGate rbac,
                               FieldVisibilityService fieldVisibility,
                               CustomerAttributionPiiService fieldValuePii) {
        this.fieldDefRepo = fieldDefRepo;
        this.valueRepo = valueRepo;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
        this.fieldVisibility = fieldVisibility;
        this.fieldValuePii = fieldValuePii;
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
        // Tenant scoping (RB-40 §1): a field def is workspace-owned data, so creating one must be
        // gated by the caller's permission in *that* workspace. Previously this method ran with no
        // RBAC or workspace check at all, so any authenticated caller could create a field def in
        // any workspace. The other methods here scope by existing.getWorkspaceId(); create scopes
        // by the workspaceId on the incoming record.
        rbac.require(authenticatedUser.id(), fd.getWorkspaceId(), "view_items");
        fd.setId("FD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        fd.setCreatedAt(OffsetDateTime.now());
        if (fd.getConfig() == null) fd.setConfig("{}");
        return fieldDefRepo.save(fd);
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
            fd.setPii(updated.getPii());     // PII flag is editable (RB-40 §3, Slice 4b)
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
        Set<String> hidden = fieldVisibility.resolveForUser(userId, wsId).hiddenFieldDefIds();
        List<WorkItemFieldValue> visible = hidden.isEmpty()
            ? values
            : values.stream().filter(v -> !hidden.contains(v.getFieldDefId())).toList();
        resolvePiiValues(visible);
        return visible;
    }

    /**
     * Resolve PII-flagged custom field text values from the vault at render (RB-40 §3, Slice 4b) —
     * no-op while {@code read-from-vault} is off (the default), {@code "[erased]"} after a crypto-shred.
     * Mutates the rendered value in place at the controller boundary (outside any transaction), the same
     * precedent as the entity {@code scrub()} elsewhere, so the resolved value is never flushed back to
     * the legacy {@code value_text} column.
     */
    private void resolvePiiValues(List<WorkItemFieldValue> values) {
        if (values.isEmpty()) {
            return;
        }
        Set<String> defIds = values.stream().map(v -> v.getFieldDefId()).collect(Collectors.toSet());
        Map<String, FieldDef> defs = fieldDefRepo.findAllById(defIds).stream()
            .collect(Collectors.toMap(fd -> fd.getId(), fd -> fd));
        for (WorkItemFieldValue v : values) {
            FieldDef fd = defs.get(v.getFieldDefId());
            if (fd != null && Boolean.TRUE.equals(fd.getPii()) && v.getSubjectToken() != null) {
                v.setValueText(fieldValuePii.resolve(fd.getWorkspaceId(), v.getSubjectToken(), v.getValueText()));
            }
        }
    }

    @PutMapping("/values/{workItemId}/{fieldDefId}")
    public WorkItemFieldValue setValue(@PathVariable String workItemId,
                                       @PathVariable String fieldDefId,
                                       @Valid @RequestBody Map<String, Object> body) {
        // Field-level security (RB-40 §1, Cap C): reject create/update of a HIDDEN or READ_ONLY field
        // value by a tier not permitted to edit it. This is the canonical custom-field-value
        // create/update point for the unified work_item_field_value store.
        requireFieldWritable(authenticatedUser.id(), workItemId, fieldDefId);
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
        // Keep the typed date projection in sync so BQL can range-query DATE custom fields (V82),
        // and tokenize PII-flagged field text values into the vault (RB-40 §3, Slice 4b).
        fieldDefRepo.findById(fieldDefId).ifPresent(fd -> {
            if ("DATE".equalsIgnoreCase(fd.getFieldType())) {
                fv.setValueDate(parseIsoDate(fv.getValueText()));
            }
            if (Boolean.TRUE.equals(fd.getPii())) {
                // Tokenize the text value under a per-value token; legacy value_text stays authoritative
                // (dual-write) until the deferred CONTRACT migration drops it.
                fv.setSubjectToken(fieldValuePii.ensureVaulted(fd.getWorkspaceId(), fv.getSubjectToken(), fv.getValueText()));
            }
        });
        return valueRepo.save(fv);
    }

    @DeleteMapping("/values/{workItemId}/{fieldDefId}")
    public ResponseEntity<Void> deleteValue(@PathVariable String workItemId, @PathVariable String fieldDefId) {
        // Field-level security (RB-40 §1, Cap C): deleting a value mutates the field, so the same
        // HIDDEN/READ_ONLY write-guard as setValue applies — closing the previously-unguarded gap
        // (EPIC P1 §2/§5). A tier that may not edit the field may not clear it either.
        requireFieldWritable(authenticatedUser.id(), workItemId, fieldDefId);
        valueRepo.findByWorkItemIdAndFieldDefId(workItemId, fieldDefId).ifPresent(valueRepo::delete);
        return ResponseEntity.noContent().build();
    }

    /**
     * Field-level-security write guard for the unified {@code work_item_field_value} store
     * (RB-40 §1, EPIC P1 §5). Rejects a create/update/delete of a field value when the caller's
     * role-tier has a {@code HIDDEN} or {@code READ_ONLY} rule for that field in the item's workspace.
     *
     * <p>Resolves {@code (workspace, tier)} via {@link RbacGate} and the single
     * {@link FieldVisibilityService} resolver, then maps the verdict to the standard {@code FORBIDDEN}
     * (403) error shape via {@link ApiException#forbidden} (RB-10 §4, one error shape). The write path
     * fails <b>closed</b>: a resolution error propagates and denies the write (EPIC P1 §3.4).
     *
     * <p>{@code wsId == null} (item/project not found) and {@code tier == 0} (non-member) skip the
     * field check — those callers are bounded by the upstream tenant/RBAC scope, not by FLS; this
     * preserves the existing endpoint semantics rather than newly blocking legitimate edits.
     */
    private void requireFieldWritable(String userId, String workItemId, String fieldDefId) {
        String wsId = rbac.workspaceForWorkItem(workItemId);
        if (wsId == null) {
            return;
        }
        int tier = rbac.getUserTier(userId, wsId);
        if (tier <= 0) {
            return;
        }
        String vis = fieldVisibility.resolveFieldVisibility(fieldDefId, wsId, tier);
        if ("HIDDEN".equals(vis)) {
            throw ApiException.forbidden("You do not have permission to access this field.");
        }
        if ("READ_ONLY".equals(vis)) {
            throw ApiException.forbidden("This field is read-only for your role.");
        }
    }

    /** Parse an ISO date (optionally a longer timestamp) from its first 10 chars; null if not ISO. */
    private static LocalDate parseIsoDate(String text) {
        if (text == null || text.length() < 10) {
            return null;
        }
        try {
            return LocalDate.parse(text.substring(0, 10));
        } catch (DateTimeParseException e) {
            return null;
        }
    }
}
