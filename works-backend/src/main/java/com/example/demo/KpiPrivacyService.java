package com.example.demo;

import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;

/**
 * The privacy guard for the KPI framework (iteration 12, Cap L) — the single place that decides
 * <em>who may see what</em>. This is the iteration's defining commitment: individual data is private
 * by default, everything above the personal layer is aggregated, and the manager view can never drill
 * into an individual <strong>even via the API</strong> (spec §12; RB-40 §1, §5.2).
 *
 * <p>It is deliberately pure (no I/O) so the guarantees are exhaustively unit-testable; the controller
 * supplies the inputs (the requester's active shares, the workspace policy) and acts on the verdicts.
 *
 * <h3>The five layers</h3>
 * <ul>
 *   <li><b>PERSONAL</b> — an individual's own metrics; visible only to them, or to people they have
 *       voluntarily shared with.</li>
 *   <li><b>TEAM / PROJECT / MANAGER</b> — aggregated only; no individual breakdown is ever produced,
 *       and an individual filter is rejected outright.</li>
 *   <li><b>ORG</b> — organization-wide aggregate.</li>
 * </ul>
 */
@Service
public class KpiPrivacyService {

    /** Workspace default: an aggregate needs ≥3 distinct contributors before it is published. */
    public static final int DEFAULT_MIN_AGGREGATION_SIZE = 3;

    static final Set<String> LAYERS = Set.of("PERSONAL", "TEAM", "PROJECT", "MANAGER", "ORG");

    /** Layers that publish only aggregates — an individual filter here is a privacy violation. */
    static final Set<String> AGGREGATED_LAYERS = Set.of("TEAM", "PROJECT", "MANAGER", "ORG");

    /** Normalize a requested layer; unknown/blank falls back to PERSONAL (the safest layer). */
    public String normalizeLayer(String layer) {
        if (layer == null) {
            return "PERSONAL";
        }
        String l = layer.trim().toUpperCase();
        return LAYERS.contains(l) ? l : "PERSONAL";
    }

    /**
     * The RBAC permission a layer requires beyond plain workspace membership.
     * PERSONAL → none (you can always see your own); aggregated team layers → {@code view_team_metrics};
     * ORG/executive → {@code view_org_metrics}. Most-restrictive-wins: a request is checked against the
     * permission for its layer, so a MEMBER cannot reach a TEAM aggregate even by changing the URL.
     */
    public String requiredPermission(String layer) {
        switch (normalizeLayer(layer)) {
            case "PERSONAL": return null;
            case "ORG":      return "view_org_metrics";
            default:         return "view_team_metrics"; // TEAM | PROJECT | MANAGER
        }
    }

    /** True for layers that may only ever emit aggregates (no per-person rows). */
    public boolean isAggregatedLayer(String layer) {
        return AGGREGATED_LAYERS.contains(normalizeLayer(layer));
    }

    /**
     * Enforce that an aggregated layer is not being abused to read one person's data. Passing an
     * assignee/individual identifier to any non-personal layer is the exact "manager drills into an
     * individual" attack this iteration exists to prevent — so it is a hard 403, not a silent filter.
     */
    public void assertNoIndividualScope(String layer, String requestedIndividualId) {
        if (isAggregatedLayer(layer) && requestedIndividualId != null && !requestedIndividualId.isBlank()) {
            throw ApiException.forbidden(
                "Individual-level metrics are not available on the " + normalizeLayer(layer)
                    + " view. This is a deliberate privacy guarantee, not a missing feature.");
        }
    }

    /**
     * Whether {@code requester} may view {@code owner}'s personal metrics. True when it is the owner
     * themselves, or when the owner has an active (un-expired) voluntary share to the requester.
     * There is intentionally no manager/admin bypass.
     */
    public boolean canViewPersonal(String requesterId, String ownerId,
                                   List<MetricShare> sharesGrantedToRequester, OffsetDateTime now) {
        if (requesterId != null && requesterId.equals(ownerId)) {
            return true;
        }
        if (sharesGrantedToRequester == null) {
            return false;
        }
        return sharesGrantedToRequester.stream().anyMatch(s ->
            s.getOwnerId() != null && s.getOwnerId().equals(ownerId)
                && (requesterId != null && requesterId.equals(s.getSharedWithId()))
                && (s.getExpiresAt() == null || s.getExpiresAt().isAfter(now)));
    }

    /** Guard version of {@link #canViewPersonal} — throws 403 when access is denied. */
    public void assertCanViewPersonal(String requesterId, String ownerId,
                                      List<MetricShare> sharesGrantedToRequester, OffsetDateTime now) {
        if (!canViewPersonal(requesterId, ownerId, sharesGrantedToRequester, now)) {
            throw ApiException.forbidden(
                "These personal metrics are private. The owner has not shared them with you.");
        }
    }

    /** The effective minimum aggregation size for a workspace (its policy, or the default). */
    public int effectiveMinAggregationSize(WorkspaceKpiSettings settings) {
        if (settings == null || settings.getMinAggregationSize() == null) {
            return DEFAULT_MIN_AGGREGATION_SIZE;
        }
        return Math.max(1, settings.getMinAggregationSize());
    }

    /**
     * Whether an aggregate must be suppressed to protect anonymity: an aggregated layer with fewer
     * distinct contributors than the floor would effectively expose an individual, so its value is
     * withheld. PERSONAL is never suppressed (it is the owner's own data).
     */
    public boolean mustSuppress(String layer, int distinctContributors, int minAggregationSize) {
        if (!isAggregatedLayer(layer)) {
            return false;
        }
        return distinctContributors < minAggregationSize;
    }
}
