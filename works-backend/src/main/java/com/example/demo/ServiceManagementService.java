package com.example.demo;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Pure field-level helpers for service management (iteration 9, Cap N) — id generation, defaults,
 * normalization, update copying, server-side form validation, and CSAT aggregation math. No I/O, so
 * it is unit-testable in isolation (mirrors {@link SlaPolicyService} / {@link ComplianceRuleService}).
 * RBAC, persistence, events, and organization-scoping live in the controller/service boundary.
 */
@Service
public class ServiceManagementService {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    static final List<String> REQUEST_CATEGORIES =
            List.of("INCIDENT", "CHANGE_REQUEST", "SERVICE_REQUEST", "CUSTOM");
    static final List<String> REQUEST_PRIORITIES = List.of("LOW", "MEDIUM", "HIGH", "CRITICAL");
    static final List<String> ORG_TIERS = List.of("PLATINUM", "GOLD", "SILVER");

    private static String json(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private static String upper(String value, String fallback, List<String> allowed) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        String v = value.trim().toUpperCase();
        return allowed.contains(v) ? v : fallback;
    }

    // ── Customer organizations ───────────────────────────────────────────────────

    /** Stamp a new customer organization with id, creator, normalized tier, and timestamps. */
    public CustomerOrganization prepareOrganization(CustomerOrganization org, String creatorId) {
        org.setId("CORG-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        org.setCreatedBy(creatorId);
        org.setTier(upper(org.getTier(), "SILVER", ORG_TIERS));
        if (org.getSubdomain() != null) {
            String s = org.getSubdomain().trim().toLowerCase();
            org.setSubdomain(s.isEmpty() ? null : s);
        }
        org.setActive(org.getActive() == null || org.getActive());
        OffsetDateTime now = OffsetDateTime.now();
        org.setCreatedAt(now);
        org.setUpdatedAt(now);
        return org;
    }

    /** Copy editable organization fields from {@code updated} onto {@code existing}; bump updatedAt. */
    public CustomerOrganization applyOrganizationUpdate(CustomerOrganization existing, CustomerOrganization updated) {
        existing.setName(updated.getName());
        existing.setTier(upper(updated.getTier(), existing.getTier(), ORG_TIERS));
        if (updated.getSubdomain() != null) {
            String s = updated.getSubdomain().trim().toLowerCase();
            existing.setSubdomain(s.isEmpty() ? null : s);
        }
        existing.setLogoUrl(updated.getLogoUrl());
        existing.setPrimaryColor(updated.getPrimaryColor());
        if (updated.getActive() != null) {
            existing.setActive(updated.getActive());
        }
        existing.setUpdatedAt(OffsetDateTime.now());
        return existing;
    }

    // ── Request types ────────────────────────────────────────────────────────────

    /** Stamp a new request type with id, creator, normalized category + JSON defaults, timestamps. */
    public RequestType prepareRequestType(RequestType type, String creatorId) {
        type.setId("RQT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        type.setCreatedBy(creatorId);
        type.setCategory(upper(type.getCategory(), "SERVICE_REQUEST", REQUEST_CATEGORIES));
        type.setFormSchema(json(type.getFormSchema(), "[]"));
        type.setActive(type.getActive() == null || type.getActive());
        if (type.getSortOrder() == null) {
            type.setSortOrder(0);
        }
        OffsetDateTime now = OffsetDateTime.now();
        type.setCreatedAt(now);
        type.setUpdatedAt(now);
        return type;
    }

    /** Copy editable request-type fields from {@code updated} onto {@code existing}; bump updatedAt. */
    public RequestType applyRequestTypeUpdate(RequestType existing, RequestType updated) {
        existing.setName(updated.getName());
        existing.setCategory(upper(updated.getCategory(), existing.getCategory(), REQUEST_CATEGORIES));
        existing.setDescription(updated.getDescription());
        if (updated.getFormSchema() != null) {
            existing.setFormSchema(json(updated.getFormSchema(), "[]"));
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

    // ── Customer requests ────────────────────────────────────────────────────────

    /** Stamp a new portal request with id, normalized priority + JSON defaults, and timestamps. */
    public CustomerRequest prepareRequest(CustomerRequest req, String organizationId,
                                          String workspaceId, String submittedBy) {
        req.setId("REQ-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        req.setOrganizationId(organizationId);
        req.setWorkspaceId(workspaceId);
        req.setSubmittedBy(submittedBy);
        req.setStatus("OPEN");
        req.setPriority(upper(req.getPriority(), "MEDIUM", REQUEST_PRIORITIES));
        req.setFormData(json(req.getFormData(), "{}"));
        req.setAssigneeId(null);     // a portal submission is always unassigned at birth
        req.setWorkItemId(null);
        req.setCsatRating(null);
        req.setCsatComment(null);
        OffsetDateTime now = OffsetDateTime.now();
        req.setCreatedAt(now);
        req.setUpdatedAt(now);
        return req;
    }

    /**
     * Validate submitted answers against a request type's {@code formSchema}: every field marked
     * {@code "required": true} must have a non-blank answer keyed by its {@code "key"}. Returns the
     * list of missing field labels (empty = valid). A malformed schema validates as "no requirements"
     * so a bad admin definition never blocks a customer.
     */
    public List<String> missingRequiredFields(String formSchemaJson, String formDataJson) {
        List<String> missing = new ArrayList<>();
        try {
            JsonNode schema = MAPPER.readTree(json(formSchemaJson, "[]"));
            JsonNode data = MAPPER.readTree(json(formDataJson, "{}"));
            if (!schema.isArray()) {
                return missing;
            }
            for (JsonNode field : schema) {
                if (!field.path("required").asBoolean(false)) {
                    continue;
                }
                String key = field.path("key").asText("");
                if (key.isEmpty()) {
                    continue;
                }
                JsonNode answer = data.get(key);
                boolean blank = answer == null || answer.isNull()
                        || (answer.isTextual() && answer.asText().isBlank());
                if (blank) {
                    String label = field.path("label").asText(key);
                    missing.add(label);
                }
            }
        } catch (Exception e) {
            // A malformed schema/data is treated as "nothing required" — never crash a submission.
            return missing;
        }
        return missing;
    }

    /**
     * Aggregate CSAT ratings into average (1 decimal), count, and a 1–5 distribution. Ratings
     * outside 1–5 (or null) are ignored. The distribution is always a full 5-key map so the UI can
     * render every bar even when a score has zero responses.
     */
    public Map<String, Object> aggregateCsat(List<Integer> ratings) {
        Map<String, Long> distribution = new LinkedHashMap<>();
        for (int score = 1; score <= 5; score++) {
            distribution.put(String.valueOf(score), 0L);
        }
        long count = 0;
        long sum = 0;
        for (Integer r : ratings) {
            if (r == null || r < 1 || r > 5) {
                continue;
            }
            distribution.put(String.valueOf(r), distribution.get(String.valueOf(r)) + 1);
            count++;
            sum += r;
        }
        double average = count == 0 ? 0.0 : Math.round((double) sum / count * 10.0) / 10.0;
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("average", average);
        out.put("count", count);
        out.put("distribution", distribution);
        return out;
    }
}
