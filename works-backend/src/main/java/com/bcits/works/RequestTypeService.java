package com.bcits.works;

import org.springframework.stereotype.Service;
import java.time.OffsetDateTime;
import java.util.Set;
import java.util.UUID;

/**
 * Pure field-level helpers for request types — id generation, key/priority normalization, form
 * schema defaults and update copying. No I/O, so it is unit-testable in isolation.
 */
@Service
public class RequestTypeService {

    static final Set<String> PRIORITIES = Set.of("CRITICAL", "HIGH", "MEDIUM", "LOW");
    static final String DEFAULT_PRIORITY = "MEDIUM";

    /** Coerce a free-text priority to a known value; unknown/blank falls back to MEDIUM. */
    public String normalizePriority(String priority) {
        if (priority == null) {
            return DEFAULT_PRIORITY;
        }
        String p = priority.trim().toUpperCase();
        return PRIORITIES.contains(p) ? p : DEFAULT_PRIORITY;
    }

    /** Normalize a type key to an UPPER_SNAKE token; defaults to CUSTOM when blank. */
    public String normalizeKey(String key) {
        if (key == null || key.isBlank()) {
            return "CUSTOM";
        }
        return key.trim().toUpperCase().replaceAll("[^A-Z0-9]+", "_").replaceAll("^_+|_+$", "");
    }

    /** form_schema defaults to an empty JSON array when absent. */
    public String normalizeFormSchema(String formSchema) {
        return formSchema == null || formSchema.isBlank() ? "[]" : formSchema;
    }

    /** Stamp a new request type with id, creator, normalized defaults and timestamps. */
    public RequestType prepareNew(RequestType type, String creatorId) {
        type.setId("RT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        type.setCreatedBy(creatorId);
        type.setTypeKey(normalizeKey(type.getTypeKey()));
        type.setDefaultPriority(normalizePriority(type.getDefaultPriority()));
        type.setFormSchema(normalizeFormSchema(type.getFormSchema()));
        type.setActive(type.getActive() == null || type.getActive());
        type.setIsSystem(false); // system types are seeded, not user-created via this path
        type.setSortOrder(type.getSortOrder() == null ? 0 : type.getSortOrder());
        OffsetDateTime now = OffsetDateTime.now();
        type.setCreatedAt(now);
        type.setUpdatedAt(now);
        return type;
    }

    /** Copy editable fields from {@code updated} onto {@code existing} and bump updatedAt. */
    public RequestType applyUpdate(RequestType existing, RequestType updated) {
        if (updated.getName() != null) {
            existing.setName(updated.getName());
        }
        if (updated.getDescription() != null) {
            existing.setDescription(updated.getDescription());
        }
        if (updated.getIcon() != null) {
            existing.setIcon(updated.getIcon());
        }
        if (updated.getFormSchema() != null) {
            existing.setFormSchema(normalizeFormSchema(updated.getFormSchema()));
        }
        if (updated.getDefaultPriority() != null) {
            existing.setDefaultPriority(normalizePriority(updated.getDefaultPriority()));
        }
        if (updated.getActive() != null) {
            existing.setActive(updated.getActive());
        }
        if (updated.getSortOrder() != null) {
            existing.setSortOrder(updated.getSortOrder());
        }
        existing.setUpdatedAt(OffsetDateTime.now());
        return existing;
    }
}
