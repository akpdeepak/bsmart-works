package com.example.demo;

import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.IsoFields;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Captures immutable per-period metric snapshots (iteration 12, Cap L · "Metric definitions and
 * snapshots"). For a workspace it freezes the current value of every computable metric at the ORG and
 * per-TEAM scopes for the period — historical metrics are <strong>append-only</strong> and never
 * change retroactively, so the series is audit-safe (RB-20 §5). Re-running for a period already
 * snapshotted is a no-op (the first value is frozen). Only aggregated scopes are recorded — never an
 * individual — and the per-workspace anonymity floor is applied so a thin "team" never leaks a person.
 */
@Service
public class MetricSnapshotService {

    private final MetricSnapshotRepository snapshots;
    private final TeamRepository teams;
    private final AggregationService aggregation;
    private final KpiComputationService computation;
    private final KpiPrivacyService privacy;
    private final KpiService kpi;

    public MetricSnapshotService(MetricSnapshotRepository snapshots, TeamRepository teams,
                                 AggregationService aggregation, KpiComputationService computation,
                                 KpiPrivacyService privacy, KpiService kpi) {
        this.snapshots = snapshots;
        this.teams = teams;
        this.aggregation = aggregation;
        this.computation = computation;
        this.privacy = privacy;
        this.kpi = kpi;
    }

    /** ISO-week label like {@code 2026-W23} for the period containing {@code date}. */
    public String isoWeekLabel(LocalDate date) {
        int week = date.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
        int year = date.get(IsoFields.WEEK_BASED_YEAR);
        return String.format("%d-W%02d", year, week);
    }

    /** Capture ORG + per-team snapshots for the workspace for the period containing {@code refDate}. */
    public int snapshotWorkspace(String workspaceId, LocalDate refDate) {
        String label = isoWeekLabel(refDate);
        LocalDate start = refDate.with(java.time.DayOfWeek.MONDAY);
        LocalDate end = start.plusDays(6);
        int minSize = privacy.effectiveMinAggregationSize(kpi.settings(workspaceId));

        int written = recordScope(workspaceId, "ORG", null,
            aggregation.resolve("ORG", null, null, List.of(), workspaceId), label, start, end, minSize);

        for (Team team : teams.findByWorkspaceIdOrderByNameAsc(workspaceId)) {
            List<String> projectIds = aggregation.parseProjectIds(team.getProjectIds());
            written += recordScope(workspaceId, "TEAM", team.getId(),
                aggregation.resolve("TEAM", null, null, projectIds, null), label, start, end, minSize);
        }
        return written;
    }

    private int recordScope(String workspaceId, String scope, String scopeRef,
                            AggregationService.ScopeFilter filter, String label,
                            LocalDate start, LocalDate end, int minSize) {
        KpiComputationService.Computed computed = computation.compute(filter);
        boolean suppress = privacy.mustSuppress(scope, computed.contributors(), minSize);
        int written = 0;
        for (Map.Entry<String, Double> e : computed.values().entrySet()) {
            if (alreadyRecorded(workspaceId, e.getKey(), scope, scopeRef, label)) {
                continue; // immutable: never overwrite a frozen period
            }
            MetricSnapshot snap = new MetricSnapshot();
            snap.setId("SNAP-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase());
            snap.setWorkspaceId(workspaceId);
            snap.setMetricKey(e.getKey());
            snap.setScope(scope);
            snap.setScopeRef(scopeRef);
            snap.setPeriodLabel(label);
            snap.setPeriodStart(start);
            snap.setPeriodEnd(end);
            snap.setValue(suppress ? null : e.getValue());
            snap.setSampleSize(computed.contributors());
            snap.setSuppressed(suppress);
            snap.setCreatedAt(OffsetDateTime.now());
            snapshots.save(snap);
            written++;
        }
        return written;
    }

    private boolean alreadyRecorded(String workspaceId, String key, String scope, String scopeRef, String label) {
        return scopeRef == null
            ? snapshots.existsByWorkspaceIdAndMetricKeyAndScopeAndScopeRefIsNullAndPeriodLabel(
                workspaceId, key, scope, label)
            : snapshots.existsByWorkspaceIdAndMetricKeyAndScopeAndScopeRefAndPeriodLabel(
                workspaceId, key, scope, scopeRef, label);
    }
}
