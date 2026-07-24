package com.bcits.works.security;
import com.bcits.works.workspaces.api.Workspace;
import com.bcits.works.shared.RbacGate;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Cap Y · Access review (iteration 16). Periodic review of who still has workspace access, surfacing
 * members with no recent activity so an admin can bulk-deactivate them. Admin-gated (RB-10 §2) and
 * tenant-safe (RB-40 §1): a member can only be reviewed/deactivated if they belong to the acting
 * workspace, and deactivation is recorded in the append-only audit log.
 */
@Service
public class AccessReviewService {

    private final JdbcTemplate jdbc;
    private final RbacGate rbac;
    private final AccessReviewRepository reviews;
    private final EventService events;

    public AccessReviewService(JdbcTemplate jdbc, RbacGate rbac, AccessReviewRepository reviews,
                               EventService events) {
        this.jdbc = jdbc;
        this.rbac = rbac;
        this.reviews = reviews;
        this.events = events;
    }

    private void requireAdmin(String callerId, String wsId) {
        if (wsId == null || rbac.getUserTier(callerId, wsId) < 1) {
            throw ApiException.notFound("Workspace", wsId);
        }
        if (!rbac.isAdmin(callerId, wsId)) {
            throw ApiException.forbidden("Access review requires a workspace administrator.");
        }
    }

    public List<AccessReview> list(String callerId, String workspaceId) {
        requireAdmin(callerId, workspaceId);
        return reviews.findByWorkspaceIdOrderByStartedAtDesc(workspaceId);
    }

    /** Members with their last activity instant and inactivity flag (workspace-scoped). */
    public List<Map<String, Object>> members(String callerId, String workspaceId, int thresholdDays) {
        requireAdmin(callerId, workspaceId);
        int days = thresholdDays <= 0 ? 90 : thresholdDays;
        return jdbc.queryForList(
            "SELECT u.id, u.full_name, u.email, u.is_active, wm.role_id, "
            + "(SELECT MAX(e.occurred_at) FROM events e WHERE e.actor_id = u.id AND e.workspace_id = ?) AS last_activity, "
            + "CASE WHEN (SELECT MAX(e.occurred_at) FROM events e WHERE e.actor_id = u.id AND e.workspace_id = ?) "
            + "  IS NULL OR (SELECT MAX(e.occurred_at) FROM events e WHERE e.actor_id = u.id AND e.workspace_id = ?) "
            + "  < NOW() - (? || ' days')::interval THEN TRUE ELSE FALSE END AS inactive "
            + "FROM workspace_members wm JOIN users u ON u.id = wm.user_id "
            + "WHERE wm.workspace_id = ? ORDER BY last_activity ASC NULLS FIRST",
            workspaceId, workspaceId, workspaceId, days, workspaceId);
    }

    @Transactional
    public Map<String, Object> start(String callerId, String workspaceId, int thresholdDays) {
        requireAdmin(callerId, workspaceId);
        List<Map<String, Object>> members = members(callerId, workspaceId, thresholdDays);
        long inactive = members.stream().filter(m -> Boolean.TRUE.equals(m.get("inactive"))).count();

        AccessReview review = new AccessReview();
        review.setId("AR-" + shortId());
        review.setWorkspaceId(workspaceId);
        review.setStatus("OPEN");
        review.setInactiveThresholdDays(thresholdDays <= 0 ? 90 : thresholdDays);
        review.setReviewedCount(members.size());
        review.setDeactivatedCount(0);
        review.setStartedBy(callerId);
        OffsetDateTime now = OffsetDateTime.now();
        review.setStartedAt(now);
        review.setCreatedAt(now);
        reviews.save(review);
        events.recordInWorkspace(workspaceId, review.getId(), "ACCESS_REVIEW_STARTED", callerId,
            Map.of("reviewed", members.size(), "inactive", inactive));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("review", review);
        out.put("members", members);
        out.put("inactiveCount", inactive);
        return out;
    }

    /** Deactivate a member's account (Cap Y · bulk-deactivate). Tenant-guarded: target must be a member here. */
    @Transactional
    public Map<String, Object> deactivate(String callerId, String reviewId, String userId) {
        AccessReview review = reviews.findById(reviewId).orElseThrow(() -> ApiException.notFound("AccessReview", reviewId));
        requireAdmin(callerId, review.getWorkspaceId());

        Integer isMember = jdbc.queryForObject(
            "SELECT COUNT(*) FROM workspace_members WHERE workspace_id = ? AND user_id = ?",
            Integer.class, review.getWorkspaceId(), userId);
        if (isMember == null || isMember == 0) {
            throw ApiException.notFound("WorkspaceMember", userId);
        }
        if (userId.equals(callerId)) {
            throw ApiException.badRequest("VALIDATION", "You cannot deactivate your own account in a review.");
        }
        jdbc.update("UPDATE users SET is_active = FALSE WHERE id = ?", userId);
        review.setDeactivatedCount(review.getDeactivatedCount() + 1);
        reviews.save(review);
        events.recordInWorkspace(review.getWorkspaceId(), userId, "USER_DEACTIVATED", callerId,
            Map.of("reviewId", reviewId));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("review", review);
        out.put("deactivatedUserId", userId);
        return out;
    }

    @Transactional
    public AccessReview complete(String callerId, String reviewId, String summary) {
        AccessReview review = reviews.findById(reviewId).orElseThrow(() -> ApiException.notFound("AccessReview", reviewId));
        requireAdmin(callerId, review.getWorkspaceId());
        review.setStatus("COMPLETED");
        review.setSummary(summary);
        review.setCompletedAt(OffsetDateTime.now());
        reviews.save(review);
        events.recordInWorkspace(review.getWorkspaceId(), review.getId(), "ACCESS_REVIEW_COMPLETED", callerId,
            Map.of("deactivated", review.getDeactivatedCount()));
        return review;
    }

    private static String shortId() {
        return UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}
