package com.bcits.works;

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
 * Escalation routing for the SLA engine (iteration 8, Cap M). Turns an escalation step's
 * {@code actionTarget} JSON list into concrete notifications when a clock crosses a threshold or
 * breaches. Targets mirror the compliance notifier: {@code ITEM_OWNER}, {@code PROJECT_ADMIN},
 * {@code USER}, {@code EMAIL}. Parsing is null-safe and never throws into the evaluation path — a
 * misconfigured target list must not stop a breach from being recorded.
 */
@Service
public class SlaNotificationService {

    private static final Logger log = LoggerFactory.getLogger(SlaNotificationService.class);
    private static final String FROM = "noreply@bsmart.works";

    private final NotificationRepository notifications;
    private final JdbcTemplate jdbc;
    private final JavaMailSender mailSender;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public SlaNotificationService(NotificationRepository notifications, JdbcTemplate jdbc,
                                  JavaMailSender mailSender) {
        this.notifications = notifications;
        this.jdbc = jdbc;
        this.mailSender = mailSender;
    }

    /** A routing target parsed from actionTarget. */
    public record Target(String type, String value) { }

    /** Route an escalation/breach notification for a clock to the step's action targets. */
    public void routeEscalation(SlaEscalation step, SlaInstance instance, String workItemTitle) {
        List<Target> targets = parseTargets(step.getActionTarget());
        String label = instance.getMetric() + " SLA " + ("REASSIGN".equalsIgnoreCase(step.getAction())
            ? "reassignment" : "escalation");
        String message = label + ": " + safe(workItemTitle) + " (" + instance.getWorkItemId() + ")";
        String link = "/sla";

        String[] owner = itemOwner(instance.getWorkItemId());
        Set<String> userIds = new LinkedHashSet<>();
        for (Target t : targets) {
            switch (t.type() == null ? "" : t.type().toUpperCase()) {
                case "ITEM_OWNER" -> {
                    if (owner[0] != null && !owner[0].isBlank()) {
                        userIds.add(owner[0]);
                    } else if (owner[1] != null && !owner[1].isBlank()) {
                        userIds.add(owner[1]);
                    }
                }
                case "PROJECT_ADMIN" -> userIds.addAll(workspaceAdmins(instance.getWorkspaceId()));
                case "USER" -> {
                    if (t.value() != null && !t.value().isBlank()) {
                        userIds.add(t.value());
                    }
                }
                case "EMAIL" -> sendEmail(t.value(), message, link);
                default -> log.debug("[SLA] Unknown routing target type: {}", t.type());
            }
        }
        // REASSIGN routes to a specific user (first USER target): set the assignee.
        if ("REASSIGN".equalsIgnoreCase(step.getAction())) {
            reassign(instance.getWorkItemId(), targets);
        }
        for (String userId : userIds) {
            inApp(userId, "SLA_ESCALATION", message, link);
        }
    }

    /** Parse an actionTarget JSON array into targets. Null/blank/malformed ⇒ empty list. */
    public List<Target> parseTargets(String json) {
        List<Target> out = new ArrayList<>();
        if (json == null || json.isBlank()) {
            return out;
        }
        try {
            List<?> raw = objectMapper.readValue(json, List.class);
            for (Object o : raw) {
                if (o instanceof String s) {
                    out.add(new Target(s, null));
                } else if (o instanceof Map<?, ?> m) {
                    Object t = m.get("type");
                    Object val = m.get("value");
                    if (t != null) {
                        out.add(new Target(t.toString(), val == null ? null : val.toString()));
                    }
                }
            }
        } catch (Exception ex) {
            log.warn("[SLA] Could not parse routing targets: {}", ex.getMessage());
        }
        return out;
    }

    private void reassign(String workItemId, List<Target> targets) {
        for (Target t : targets) {
            if ("USER".equalsIgnoreCase(t.type()) && t.value() != null && !t.value().isBlank()) {
                try {
                    jdbc.update("UPDATE work_items SET assignee_id = ? WHERE id = ?", t.value(), workItemId);
                } catch (RuntimeException ex) {
                    log.warn("[SLA] Reassign failed for {}: {}", workItemId, ex.getMessage());
                }
                return;
            }
        }
    }

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

    private Set<String> workspaceAdmins(String workspaceId) {
        if (workspaceId == null) {
            return Set.of();
        }
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
        if (to == null || to.isBlank()) {
            return;
        }
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(FROM);
        msg.setTo(to);
        msg.setSubject("SLA alert — bSmart Works");
        msg.setText(message + "\n\nOpen SLA tracking: " + link);
        try {
            mailSender.send(msg);
        } catch (RuntimeException ex) {
            log.warn("[SLA] Email route failed for a recipient: {}", ex.getMessage());
        }
    }

    private String safe(String s) { return s == null ? "" : s; }
}
