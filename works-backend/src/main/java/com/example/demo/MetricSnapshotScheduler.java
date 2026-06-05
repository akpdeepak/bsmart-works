package com.example.demo;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

/**
 * Freezes weekly metric snapshots for every workspace (iteration 12, Cap L). Runs Monday 02:00 to
 * capture the week just past. Capture is idempotent — re-running never overwrites a frozen period —
 * so a missed or repeated run is safe. Snapshots are aggregated scopes only (ORG + per-team), with
 * the anonymity floor applied, so the scheduled job can never persist individual data.
 */
@Component
public class MetricSnapshotScheduler {

    private static final Logger log = LoggerFactory.getLogger(MetricSnapshotScheduler.class);

    private final JdbcTemplate jdbc;
    private final MetricSnapshotService snapshotService;

    public MetricSnapshotScheduler(JdbcTemplate jdbc, MetricSnapshotService snapshotService) {
        this.jdbc = jdbc;
        this.snapshotService = snapshotService;
    }

    /** Monday 02:00 — snapshot the period that contains "last Friday" (the week just past). */
    @Scheduled(cron = "0 0 2 * * MON")
    public void captureWeekly() {
        List<String> workspaceIds = jdbc.queryForList("SELECT id FROM workspaces", String.class);
        if (workspaceIds.isEmpty()) {
            return;
        }
        LocalDate lastWeek = LocalDate.now().minusDays(3);
        int total = 0;
        for (String workspaceId : workspaceIds) {
            try {
                total += snapshotService.snapshotWorkspace(workspaceId, lastWeek);
            } catch (RuntimeException e) {
                log.warn("[KPI] snapshot failed for workspace {}: {}", workspaceId, e.getMessage());
            }
        }
        if (total > 0) {
            log.info("[KPI] weekly snapshot wrote {} metric value(s) across {} workspace(s)",
                total, workspaceIds.size());
        }
    }
}
