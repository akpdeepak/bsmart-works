package com.bcits.works.reporting;

import com.bcits.works.EmailService;
import com.bcits.works.workspaces.SavedView;
import com.bcits.works.workspaces.SavedViewRepository;
import com.bcits.works.shared.RbacGate;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.BqlContext;

import com.bcits.works.shared.BqlContextFactory;
import com.bcits.works.shared.BqlExecutionService;
import com.bcits.works.security.BqlRunAudit;
import com.bcits.works.security.BqlRunAuditService;
import com.bcits.works.messaging.Notification;
import com.bcits.works.messaging.NotificationRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Saved-view subscriptions (Batch 5): a user subscribes to a view and the scheduler delivers a
 * periodic in-app + email summary of how many items currently match. Each delivery runs the view
 * through the same audited, workspace-scoped path as a manual run ({@link BqlExecutionService} +
 * {@link BqlRunAuditService}), so a subscription is a first-class "saved/automated run".
 *
 * <p>RBAC: subscribing requires {@code view_items} on the workspace (RB-10 §2); a user manages only
 * their own subscriptions. The scheduler re-checks workspace membership at delivery time and
 * deactivates a subscription whose owner has lost access — so it can never leak counts to someone
 * removed from the workspace (RB-40 §1).
 */
@Service
public class BqlSubscriptionService {

    private static final Logger log = LoggerFactory.getLogger(BqlSubscriptionService.class);
    private static final String APP_URL = "http://localhost:5173";

    private final BqlSubscriptionRepository subs;
    private final SavedViewRepository views;
    private final RbacGate rbac;
    private final BqlExecutionService execution;
    private final BqlContextFactory contextFactory;
    private final BqlRunAuditService runAudit;
    private final NotificationRepository notifications;
    private final EmailService email;

    public BqlSubscriptionService(BqlSubscriptionRepository subs, SavedViewRepository views,
                                  RbacGate rbac, BqlExecutionService execution,
                                  BqlContextFactory contextFactory, BqlRunAuditService runAudit,
                                  NotificationRepository notifications, EmailService email) {
        this.subs = subs;
        this.views = views;
        this.rbac = rbac;
        this.execution = execution;
        this.contextFactory = contextFactory;
        this.runAudit = runAudit;
        this.notifications = notifications;
        this.email = email;
    }

    public List<BqlSubscription> list(String callerId, String workspaceId) {
        rbac.require(callerId, workspaceId, "view_items");
        return subs.findByUserIdAndWorkspaceIdOrderByCreatedAtDesc(callerId, workspaceId);
    }

