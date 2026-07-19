package com.bcits.works.messaging;

import com.bcits.works.AiCapabilities;
import com.bcits.works.shared.AiControlPlanePort;
import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.RbacGate;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Workspace-scoped action projection for EPIC 8. Source records remain authoritative; this service
 * combines only work that needs the caller's action and overlays caller-owned snooze/done state.
 */
@Service
public class SmartInboxService {

    private static final int MAX_ITEMS = 200;
    private static final String NOTIFICATION_SQL = """
        SELECT id, type, message, link, created_at
        FROM notifications
        WHERE workspace_id = ? AND user_id = ? AND is_read = false
          AND (type IN ('ASSIGNED', 'MENTION', 'COMMENT', 'SERVICE_REQUEST')
               OR type LIKE 'SLA_%' OR type LIKE 'COMPLIANCE_%')
        ORDER BY created_at DESC
        LIMIT 200
        """;
    private static final String ARTICLE_SQL = """
        SELECT a.id, a.title, a.submitted_at, a.reviewer_due_date
        FROM articles a
        JOIN knowledge_spaces ks ON ks.id = a.space_id
        WHERE ks.workspace_id = ? AND a.reviewer_id = ? AND a.status = 'IN_REVIEW'
        ORDER BY a.reviewer_due_date NULLS LAST, a.submitted_at
        LIMIT 200
        """;
    private static final String REVIEW_SQL = """
        SELECT pr.id, pr.title, pr.repo, pr.number, pr.url, pr.updated_at
        FROM pull_request_reviewers prr
        JOIN pull_requests pr ON pr.id = prr.pull_request_id
        WHERE pr.workspace_id = ? AND prr.reviewer_id = ? AND prr.state = 'REQUESTED'
          AND pr.status IN ('OPEN', 'DRAFT')
        ORDER BY pr.updated_at DESC
        LIMIT 200
        """;
    private static final String CHAT_SQL = """
        SELECT id, subject, assigned_agent_id, last_message_at
        FROM chat_conversations
        WHERE workspace_id = ? AND status = 'ESCALATED'
          AND (assigned_agent_id IS NULL OR assigned_agent_id = ?)
        ORDER BY last_message_at DESC
        LIMIT 200
        """;
    private static final String WAIT_SQL = """
        SELECT DISTINCT wi.id, wi.title, wi.status, wi.priority,
               COALESCE(wi.status_changed_at, wi.created_at) AS action_at
        FROM work_items wi
        JOIN projects p ON p.id = wi.project_id
        WHERE p.workspace_id = ? AND wi.assignee_id = ? AND wi.deleted_at IS NULL
          AND LOWER(wi.status) <> 'done'
          AND (LOWER(wi.status) LIKE '%wait%' OR LOWER(wi.status) LIKE '%block%'
               OR EXISTS (
                   SELECT 1 FROM work_item_links wil
                   JOIN work_items target ON target.id = wil.target_id
                   JOIN projects target_project ON target_project.id = target.project_id
                   WHERE wil.source_id = wi.id AND wil.link_type = 'BLOCKED_BY'
                     AND target_project.workspace_id = ?
               ))
        ORDER BY action_at DESC
        LIMIT 200
        """;

    private final JdbcTemplate jdbc;
    private final RbacGate rbac;
    private final AiControlPlanePort ai;

    public SmartInboxService(JdbcTemplate jdbc, RbacGate rbac, AiControlPlanePort ai) {
        this.jdbc = jdbc;
        this.rbac = rbac;
        this.ai = ai;
    }

    public record Action(String id, String label, String kind, String method, String path) { }

    public record InboxItem(
            String key,
            String intent,
            String title,
            String message,
            String sourceType,
            String sourceId,
            String sourceLink,
            OffsetDateTime createdAt,
            String priority,
            Action primaryAction,
            List<Action> secondaryActions) { }

    public record SummarySource(String key, String title, String sourceLink) { }

    public record SummaryResult(
            String text,
            int itemCount,
            List<SummarySource> sources,
            boolean usedAi,
            boolean fallback,
            String policyState) { }

    private record ItemState(OffsetDateTime snoozedUntil, OffsetDateTime resolvedAt) { }

