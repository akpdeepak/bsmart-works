package com.bcits.works;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Delivers due report schedules: for each schedule whose next run has passed, notify the
 * recipients (in-app and/or email) that the report is ready, then reschedule. Polls every
 * 15 minutes. Mirrors DailyDigestScheduler (JdbcTemplate + JavaMailSender). The visual
 * report stays client-rendered, so delivery is a "report ready" signal carrying a link.
 */
@Component
public class ReportDeliveryScheduler {

    private static final Logger log = LoggerFactory.getLogger(ReportDeliveryScheduler.class);
    private static final String FROM = "noreply@bsmart.works";

    private final ReportScheduleRepository schedules;
    private final ReportScheduleService scheduleService;
    private final NotificationRepository notifications;
    private final JdbcTemplate jdbc;
    private final JavaMailSender mailSender;

    public ReportDeliveryScheduler(ReportScheduleRepository schedules, ReportScheduleService scheduleService,
                                   NotificationRepository notifications, JdbcTemplate jdbc, JavaMailSender mailSender) {
        this.schedules = schedules;
        this.scheduleService = scheduleService;
        this.notifications = notifications;
        this.jdbc = jdbc;
        this.mailSender = mailSender;
    }

    @Scheduled(cron = "0 */15 * * * *")
    public void deliverDueReports() {
        OffsetDateTime now = OffsetDateTime.now();
        List<ReportSchedule> due = schedules.findByActiveTrueAndNextRunAtLessThanEqual(now);
        if (due.isEmpty()) return; {
        log.info("[REPORT-DELIVERY] Delivering {} due report schedule(s)", due.size());
        }
        for (ReportSchedule s : due) {
            try {
                deliver(s);
            } catch (RuntimeException ex) {
                log.warn("[REPORT-DELIVERY] Failed to deliver schedule id={}", s.getId(), ex);
            }
            s.setLastRunAt(now);
            s.setNextRunAt(scheduleService.computeNextRun(s.getCadence(), now));
            schedules.save(s);
        }
    }

    private void deliver(ReportSchedule s) {
        String reportName = jdbc.query("SELECT name FROM reports WHERE id = ?",
            rs -> rs.next() ? rs.getString(1) : null, s.getReportId());
        if (reportName == null) {
            log.warn("[REPORT-DELIVERY] Schedule id={} references a missing report", s.getId());
            return;
        }
        String channel = s.getChannel() == null ? "IN_APP" : s.getChannel().toUpperCase();
        boolean inApp = !"EMAIL".equals(channel);
        boolean email = "EMAIL".equals(channel) || "BOTH".equals(channel);
        String message = "Report \"" + reportName + "\" is ready";
        String link = "/reports/" + s.getReportId();

        for (String userId : recipientIds(s)) {
            if (inApp) {
                Notification n = new Notification();
                n.setUserId(userId);
                n.setType("REPORT_DELIVERED");
                n.setMessage(message);
                n.setLink(link);
                n.setRead(false);
                n.setCreatedAt(OffsetDateTime.now());
                notifications.save(n);
            }
            if (email) {
                sendEmail(userId, reportName, link);
            }
        }
    }

    /** Owner is always a recipient; the recipients field adds further user ids. */
    private Set<String> recipientIds(ReportSchedule s) {
        Set<String> ids = new LinkedHashSet<>();
        if (s.getOwnerId() != null) ids.add(s.getOwnerId());
        if (s.getRecipients() != null) {
            for (String r : s.getRecipients().split(",")) {
                String id = r.trim();
                if (!id.isEmpty()) ids.add(id); {
            }
                }
        }
        return ids;
    }

    private void sendEmail(String userId, String reportName, String link) {
        String email = jdbc.query("SELECT email FROM users WHERE id = ?",
            rs -> rs.next() ? rs.getString(1) : null, userId);
        if (email == null) return; {
        SimpleMailMessage msg = new SimpleMailMessage();
        }
        msg.setFrom(FROM);
        msg.setTo(email);
        msg.setSubject("Your report is ready: " + reportName);
        msg.setText("The report \"" + reportName + "\" is ready.\n\nOpen it in bSmart Works: " + link);
        try {
            mailSender.send(msg);
        } catch (RuntimeException ex) {
            log.warn("[REPORT-DELIVERY] Email send failed for a recipient", ex);
        }
    }
}