    /**
     * Subscribe the caller to a saved view (idempotent per view+user — re-subscribing updates the
     * cadence/channels and re-activates).
     */
    @Transactional
    public BqlSubscription subscribe(String callerId, String workspaceId, String savedViewId,
                                     String frequency, String channels) {
        rbac.require(callerId, workspaceId, "view_items");
        SavedView view = requireView(workspaceId, savedViewId);
        BqlSubscription.Frequency freq = parseFrequency(frequency);
        BqlSubscription.Channels chan = parseChannels(channels);

        BqlSubscription sub = subs.findBySavedViewIdAndUserId(view.getId(), callerId)
            .orElseGet(BqlSubscription::new);
        if (sub.getId() == null) {
            sub.setId("SUB-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase());
            sub.setCreatedAt(OffsetDateTime.now());
        }
        sub.setWorkspaceId(workspaceId);
        sub.setSavedViewId(view.getId());
        sub.setUserId(callerId);
        sub.setFrequency(freq.name());
        sub.setChannels(chan.name());
        sub.setActive(true);
        return subs.save(sub);
    }

    @Transactional
    public void unsubscribe(String callerId, String workspaceId, String id) {
        rbac.require(callerId, workspaceId, "view_items");
        BqlSubscription sub = subs.findById(id).orElseThrow(() -> ApiException.notFound("Subscription", id));
        if (!callerId.equals(sub.getUserId()) || !workspaceId.equals(sub.getWorkspaceId())) {
            throw ApiException.forbidden("You can only manage your own subscriptions.");
        }
        subs.delete(sub);
    }

    /**
     * Deliver one subscription now: run the view (audited, scoped) and notify the owner. Resilient —
     * a failure on one subscription is logged and swallowed so the scheduler sweep continues.
     * Returns the current match count (or -1 if the delivery was skipped/failed).
     */
    @Transactional
    public int deliver(BqlSubscription sub) {
        try {
            // Owner must still be a workspace member, or the subscription is deactivated (RB-40 §1).
            if (!rbac.canView(sub.getUserId(), sub.getWorkspaceId())) {
                sub.setActive(false);
                subs.save(sub);
                return -1;
            }
            SavedView view = views.findById(sub.getSavedViewId()).orElse(null);
            if (view == null || view.getDeletedAt() != null) {
                sub.setActive(false); // the view is gone — stop trying
                subs.save(sub);
                return -1;
            }
            String query = stripOrderBy(view.getBqlFilter());
            BqlContext ctx = contextFactory.forUser(sub.getUserId(), sub.getWorkspaceId());
            int count = execution.count(sub.getWorkspaceId(), ctx, query);
            runAudit.record(sub.getWorkspaceId(), sub.getUserId(), BqlRunAudit.Source.SUBSCRIPTION,
                sub.getId(), view.getBqlFilter(), count);
            notify(sub, view, count);
            sub.setLastRunAt(OffsetDateTime.now());
            subs.save(sub);
            return count;
        } catch (RuntimeException e) {
            log.warn("[BQL-SUB] delivery failed for {}: {}", sub.getId(), e.getMessage());
            return -1;
        }
    }

    private void notify(BqlSubscription sub, SavedView view, int count) {
        String channels = sub.getChannels();
        boolean inApp = "IN_APP".equals(channels) || "BOTH".equals(channels);
        boolean byEmail = "EMAIL".equals(channels) || "BOTH".equals(channels);
        String link = APP_URL + "/?bql=" + java.net.URLEncoder.encode(
            view.getBqlFilter() == null ? "" : view.getBqlFilter(), java.nio.charset.StandardCharsets.UTF_8);
        if (inApp) {
            Notification n = new Notification();
            n.setWorkspaceId(sub.getWorkspaceId());
            n.setUserId(sub.getUserId());
            n.setType("BQL_SUBSCRIPTION");
            n.setMessage("Saved view \"" + view.getName() + "\" has " + count
                + " matching item" + (count == 1 ? "" : "s") + ".");
            n.setLink(link);
            n.setRead(false);
            n.setCreatedAt(OffsetDateTime.now());
            notifications.save(n);
        }
        if (byEmail) {
            email.sendSubscriptionEmail(sub.getUserId(), view.getName(), count, link);
        }
    }

    // ── helpers ────────────────────────────────────────────────────────────────

    private SavedView requireView(String workspaceId, String id) {
        SavedView v = views.findById(id).orElseThrow(() -> ApiException.notFound("Saved view", id));
        if (!workspaceId.equals(v.getWorkspaceId()) || v.getDeletedAt() != null) {
            throw ApiException.notFound("Saved view", id);
        }
        return v;
    }

    private BqlSubscription.Frequency parseFrequency(String raw) {
        try {
            return BqlSubscription.Frequency.valueOf(raw == null ? "" : raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("BAD_FREQUENCY", "Frequency must be DAILY or WEEKLY.");
        }
    }

    private BqlSubscription.Channels parseChannels(String raw) {
        try {
            return BqlSubscription.Channels.valueOf(raw == null ? "" : raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("BAD_CHANNELS", "Channels must be IN_APP, EMAIL, or BOTH.");
        }
    }

    private static String stripOrderBy(String bql) {
        return bql == null ? "" : bql.replaceAll("(?i)\\s+ORDER\\s+BY\\s+.+$", "").trim();
    }
}
