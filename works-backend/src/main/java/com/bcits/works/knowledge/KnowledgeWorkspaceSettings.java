package com.bcits.works.knowledge;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.EventService;
import com.bcits.works.shared.RbacGate;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

/**
 * Knowledge workspace settings (KR-030): reads/writes the comment digest frequency in
 * {@code workspace_configs.document} JSONB under key {@code knowledge.commentDigestFrequency}.
 * RBAC is enforced here, never in the controller (RB-10 §2). All access is workspace-scoped
 * (RB-40 §1). A workspace with no row (or an unrecognised value) defaults to "off".
 */
@Service
public class KnowledgeWorkspaceSettings {

    private static final List<String> VALID_FREQUENCIES = List.of("off", "daily", "weekly");

    private final JdbcTemplate jdbc;
    private final RbacGate rbacService;
    private final EventService eventService;

    public KnowledgeWorkspaceSettings(JdbcTemplate jdbc, RbacGate rbacService,
                                       EventService eventService) {
        this.jdbc = jdbc;
        this.rbacService = rbacService;
        this.eventService = eventService;
    }

    /** Get comment digest frequency for a workspace. Default: "off". */
    public String getCommentDigestFrequency(String workspaceId) {
        try {
            String val = jdbc.queryForObject(
                "SELECT document->>'knowledge.commentDigestFrequency' FROM workspace_configs WHERE workspace_id = ?",
                String.class, workspaceId);
            if (val != null && VALID_FREQUENCIES.contains(val)) return val;
        } catch (Exception ignored) {
            // missing row or null value — fall through to default
        }
        return "off";
    }

    /** Set comment digest frequency — requires manage_workspace permission. */
    public String setCommentDigestFrequency(String workspaceId, String userId, String frequency) {
        rbacService.require(userId, workspaceId, "manage_workspace");
        if (frequency == null || !VALID_FREQUENCIES.contains(frequency.toLowerCase())) {
            throw ApiException.badRequest("INVALID_FREQUENCY",
                "frequency must be one of: off, daily, weekly.", "frequency");
        }
        String freq = frequency.toLowerCase();
        // Upsert: insert a new row or merge the key into the existing document
        jdbc.update(
            "INSERT INTO workspace_configs(workspace_id, document, current_version, updated_by, updated_at) "
            + "VALUES (?, jsonb_build_object('knowledge.commentDigestFrequency', ?::text), 1, ?, ?) "
            + "ON CONFLICT (workspace_id) DO UPDATE SET "
            + "  document = workspace_configs.document || jsonb_build_object('knowledge.commentDigestFrequency', "
            + "    EXCLUDED.document->>'knowledge.commentDigestFrequency'), "
            + "  current_version = workspace_configs.current_version + 1, "
            + "  updated_by = ?, "
            + "  updated_at = ?",
            workspaceId, freq, userId, OffsetDateTime.now(),
            userId, OffsetDateTime.now());
        eventService.recordInWorkspace(workspaceId, workspaceId,
            "KNOWLEDGE_DIGEST_SETTINGS_UPDATED", userId,
            Map.of("frequency", freq));
        return freq;
    }

    /** Get all workspace IDs where the digest frequency matches the given value. */
    public List<String> getWorkspacesWithFrequency(String frequency) {
        return jdbc.queryForList(
            "SELECT workspace_id FROM workspace_configs WHERE document->>'knowledge.commentDigestFrequency' = ?",
            String.class, frequency);
    }
}
