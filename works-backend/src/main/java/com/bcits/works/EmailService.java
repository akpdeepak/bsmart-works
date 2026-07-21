package com.bcits.works;

import com.bcits.works.auth.User;
import com.bcits.works.auth.UserRepository;



import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Sends email notifications for assignment, comment, mention, and daily digest events.
 * Respects per-user notification_preferences. Failures are logged, never thrown —
 * so a misconfigured SMTP never breaks the main request flow.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final String FROM = "noreply@bsmart.works";

    private final JavaMailSender mailSender;
    private final JdbcTemplate jdbc;
    private final UserRepository users;

    public EmailService(JavaMailSender mailSender, JdbcTemplate jdbc, UserRepository users) {
        this.mailSender = mailSender;
        this.jdbc = jdbc;
        this.users = users;
    }

    /** Called when a work item is assigned to a user. */
    @Async
    public void sendAssignmentEmail(String recipientUserId, String actorName, String itemKey, String itemTitle) {
        if (!pref(recipientUserId, "notify_assign")) return;
        send(recipientUserId,
            "📋 You were assigned " + itemKey,
            actorName + " assigned you to: " + itemTitle + "\n\n" +
            "View item: http://localhost:5173 → search " + itemKey);
    }

    /** Called when a comment is added to an item the user owns or is assigned to. */
    @Async
    public void sendCommentEmail(String recipientUserId, String actorName, String itemKey, String commentSnippet) {
        if (!pref(recipientUserId, "notify_comment")) return;
        send(recipientUserId,
            "💬 New comment on " + itemKey,
            actorName + " commented on " + itemKey + ":\n\n\"" + commentSnippet + "\"\n\n" +
            "View item: http://localhost:5173");
    }

    /** Called when a user is @mentioned in a comment. */
    @Async
    public void sendMentionEmail(String recipientUserId, String actorName, String itemKey, String commentSnippet) {
        if (!pref(recipientUserId, "notify_mention")) return;
        send(recipientUserId,
            "@ You were mentioned on " + itemKey,
            actorName + " mentioned you in a comment on " + itemKey + ":\n\n\"" + commentSnippet + "\"\n\n" +
            "View item: http://localhost:5173");
    }

    /** Called when a CRITICAL impediment breaches its SLA. Gated on notify_sla_breach (V53). */
    @Async
    public void sendSlaBreachEmail(String recipientUserId, String title, long ageDays, String link) {
        if (!pref(recipientUserId, "notify_sla_breach")) return;
        send(recipientUserId,
            "🚨 SLA breach: " + title,
            "A critical impediment has been open " + ageDays + " day(s) unresolved and has "
            + "breached its SLA:\n\n\"" + title + "\"\n\n"
            + "Assign an owner or escalate it: http://localhost:5173" + (link == null ? "" : link));
    }

    /** Email verification link sent at signup. Always sent (not preference-gated). */
    @Async
    public void sendVerificationEmail(String toEmail, String fullName, String verifyUrl) {
        sendTo(toEmail,
            "Verify your email",
            "Hi " + safeName(fullName) + ",\n\n" +
            "Welcome to bSmart Works! Confirm your email address to finish setting up your account:\n\n" +
            verifyUrl + "\n\n" +
            "If you didn't create an account, you can ignore this message.");
    }

    /** Password-reset link sent from the forgot-password flow. Always sent (not preference-gated). */
    @Async
    public void sendPasswordResetEmail(String toEmail, String fullName, String resetUrl) {
        sendTo(toEmail,
            "Reset your password",
            "Hi " + safeName(fullName) + ",\n\n" +
            "We received a request to reset your password. Use the link below to choose a new one " +
            "(it expires in 60 minutes):\n\n" +
            resetUrl + "\n\n" +
            "If you didn't request this, you can safely ignore this email — your password won't change.");
    }

    /** Periodic saved-view subscription summary — "your view X has N matching items". */
    @Async
    public void sendSubscriptionEmail(String recipientUserId, String viewName, int matchCount, String link) {
        send(recipientUserId,
            "Subscription: " + viewName,
            "Your saved view \"" + viewName + "\" currently has " + matchCount
                + " matching item" + (matchCount == 1 ? "" : "s") + ".\n\nOpen it: " + link);
    }

    // ---- helpers ----

    private String safeName(String fullName) {
        return (fullName == null || fullName.isBlank()) ? "there" : fullName.trim();
    }

    /** Check a single boolean preference for a user (defaults to true if row missing). */
    private boolean pref(String userId, String column) {
        try {
            List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT " + column + " FROM notification_preferences WHERE user_id = ?", userId);
            if (rows.isEmpty()) return true; // default: notify
            Object val = rows.get(0).get(column);
            return val == null || Boolean.TRUE.equals(val);
        } catch (Exception e) {
            log.warn("Could not read notification pref {} for {}: {}", column, userId, e.getMessage());
            return true;
        }
    }

    private void send(String recipientUserId, String subject, String body) {
        Optional<User> userOpt = users.findById(recipientUserId);
        if (userOpt.isEmpty()) return; {
        sendTo(userOpt.get().getEmail(), subject, body);
        }
    }

    /** Send directly to an email address (used by auth flows that already hold the address). */
    private void sendTo(String toEmail, String subject, String body) {
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(FROM);
            msg.setTo(toEmail);
            msg.setSubject("[bSmart Works] " + subject);
            msg.setText(body + "\n\n---\nbSmart Works · Where work gets done.");
            mailSender.send(msg);
            log.info("[EMAIL] Sent '{}' to {}", subject, toEmail);
        } catch (Exception e) {
            // Graceful degradation — log and continue; SMTP might not be running in dev
            log.warn("[EMAIL] Could not send '{}' to {}: {}", subject, toEmail, e.getMessage());
        }
    }
}
