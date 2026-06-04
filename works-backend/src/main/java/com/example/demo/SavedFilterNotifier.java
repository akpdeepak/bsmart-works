package com.example.demo;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

/**
 * Hourly notifier for saved-filter subscriptions (iteration-2 follow-up). For each subscribed
 * filter it counts work items created since the last run that match the filter's criteria and,
 * if any, sends the owner one in-app notification. Mirrors ReportDeliveryScheduler.
 */
@Component
public class SavedFilterNotifier {

    private static final Logger log = LoggerFactory.getLogger(SavedFilterNotifier.class);

    private final SavedFilterRepository filterRepository;
    private final SavedFilterMatcher matcher;
    private final NotificationRepository notifications;
    private final JdbcTemplate jdbc;

    public SavedFilterNotifier(SavedFilterRepository filterRepository, SavedFilterMatcher matcher,
                               NotificationRepository notifications, JdbcTemplate jdbc) {
        this.filterRepository = filterRepository;
        this.matcher = matcher;
        this.notifications = notifications;
        this.jdbc = jdbc;
    }

    @Scheduled(cron = "0 0 * * * *")
    public void notifySubscribers() {
        List<SavedFilter> subs = filterRepository.findBySubscribedTrue();
        if (subs.isEmpty()) return;
        OffsetDateTime now = OffsetDateTime.now();
        for (SavedFilter sf : subs) {
            try {
                int matched = countNewMatches(sf);
                if (matched > 0) {
                    Notification n = new Notification();
                    n.setUserId(sf.getCreatedBy());
                    n.setType("FILTER_MATCH");
                    n.setMessage(matched + (matched == 1 ? " new item matches" : " new items match")
                        + " your saved filter \"" + sf.getName() + "\"");
                    n.setLink("/board");
                    n.setRead(false);
                    n.setCreatedAt(now);
                    notifications.save(n);
                }
            } catch (RuntimeException ex) {
                log.warn("[FILTER-NOTIFY] Failed to process saved filter id={}", sf.getId(), ex);
            }
            sf.setLastNotifiedAt(now);
            filterRepository.save(sf);
        }
    }

    private int countNewMatches(SavedFilter sf) {
        OffsetDateTime since = sf.getLastNotifiedAt() != null ? sf.getLastNotifiedAt() : sf.getCreatedAt();
        List<Map<String, Object>> items = jdbc.queryForList(
            "SELECT wi.priority, wi.type, wi.assignee_id FROM work_items wi "
            + "JOIN projects p ON p.id = wi.project_id "
            + "WHERE p.workspace_id = ? AND wi.created_at > ? AND wi.deleted_at IS NULL",
            sf.getWorkspaceId(), since);
        int count = 0;
        for (Map<String, Object> i : items) {
            if (matcher.matches(sf.getFilterJson(), sf.getCreatedBy(),
                    (String) i.get("priority"), (String) i.get("type"), (String) i.get("assignee_id"))) {
                count++;
            }
        }
        return count;
    }
}
