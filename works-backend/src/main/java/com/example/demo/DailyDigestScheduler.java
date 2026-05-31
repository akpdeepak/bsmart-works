package com.example.demo;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

/**
 * Daily email digest — sent at 8:00 AM every day.
 * Only sent to users who have email_digest = true in notification_preferences.
 * Summarises unread notifications from the past 24 hours.
 */
@Component
public class DailyDigestScheduler {

    private static final Logger log = LoggerFactory.getLogger(DailyDigestScheduler.class);
    private static final String FROM = "noreply@bsmart.works";

    private final JdbcTemplate jdbc;
    private final JavaMailSender mailSender;

    public DailyDigestScheduler(JdbcTemplate jdbc, JavaMailSender mailSender) {
        this.jdbc = jdbc;
        this.mailSender = mailSender;
    }

    // Runs every day at 08:00 server time
    @Scheduled(cron = "0 0 8 * * *")
    public void sendDailyDigest() {
        log.info("[DIGEST] Starting daily digest run");

        // Find all users with email_digest = true
        List<Map<String, Object>> digestUsers = jdbc.queryForList(
            "SELECT np.user_id, u.email, u.full_name " +
            "FROM notification_preferences np " +
            "JOIN users u ON u.id = np.user_id " +
            "WHERE np.email_digest = true AND u.email IS NOT NULL");

        OffsetDateTime since = OffsetDateTime.now().minusHours(24);

        for (Map<String, Object> row : digestUsers) {
            String userId   = (String) row.get("user_id");
            String email    = (String) row.get("email");
            String fullName = (String) row.get("full_name");

            List<Map<String, Object>> unread = jdbc.queryForList(
                "SELECT type, message, created_at FROM notifications " +
                "WHERE user_id = ? AND is_read = false AND created_at >= ? " +
                "ORDER BY created_at DESC LIMIT 20", userId, since);

            if (unread.isEmpty()) continue; // no digest if nothing happened

            StringBuilder sb = new StringBuilder();
            sb.append("Hi ").append(fullName).append(",\n\n");
            sb.append("Here's your bSmart Works digest for the last 24 hours:\n\n");
            for (Map<String, Object> n : unread) {
                sb.append("• ").append(n.get("message")).append("\n");
            }
            sb.append("\nLog in to see your full inbox: http://localhost:5173\n\n");
            sb.append("---\nbSmart Works · Where work gets done.");

            try {
                SimpleMailMessage msg = new SimpleMailMessage();
                msg.setFrom(FROM);
                msg.setTo(email);
                msg.setSubject("[bSmart Works] Your daily digest — " +
                        OffsetDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy")));
                msg.setText(sb.toString());
                mailSender.send(msg);
                log.info("[DIGEST] Sent to {} ({} items)", email, unread.size());
            } catch (Exception e) {
                log.warn("[DIGEST] Failed to send to {}: {}", email, e.getMessage());
            }
        }

        log.info("[DIGEST] Done. Processed {} users", digestUsers.size());
    }
}