    @Transactional(readOnly = true, timeout = 2)
    public List<InboxItem> list(String workspaceId, String userId) {
        requireWorkspace(workspaceId, userId);
        List<InboxItem> candidates = new ArrayList<>();
        candidates.addAll(jdbc.query(NOTIFICATION_SQL, this::notificationItem, workspaceId, userId));
        candidates.addAll(jdbc.query(ARTICLE_SQL, this::articleItem, workspaceId, userId));
        candidates.addAll(jdbc.query(REVIEW_SQL, this::reviewItem, workspaceId, userId));
        if (rbac.canDo(userId, workspaceId, "work_service")) {
            candidates.addAll(jdbc.query(CHAT_SQL, this::chatItem, workspaceId, userId));
        }
        candidates.addAll(jdbc.query(WAIT_SQL, this::waitItem, workspaceId, userId, workspaceId));

        Map<String, ItemState> state = states(workspaceId, userId);
        OffsetDateTime now = OffsetDateTime.now();
        Map<String, InboxItem> unique = new LinkedHashMap<>();
        candidates.stream()
            .filter(item -> visible(state.get(item.key()), now))
            .sorted(Comparator.comparing(InboxItem::createdAt,
                    Comparator.nullsLast(Comparator.reverseOrder())))
            .limit(MAX_ITEMS)
            .forEach(item -> unique.putIfAbsent(item.key(), item));
        return List.copyOf(unique.values());
    }

    @Transactional(readOnly = true, timeout = 2)
    public long count(String workspaceId, String userId) {
        return list(workspaceId, userId).size();
    }

    @Transactional
    public void snooze(String workspaceId, String userId, String itemKey, OffsetDateTime until) {
        requireWorkspace(workspaceId, userId);
        validateKey(itemKey);
        if (until == null || !until.isAfter(OffsetDateTime.now())) {
            throw ApiException.badRequest("INVALID_SNOOZE", "Snooze time must be in the future.", "until");
        }
        jdbc.update("""
            INSERT INTO inbox_item_states
                (workspace_id, user_id, item_key, snoozed_until, resolved_at, updated_at)
            VALUES (?, ?, ?, ?, NULL, NOW())
            ON CONFLICT (workspace_id, user_id, item_key) DO UPDATE
            SET snoozed_until = EXCLUDED.snoozed_until, resolved_at = NULL, updated_at = NOW()
            """, workspaceId, userId, itemKey, until);
    }

    @Transactional
    public void markDone(String workspaceId, String userId, String itemKey) {
        requireWorkspace(workspaceId, userId);
        validateKey(itemKey);
        persistDone(workspaceId, userId, itemKey);
        markNotificationRead(workspaceId, userId, itemKey);
    }

    /** Server-authoritative bulk clear: only current low-priority items supplied by the caller move. */
    @Transactional(timeout = 2)
    public int bulkDoneLowPriority(String workspaceId, String userId, List<String> requestedKeys) {
        requireWorkspace(workspaceId, userId);
        List<String> requested = requestedKeys == null ? List.of() : requestedKeys.stream()
            .filter(key -> key != null && key.length() <= 180)
            .distinct()
            .toList();
        if (requested.isEmpty()) {
            return 0;
        }
        List<InboxItem> allowed = list(workspaceId, userId).stream()
            .filter(item -> "LOW".equals(item.priority()) || "NORMAL".equals(item.priority()))
            .filter(item -> requested.contains(item.key()))
            .toList();
        allowed.forEach(item -> {
            persistDone(workspaceId, userId, item.key());
            markNotificationRead(workspaceId, userId, item.key());
        });
        return allowed.size();
    }

    @Transactional(timeout = 2)
    public SummaryResult missedSummary(String workspaceId, String userId) {
        List<InboxItem> items = list(workspaceId, userId);
        List<SummarySource> sources = items.stream()
            .limit(12)
            .map(item -> new SummarySource(item.key(), item.title(), item.sourceLink()))
            .toList();
        String fallbackText = deterministicSummary(items);
        if (items.isEmpty()) {
            return new SummaryResult(fallbackText, 0, sources, false, true, "NO_ACTIONS");
        }
        String prompt = "Summarize these action items by urgency and action. Do not invent facts or sources:\n"
            + items.stream().limit(40)
                .map(item -> item.intent() + ": " + item.title() + " - " + item.message())
                .reduce((left, right) -> left + "\n" + right).orElse("");
        try {
            AiControlPlanePort.Outcome outcome = ai.invoke(new AiControlPlanePort.Request(
                workspaceId, userId, AiCapabilities.INBOX_SUMMARY, prompt, fallbackText,
                Integer.toHexString(prompt.hashCode()), true));
            String text = outcome.usedAi() && outcome.text() != null ? outcome.text() : fallbackText;
            return new SummaryResult(text, items.size(), sources, outcome.usedAi(), outcome.fallback(),
                outcome.policyState());
        } catch (RuntimeException ex) {
            return new SummaryResult(fallbackText, items.size(), sources, false, true, "UNAVAILABLE");
        }
    }

