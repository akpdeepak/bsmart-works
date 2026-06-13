package com.bcits.works;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
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
    private final RbacService rbac;

    public BqlContextFactory(JdbcTemplate jdbc, RbacService rbac) {
        this.jdbc = jdbc;
        this.rbac = rbac;
    }

    /** Context for a human caller — sensitivity gated by their tier in this workspace. */
    public BqlContext forUser(String userId, String workspaceId) {
        boolean canSeeSensitive = rbac.getUserTier(userId, workspaceId) >= SENSITIVE_FIELD_MIN_TIER;
        return BqlContext.forUser(userId, canSeeSensitive, customFields(workspaceId));
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
