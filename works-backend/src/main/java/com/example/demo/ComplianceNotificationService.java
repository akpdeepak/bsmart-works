package com.example.demo;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Severity routing for compliance (iteration 7, Cap K). Turns a rule's {@code notifyTo} /
 * {@code escalateTo} JSON target list into concrete notifications. Targets:
 * <ul>
 *   <li>{@code ITEM_OWNER}   — the work item's assignee (or its creator if unassigned)</li>
 *   <li>{@code PROJECT_ADMIN}— workspace admins/owners (tier ≥ 4)</li>
 *   <li>{@code USER}         — a specific user id ({@code value})</li>
 *   <li>{@code EMAIL}        — an external email address ({@code value})</li>
 *   <li>{@code SLACK}        — a Slack channel ({@code value}); real delivery is a future
 *       integration (no broker yet, ADR-0001), so it is logged, not silently dropped</li>
 * </ul>
 * Parsing is null-safe and never throws into the evaluation path — a misconfigured target list
 * must not stop a violation from being recorded.
 */
@Service
public class ComplianceNotificationService {

    private static final Logger log = LoggerFactory.getLogger(ComplianceNotificationService.class);
    private static final String FROM = "noreply@bsmart.works";

    private final NotificationRepository notifications;
    private final JdbcTemplate jdbc;
    private final JavaMailSender mailSender;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ComplianceNotificationService(NotificationRepository notifications, JdbcTemplate jdbc,
                                         JavaMailSender mailSender) {
        this.notifications = notifications;
        this.jdbc = jdbc;
        this.mailSender = mailSender;
    }

    /** A routing target parsed from notifyTo/escalateTo. */
    public record Target(String type, String value) { }

    /** Notify a new violation per the rule's notifyTo list. */
    public void routeViolation(ComplianceRule rule, ComplianceViolation v,
                               ComplianceEvaluationService.FailingItem item) {
        route(parseTargets(rule.getNotifyTo()), rule, v, item.assigneeId(), item.createdBy(),
            "COMPLIANCE_VIOLATION", "Compliance");
    }

    /** Notify an escalated violation per the rule's escalateTo list. */
    public void routeEscalation(ComplianceRule rule, ComplianceViolation v) {
        String[] owner = itemOwner(v.getWorkItemId());
        route(parseTargets(rule.getEscalateTo()), rule, v, owner[0], owner[1],
            "COMPLIANCE_ESCALATION", "Compliance escalation");
    }

    /** Resolve [assigneeId, createdBy] for a work item, for ITEM_OWNER routing at escalation time. */
    private String[] itemOwner(String workItemId) {
        try {
            return jdbc.queryForObject(
                "SELECT assignee_id, created_by FROM work_items WHERE id = ?",
                (rs, n) -> new String[] { rs.getString("assignee_id"), rs.getString("created_by") },
                workItemId);
        } catch (RuntimeException ex) {
            return new String[] { null, null };
        }
    }

    private void route(List<Target> targets, ComplianceRule rule, ComplianceViolation v,
                       String assigneeId, String creatorId, String type, String prefix) {
        if (targets.isEmpty()) return;
        String message = prefix + ": " + safe(rule.getName()) + " — "
            + safe(v.getWorkItemTitle()) + " (" + v.getWorkItemId() + ")";
        String link = "/compliance";

        Set<String> userIds = new LinkedHashSet<>();
        for (Target t : targets) {
            switch (t.type() == null ? "" : t.type().toUpperCase()) {
                case "ITEM_OWNER" -> {
                    if (assigneeId != null && !assigneeId.isBlank()) userIds.add(assigneeId);
                    else if (creatorId != null && !creatorId.isBlank()) userIds.add(creatorId);
                }
                case "PROJECT_ADMIN" -> userIds.addAll(workspaceAdmins(rule.getWorkspaceId()));
                case "USER" -> { if (t.value() != null && !t.value().isBlank()) userIds.add(t.value()); }
                case "EMAIL" -> sendEmail(t.value(), message, link);
                case "SLACK" -> log.info("[COMPLIANCE] Slack route (channel={}) — {} [{}]",
                    t.value(), message, v.getId());
                default -> log.debug("[COMPLIANCE] Unknown routing target type: {}", t.type());
            }
        }
        for (String userId : userIds) {
            inApp(userId, type, message, link);
        }
    }

    /** Parse a notifyTo/escalateTo JSON array into targets. Null/blank/malformed ⇒ empty list. */
    public List<Target> parseTargets(String json) {
        List<Target> out = new ArrayList<>();
        if (json == null || json.isBlank()) return out;
        try {
            List<?> raw = objectMapper.readValue(json, List.class);
            for (Object o : raw) {
                if (o instanceof String s) {
                    out.add(new Target(s, null));
                } else if (o instanceof Map<?, ?> m) {
                    Object t = m.get("type");
                    Object val = m.get("value");
                    if (t != null) out.add(new Target(t.toString(), val == null ? null : val.toString()));
                }
            }
        } catch (Exception ex) {
            log.warn("[COMPLIANCE] Could not parse routing targets: {}", ex.getMessage());
        }
        return out;
    }

    private Set<String> workspaceAdmins(String workspaceId) {
        if (workspaceId == null) return Set.of();
        try {
            return new LinkedHashSet<>(jdbc.queryForList(
                "SELECT wm.user_id FROM workspace_members wm JOIN roles r ON r.id = wm.role_id "
                + "WHERE wm.workspace_id = ? AND r.tier >= 4", String.class, workspaceId));
        } catch (RuntimeException ex) {
            return Set.of();
        }
    }

    private void inApp(String userId, String type, String message, String link) {
        Notification n = new Notification();
        n.setUserId(userId);
        n.setType(type);
        n.setMessage(message);
        n.setLink(link);
        n.setRead(false);
        n.setCreatedAt(OffsetDateTime.now());
        notifications.save(n);
    }

    private void sendEmail(String to, String message, String link) {
        if (to == null || to.isBlank()) return;
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(FROM);
        msg.setTo(to);
        msg.setSubject("Compliance alert — bSmart Works");
        msg.setText(message + "\n\nOpen the compliance dashboard: " + link);
        try {
            mailSender.send(msg);
        } catch (RuntimeException ex) {
            log.warn("[COMPLIANCE] Email route failed for a recipient: {}", ex.getMessage());
        }
    }

    private String safe(String s) { return s == null ? "" : s; }
}