    private void requireWorkspace(String workspaceId, String userId) {
        if (workspaceId == null || workspaceId.isBlank()) {
            throw ApiException.badRequest("WORKSPACE_REQUIRED", "A workspaceId is required.", "workspaceId");
        }
        rbac.require(userId, workspaceId, "view_items");
    }

    private Map<String, ItemState> states(String workspaceId, String userId) {
        Map<String, ItemState> result = new LinkedHashMap<>();
        List<Map.Entry<String, ItemState>> rows = jdbc.query("""
            SELECT item_key, snoozed_until, resolved_at
            FROM inbox_item_states
            WHERE workspace_id = ? AND user_id = ?
            """, (rs, rowNum) -> Map.entry(rs.getString("item_key"), new ItemState(
                offset(rs, "snoozed_until"), offset(rs, "resolved_at"))), workspaceId, userId);
        rows.forEach(entry -> result.put(entry.getKey(), entry.getValue()));
        return result;
    }

    private static boolean visible(ItemState state, OffsetDateTime now) {
        return state == null || (state.resolvedAt() == null
            && (state.snoozedUntil() == null || !state.snoozedUntil().isAfter(now)));
    }

    private void persistDone(String workspaceId, String userId, String itemKey) {
        jdbc.update("""
            INSERT INTO inbox_item_states
                (workspace_id, user_id, item_key, snoozed_until, resolved_at, updated_at)
            VALUES (?, ?, ?, NULL, NOW(), NOW())
            ON CONFLICT (workspace_id, user_id, item_key) DO UPDATE
            SET snoozed_until = NULL, resolved_at = NOW(), updated_at = NOW()
            """, workspaceId, userId, itemKey);
    }

    private void markNotificationRead(String workspaceId, String userId, String itemKey) {
        if (!itemKey.startsWith("notification:")) {
            return;
        }
        try {
            long id = Long.parseLong(itemKey.substring("notification:".length()));
            jdbc.update("""
                UPDATE notifications SET is_read = true
                WHERE id = ? AND workspace_id = ? AND user_id = ?
                """, id, workspaceId, userId);
        } catch (NumberFormatException ignored) {
            // validateKey has already bounded the opaque key; malformed legacy keys simply lack a source update.
        }
    }

    private static void validateKey(String itemKey) {
        if (itemKey == null || itemKey.isBlank() || itemKey.length() > 180 || !itemKey.contains(":")) {
            throw ApiException.badRequest("INVALID_ITEM_KEY", "A valid Inbox item key is required.", "itemKey");
        }
    }

    private InboxItem notificationItem(ResultSet rs, int rowNum) throws SQLException {
        String type = upper(rs.getString("type"));
        String link = rs.getString("link");
        String sourceId = sourceId(link);
        String intent;
        Action primary;
        if ("MENTION".equals(type) || "COMMENT".equals(type)) {
            intent = "REPLY";
            primary = new Action("reply", "Reply", "INPUT", "POST",
                sourceId == null ? link : "/work-items/" + sourceId + "/comments");
        } else if ("ASSIGNED".equals(type) || "SERVICE_REQUEST".equals(type)) {
            intent = "ASSIGN";
            primary = openAction("Open assignment");
        } else {
            intent = "ESCALATE";
            primary = openAction("Review alert");
        }
        return new InboxItem("notification:" + rs.getLong("id"), intent,
            titleForNotification(type), rs.getString("message"), sourceType(link), sourceId, link,
            offset(rs, "created_at"), priorityForNotification(type), primary,
            List.of(new Action("convert", "Convert to work", "CONVERT", "POST", "/work-items")));
    }

