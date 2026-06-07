package com.example.demo;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * B19: Periodic KPI snapshot writer (iteration 12, Cap L). Runs on a configurable cron schedule
 * (default: hourly) and calls {@link KpiService} to compute and persist org-level metric snapshots
 * for each active workspace. Snapshots are append-only (RB-10 §3, RB-20 §5) — they build up the
 * history that the /kpi/history endpoint and dashboards read from.
 *
 * <p>Only ORG-scope snapshots are written here; team/project/individual snapshots are a natural
 * next step but are intentionally deferred until the KPI history query volume justifies them.
 */
@Component
public class KpiSnapshotScheduler {

    private static final Logger log = LoggerFactory.getLogger(KpiSnapshotScheduler.class);
    private static final DateTimeFormatter PERIOD_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH");

    private final WorkspaceRepository workspaces;
    private final KpiService kpiService;

    public KpiSnapshotScheduler(WorkspaceRepository workspaces, KpiService kpiService) {
        this.workspaces = workspaces;
        this.kpiService = kpiService;
    }

    /**
     * Write hourly org-level KPI snapshots for every active workspace.
     * Cron expression is configurable via {@code kpi.snapshot.cron}; default is every hour on
     * the hour (0 0 * * * *).
     */
    @Scheduled(cron = "${kpi.snapshot.cron:0 0 * * * *}")
    public void writeSnapshots() {
        OffsetDateTime now = OffsetDateTime.now();
        String period = now.format(PERIOD_FMT); // e.g. "2026-06-07T14"
        List<Workspace> allWorkspaces = workspaces.findAll();
        if (allWorkspaces.isEmpty()) return;
        log.info("[KPI-SNAPSHOT] Writing org snapshots for {} workspace(s), period={}", allWorkspaces.size(), period);
        int written = 0;
        int failed = 0;
        for (Workspace ws : allWorkspaces) {
            try {
                writeOrgSnapshot(ws.getId(), period);
                written++;
            } catch (Exception ex) {
                log.warn("[KPI-SNAPSHOT] Failed to write snapshot for workspace={}: {}", ws.getId(), ex.getMessage());
                failed++;
            }
        }
        log.info("[KPI-SNAPSHOT] Done — written={}, failed={}", written, failed);
    }

    private void writeOrgSnapshot(String workspaceId, String period) {
        KpiService.Layer org = kpiService.org(workspaceId);
        for (KpiService.MetricValue mv : org.metrics()) {
            kpiService.snapshot(workspaceId, mv.key(), "ORG", null, period, mv.value(), mv.sampleSize());
        }
    }
}
