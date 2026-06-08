package com.bcits.works;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Config impact analysis (iteration 17, Cap R) — the pre-confirmation summary shown before a change
 * lands: "Affects N items, M users, K automations. Continue?". It diffs a proposed document against
 * the workspace's current live config and pairs the structural changes with real counts pulled from
 * the workspace's data, plus human-readable warnings for the changes most likely to disrupt
 * (timezone / working-calendar shifts, removed custom forms or pages, enabled extensions, touched
 * locked paths). Read-only and workspace-scoped (RB-40 §1): every count query filters on workspace_id.
 */
@Service
public class ConfigImpactService {

    private final ConfigService configService;
    private final ConfigDiffService diffService;
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper = new ObjectMapper();

    public ConfigImpactService(ConfigService configService, ConfigDiffService diffService, JdbcTemplate jdbc) {
        this.configService = configService;
        this.diffService = diffService;
        this.jdbc = jdbc;
    }

    public record ImpactReport(int affectedUsers, int affectedAutomations, int affectedItems,
                               List<ConfigDiffService.ConfigChange> changes, List<String> warnings) { }

    /** Analyse the impact of applying {@code proposedDocument} over the workspace's live config. */
    public ImpactReport analyze(String workspaceId, String proposedDocument) {
        String current = configService.getLiveDocument(workspaceId);
        List<ConfigDiffService.ConfigChange> changes = diffService.diff(current, proposedDocument);

        int users = count(
                "SELECT COUNT(*) FROM workspace_members WHERE workspace_id = ?", workspaceId);
        int automations = count(
                "SELECT COUNT(*) FROM automation_rules WHERE workspace_id = ?", workspaceId);
        int items = count(
                "SELECT COUNT(*) FROM work_items wi JOIN projects p ON p.id = wi.project_id "
                        + "WHERE p.workspace_id = ?", workspaceId);

        List<String> warnings = new ArrayList<>();
        boolean touchesUsers = false;
        boolean touchesAutomations = false;

        for (ConfigDiffService.ConfigChange c : changes) {
            String path = c.path();
            if (path.equals("settings.timezone") || path.startsWith("settings.workingCalendar")) {
                touchesUsers = true;
                touchesAutomations = true;
                warnings.add("Working time changed (" + path
                        + ") — recalculates SLA clocks and due dates for every member.");
            } else if (path.startsWith("settings.defaults")) {
                warnings.add("Default changed (" + path + ") — applies to newly created items only.");
            } else if (path.startsWith("forms") && c.op() == ConfigDiffService.Op.REMOVED) {
                warnings.add("A custom form was removed — entry surfaces using it fall back to defaults.");
            } else if (path.startsWith("pages") && c.op() == ConfigDiffService.Op.REMOVED) {
                warnings.add("A custom page was removed — roles assigned to it lose that landing page.");
            } else if (path.startsWith("extensions")) {
                touchesAutomations = true;
                warnings.add("A code extension changed (" + path
                        + ") — review its hook before promotion (execution is sandboxed, RB-40).");
            } else if (path.equals("locks") || path.startsWith("locks.")) {
                warnings.add("Locked-settings policy changed — owner-only; affects who can edit config.");
            }
        }

        int affectedUsers = touchesUsers ? users : 0;
        int affectedAutomations = touchesAutomations ? automations : 0;
        // Item counts are surfaced for any structural (forms/pages/defaults) change; pure branding
        // tweaks affect no stored items.
        int affectedItems = hasDataShape(changes) ? items : 0;

        return new ImpactReport(affectedUsers, affectedAutomations, affectedItems, changes, warnings);
    }

    private boolean hasDataShape(List<ConfigDiffService.ConfigChange> changes) {
        return changes.stream().anyMatch(c ->
                c.path().startsWith("forms")
                        || c.path().startsWith("settings.defaults")
                        || c.path().startsWith("settings.workingCalendar")
                        || c.path().equals("settings.timezone"));
    }

    private int count(String sql, String workspaceId) {
        try {
            Integer n = jdbc.queryForObject(sql, Integer.class, workspaceId);
            return n == null ? 0 : n;
        } catch (Exception e) {
            return 0;
        }
    }

    /** Convenience for parsing — kept for callers that need the extension catalog count, etc. */
    JsonNode parse(String json) {
        try {
            return mapper.readTree(json == null || json.isBlank() ? "{}" : json);
        } catch (Exception e) {
            return mapper.createObjectNode();
        }
    }
}