    private InboxItem articleItem(ResultSet rs, int rowNum) throws SQLException {
        String id = rs.getString("id");
        return new InboxItem("article:" + id, "APPROVE", "Article approval", rs.getString("title"),
            "ARTICLE", id, "/knowledge?article=" + id, offset(rs, "submitted_at"), "HIGH",
            new Action("approve", "Approve", "API", "PUT", "/articles/" + id + "/publish"),
            List.of(new Action("reject", "Reject", "API", "PUT", "/articles/" + id + "/reject")));
    }

    private InboxItem reviewItem(ResultSet rs, int rowNum) throws SQLException {
        String id = rs.getString("id");
        String title = rs.getString("title");
        String message = rs.getString("repo") + " #" + rs.getInt("number");
        String url = rs.getString("url");
        return new InboxItem("pull-request:" + id, "REVIEW", "Code review request", title,
            "PULL_REQUEST", id, url, offset(rs, "updated_at"), "HIGH",
            new Action("review", "Review", url == null || url.isBlank() ? "OPEN" : "EXTERNAL", "GET", url),
            List.of());
    }

    private InboxItem chatItem(ResultSet rs, int rowNum) throws SQLException {
        String id = rs.getString("id");
        String assigned = rs.getString("assigned_agent_id");
        boolean unassigned = assigned == null || assigned.isBlank();
        Action primary = unassigned
            ? new Action("assign", "Claim", "API", "PUT", "/support-chat/conversations/" + id + "/assign")
            : new Action("reply", "Reply", "INPUT", "POST", "/support-chat/conversations/" + id + "/reply");
        return new InboxItem("chat:" + id, unassigned ? "ASSIGN" : "REPLY", "Customer reply",
            valueOr(rs.getString("subject"), "Escalated customer conversation"), "CUSTOMER_CHAT", id,
            "/support-inbox?conversation=" + id, offset(rs, "last_message_at"), "HIGH", primary,
            unassigned ? List.of(new Action("open", "Open", "OPEN", "GET", "/support-inbox")) : List.of());
    }

    private InboxItem waitItem(ResultSet rs, int rowNum) throws SQLException {
        String id = rs.getString("id");
        return new InboxItem("wait:" + id, "REVIEW", "Waiting work", rs.getString("title"),
            "WORK_ITEM", id, "/items/" + id, offset(rs, "action_at"), upper(rs.getString("priority")),
            openAction("Review blocker"),
            List.of(new Action("convert", "Create follow-up", "CONVERT", "POST", "/work-items")));
    }

    private static Action openAction(String label) {
        return new Action("open", label, "OPEN", "GET", null);
    }

    private static String deterministicSummary(List<InboxItem> items) {
        if (items.isEmpty()) {
            return "Your action Inbox is clear.";
        }
        Map<String, Long> counts = new LinkedHashMap<>();
        items.forEach(item -> counts.merge(item.intent(), 1L, Long::sum));
        String grouped = counts.entrySet().stream()
            .map(entry -> entry.getValue() + " " + entry.getKey().toLowerCase(Locale.ROOT))
            .reduce((left, right) -> left + ", " + right).orElse("");
        return "You have " + items.size() + " actionable items: " + grouped + ".";
    }

    private static String titleForNotification(String type) {
        return switch (type) {
            case "MENTION", "COMMENT" -> "Reply requested";
            case "ASSIGNED", "SERVICE_REQUEST" -> "Assignment";
            default -> "Attention needed";
        };
    }

    private static String priorityForNotification(String type) {
        return type.contains("BREACH") || type.contains("CRITICAL") ? "CRITICAL" : "NORMAL";
    }

    private static String sourceType(String link) {
        if (link == null) return "NOTIFICATION";
        if (link.startsWith("/items/")) return "WORK_ITEM";
        if (link.startsWith("/support")) return "CUSTOMER_CHAT";
        if (link.startsWith("/compliance")) return "COMPLIANCE";
        if (link.startsWith("/sla")) return "SLA";
        return "NOTIFICATION";
    }

    private static String sourceId(String link) {
        if (link == null || link.isBlank()) return null;
        String path = link.split("\\?", 2)[0];
        int slash = path.lastIndexOf('/');
        return slash >= 0 && slash + 1 < path.length() ? path.substring(slash + 1) : null;
    }

    private static OffsetDateTime offset(ResultSet rs, String column) throws SQLException {
        return rs.getObject(column, OffsetDateTime.class);
    }

    private static String upper(String value) {
        return value == null ? "" : value.toUpperCase(Locale.ROOT);
    }

    private static String valueOr(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
