package com.bcits.works;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * WI-11 — workspace-scoped feature-flag service (UIUX-EXECUTION-PLAN.md).
 *
 * <p>Every flag has a global default in {@code feature_flags}. A row in
 * {@code workspace_feature_flags} overrides the default for a specific workspace — absence means
 * "inherit the global default." This two-level model is the minimum needed for safe UX rollout and
 * A/B variant testing without a third-party SDK (RB-40 §3, DPDP).
 *
 * <p>Access rules:
 * <ul>
 *   <li>Any workspace member may read flags (needed by the UI to gate features).</li>
 *   <li>Only ADMIN-tier members may set or reset per-workspace overrides.</li>
 * </ul>
 */
@Service
public class FeatureFlagService {

    private final RbacService rbac;
    private final JdbcTemplate jdbc;

    public FeatureFlagService(RbacService rbac, JdbcTemplate jdbc) {
        this.rbac = rbac;
        this.jdbc = jdbc;
    }

    /**
     * Returns all flags for the workspace, with per-workspace overrides applied.
     * Any workspace member may call this.
     */
    public Map<String, Object> getFlags(String callerId, String workspaceId) {
        requireMember(callerId, workspaceId);
        List<Map<String, Object>> flags = jdbc.queryForList(
            "SELECT f.name, COALESCE(wf.enabled, f.enabled) AS enabled, wf.variant "
            + "FROM feature_flags f "
            + "LEFT JOIN workspace_feature_flags wf ON wf.flag_name = f.name AND wf.workspace_id = ? "
            + "ORDER BY f.name",
            workspaceId
        );
        return Map.of("flags", flags, "workspaceId", workspaceId);
    }

    /**
     * Upserts a per-workspace flag override. Requires ADMIN tier.
     */
    public void setFlagOverride(String callerId, String workspaceId,
                                String flagName, boolean enabled, String variant) {
        requireAdmin(callerId, workspaceId);
        jdbc.update(
            "INSERT INTO workspace_feature_flags (workspace_id, flag_name, enabled, variant) "
            + "VALUES (?, ?, ?, ?) "
            + "ON CONFLICT (workspace_id, flag_name) DO UPDATE SET enabled = EXCLUDED.enabled, variant = EXCLUDED.variant",
            workspaceId, flagName, enabled, variant
        );
    }

    /**
     * Removes the per-workspace override, reverting the flag to its global default. Requires ADMIN.
     */
    public void resetFlagOverride(String callerId, String workspaceId, String flagName) {
        requireAdmin(callerId, workspaceId);
        jdbc.update(
            "DELETE FROM workspace_feature_flags WHERE workspace_id = ? AND flag_name = ?",
            workspaceId, flagName
        );
    }

    // ── Guards ────────────────────────────────────────────────────────────────

    private void requireMember(String callerId, String wsId) {
        if (wsId == null || rbac.getUserTier(callerId, wsId) < 1) {
            throw ApiException.notFound("Workspace", wsId);
        }
    }

    private void requireAdmin(String callerId, String wsId) {
        requireMember(callerId, wsId);
        if (!rbac.isAdmin(callerId, wsId)) {
            throw ApiException.forbidden("Feature-flag overrides require workspace administrator access.");
        }
    }
}
