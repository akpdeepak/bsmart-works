package com.bcits.works.shared;
import com.bcits.works.workitems.WorkItemReadService;
import com.bcits.works.workspaces.api.Workspace;


import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Builds the {@link BqlContext} for a user in a workspace — the field-level-security gate plus the
 * workspace's queryable custom fields. Centralised so every BQL entry point (the BQL endpoint, the
 * saved-view run, the subscription scheduler) resolves field visibility the same way; if this lived
 * per-caller, one path could silently grant access another denies (RB-40 §1 field security).
 */
@Service
public class BqlContextFactory {

    /** Tier at/above which leadership-sensitive fields (e.g. businessValue) are queryable. */
    private static final int SENSITIVE_FIELD_MIN_TIER = 3; // LEAD+

    private final JdbcTemplate jdbc;
    private final RbacGate rbac;
    private final FieldVisibilityService fieldVisibility;

    public BqlContextFactory(JdbcTemplate jdbc, RbacGate rbac, FieldVisibilityService fieldVisibility) {
        this.jdbc = jdbc;
        this.rbac = rbac;
        this.fieldVisibility = fieldVisibility;
    }

    /** Context for a human caller — sensitivity gated by their tier in this workspace. */
    public BqlContext forUser(String userId, String workspaceId) {
        int tier = rbac.getUserTier(userId, workspaceId);
        boolean canSeeSensitive = tier >= SENSITIVE_FIELD_MIN_TIER;
        Map<String, BqlContext.CustomField> fields = customFields(workspaceId);
        // Field-level security at BQL compile time (RB-40 §1; spec 06 §5.5; FLS Slice 2). Drop custom
        // fields that are HIDDEN for this caller's tier so they cannot be referenced in a BQL filter.
        // Without this, a low-tier user could filter on a HIDDEN field (e.g. `salary > X`) and infer its
        // value from which rows match — an inference oracle the read-path value-redaction
        // (WorkItemReadService.redactHiddenFieldValues) does NOT close, because it strips the value from
        // the *response*, not from the *filter*. Excluding the field here makes the compiler reject a
        // reference to it as an unknown field (BqlFieldRegistry.resolve throws), so a HIDDEN field is
        // indistinguishable from a non-existent one — consistent with the read path's "not yours".
        // System/trusted BQL (compliance, KPI, the legacy compile) uses BqlContext.trusted/forUser with
        // NO custom fields, so it is unaffected; only the three user-facing forUser callers are gated.
        if (!fields.isEmpty()) {
            Set<String> hidden = fieldVisibility.hiddenFieldIds(workspaceId, tier);
            if (!hidden.isEmpty()) {
                fields.values().removeIf(cf -> hidden.contains(cf.fieldDefId()));
            }
        }
        return BqlContext.forUser(userId, canSeeSensitive, fields);
    }

    /** Workspace custom fields keyed by field_key — makes them queryable in BQL (RB-10 §6). */
    public Map<String, BqlContext.CustomField> customFields(String workspaceId) {
        Map<String, BqlContext.CustomField> out = new LinkedHashMap<>();
        try {
            jdbc.query("SELECT id, field_key, field_type FROM field_def WHERE workspace_id = ?",
                rs -> {
                    String key = rs.getString("field_key");
                    if (key == null || key.isBlank()) {
                        return;
                    }
                    String ft = rs.getString("field_type");
                    BqlField.BqlType type = "NUMBER".equalsIgnoreCase(ft) ? BqlField.BqlType.NUMBER
                        : "DATE".equalsIgnoreCase(ft) ? BqlField.BqlType.DATE
                        : BqlField.BqlType.TEXT;
                    out.put(key.toLowerCase(Locale.ROOT),
                        new BqlContext.CustomField(rs.getString("id"), type));
                }, workspaceId);
        } catch (Exception ignored) {
            // No custom fields / table absent — built-in fields still work.
        }
        return out;
    }
}
