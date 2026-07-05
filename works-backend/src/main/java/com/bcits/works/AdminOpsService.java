package com.bcits.works;

import com.bcits.works.workspaces.LicenseSeats;
import com.bcits.works.workspaces.LicenseSeatsRepository;
import com.bcits.works.shared.RbacGate;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Cap Y · Admin Operations Center (iteration 16) — the operational admin surfaces: workspace health
 * monitor, AI cost dashboard, integration health (with retry/replay), and license/seat management.
 * All reads are workspace-scoped (RB-40 §1) and gated to workspace admins (RB-10 §2).
 */
@Service
public class AdminOpsService {

    private final JdbcTemplate jdbc;
    private final RbacGate rbac;
    private final AiControlPlaneService aiControlPlane;
    private final LicenseSeatsRepository seats;
    private final WebhookService webhooks;
    private final EventService events;

    public AdminOpsService(JdbcTemplate jdbc, RbacGate rbac, AiControlPlaneService aiControlPlane,
                           LicenseSeatsRepository seats, WebhookService webhooks, EventService events) {
        this.jdbc = jdbc;
        this.rbac = rbac;
        this.aiControlPlane = aiControlPlane;
        this.seats = seats;
        this.webhooks = webhooks;
        this.events = events;
    }

    /** Admin Ops is an admin-tier surface: a non-member sees a 404, a non-admin member a 403. */
    void requireAdmin(String callerId, String wsId) {
        if (wsId == null || rbac.getUserTier(callerId, wsId) < 1) {
            throw ApiException.notFound("Workspace", wsId);
        }
        if (!rbac.isAdmin(callerId, wsId)) {
            throw ApiException.forbidden("Admin Operations requires a workspace administrator.");
        }
    }

    // ── Cap Y · Workspace health monitor ─────────────────────────────────────────
    public Map<String, Object> workspaceHealth(String callerId, String workspaceId) {
        requireAdmin(callerId, workspaceId);

        long members = jdbc.queryForObject(
            "SELECT COUNT(*) FROM workspace_members WHERE workspace_id = ?", Long.class, workspaceId);
        long projects = jdbc.queryForObject(
            "SELECT COUNT(*) FROM projects WHERE workspace_id = ?", Long.class, workspaceId);
        long items = jdbc.queryForObject(
            "SELECT COUNT(*) FROM work_items wi JOIN projects p ON p.id = wi.project_id "
            + "WHERE p.workspace_id = ? AND wi.deleted_at IS NULL", Long.class, workspaceId);
        Long storageBytes = jdbc.queryForObject(
            "SELECT COALESCE(SUM(a.file_size), 0) FROM attachments a "
            + "JOIN work_items wi ON wi.id = a.work_item_id JOIN projects p ON p.id = wi.project_id "
            + "WHERE p.workspace_id = ?", Long.class, workspaceId);
        long eventsToday = jdbc.queryForObject(
            "SELECT COUNT(*) FROM events WHERE workspace_id = ? AND occurred_at >= CURRENT_DATE",
            Long.class, workspaceId);
        long integrations = jdbc.queryForObject(
            "SELECT COUNT(*) FROM integration_connections WHERE workspace_id = ?", Long.class, workspaceId);
        long integrationsDown = jdbc.queryForObject(
            "SELECT COUNT(*) FROM integration_connections WHERE workspace_id = ? AND status <> 'CONNECTED'",
            Long.class, workspaceId);
        long failedDeliveries = jdbc.queryForObject(
            "SELECT COUNT(*) FROM webhook_deliveries WHERE workspace_id = ? AND status = 'FAILED'",
            Long.class, workspaceId);

        AiControlPlaneService.BudgetStatus budget = aiControlPlane.budgetStatus(workspaceId);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("members", members);
        out.put("projects", projects);
        out.put("workItems", items);
        out.put("storageBytes", storageBytes);
        out.put("eventsToday", eventsToday);
        out.put("integrations", integrations);
        out.put("integrationsDown", integrationsDown);
        out.put("failedWebhookDeliveries", failedDeliveries);
        out.put("aiBudgetPercent", budget.percent());
        out.put("aiBudgetState", budget.disabled() ? "DISABLED" : budget.degraded() ? "DEGRADED" : "OK");
        return out;
    }

    // ── Cap Y · AI cost dashboard ────────────────────────────────────────────────
    public Map<String, Object> aiCostDashboard(String callerId, String workspaceId) {
        requireAdmin(callerId, workspaceId);
        AiControlPlaneService.BudgetStatus budget = aiControlPlane.budgetStatus(workspaceId);

        String monthFilter = "AND created_at >= DATE_TRUNC('month', NOW())";
        List<Map<String, Object>> byCapability = jdbc.queryForList(
            "SELECT capability, COUNT(*) AS calls, COALESCE(SUM(cost_cents),0) AS cost_cents, "
            + "COUNT(*) FILTER (WHERE cache_hit) AS cache_hits, COUNT(*) FILTER (WHERE fallback_used) AS fallbacks "
            + "FROM ai_invocations WHERE workspace_id = ? " + monthFilter
            + " GROUP BY capability ORDER BY cost_cents DESC", workspaceId);
        List<Map<String, Object>> byUser = jdbc.queryForList(
            "SELECT i.user_id, u.full_name, COUNT(*) AS calls, COALESCE(SUM(i.cost_cents),0) AS cost_cents "
            + "FROM ai_invocations i LEFT JOIN users u ON u.id = i.user_id "
            + "WHERE i.workspace_id = ? " + monthFilter.replace("created_at", "i.created_at")
            + " GROUP BY i.user_id, u.full_name ORDER BY cost_cents DESC", workspaceId);
        List<Map<String, Object>> byTier = jdbc.queryForList(
            "SELECT model_tier, COUNT(*) AS calls, COALESCE(SUM(cost_cents),0) AS cost_cents "
            + "FROM ai_invocations WHERE workspace_id = ? " + monthFilter
            + " GROUP BY model_tier ORDER BY cost_cents DESC", workspaceId);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("period", budget.period());
        out.put("capCents", budget.capCents());
        out.put("spentCents", budget.spentCents());
        out.put("percent", budget.percent());
        out.put("degraded", budget.degraded());
        out.put("disabled", budget.disabled());
        out.put("byCapability", byCapability);
        out.put("byUser", byUser);
        out.put("byTier", byTier);
        out.put("alert", budget.disabled() ? "Budget exhausted — AI auto-disabled; fallbacks are being served."
            : budget.degraded() ? "Over 80% of budget — AI degraded to the cheap tier."
            : null);
        return out;
    }

    @Transactional
    public Map<String, Object> setAiBudget(String callerId, String workspaceId, long capCents) {
        requireAdmin(callerId, workspaceId);
        aiControlPlane.setBudgetCap(workspaceId, capCents);
        events.recordInWorkspace(workspaceId, workspaceId, "AI_BUDGET_UPDATED", callerId,
            Map.of("capCents", capCents));
        return aiCostDashboard(callerId, workspaceId);
    }

    // ── Cap Y · Integration health dashboard (+ retry / replay) ──────────────────
    public Map<String, Object> integrationHealth(String callerId, String workspaceId) {
        requireAdmin(callerId, workspaceId);

        List<Map<String, Object>> connections = jdbc.queryForList(
            "SELECT id, provider, name, status, updated_at FROM integration_connections "
            + "WHERE workspace_id = ? ORDER BY provider, name", workspaceId);
        Map<String, Object> webhookStats = jdbc.queryForMap(
            "SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE active) AS active "
            + "FROM webhook_subscriptions WHERE workspace_id = ?", workspaceId);
        Map<String, Object> deliveryStats = jdbc.queryForMap(
            "SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'DELIVERED') AS delivered, "
            + "COUNT(*) FILTER (WHERE status = 'FAILED') AS failed, "
            + "COUNT(*) FILTER (WHERE status = 'PENDING') AS pending "
            + "FROM webhook_deliveries WHERE workspace_id = ?", workspaceId);
        List<Map<String, Object>> failed = jdbc.queryForList(
            "SELECT id, event_type, attempts, max_attempts, response_code, last_error, updated_at "
            + "FROM webhook_deliveries WHERE workspace_id = ? AND status = 'FAILED' "
            + "ORDER BY updated_at DESC LIMIT 50", workspaceId);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("connections", connections);
        out.put("webhooks", webhookStats);
        out.put("deliveries", deliveryStats);
        out.put("failedDeliveries", failed);
        return out;
    }

    /** Retry a failed webhook delivery (Cap Y). Admin-gated; the actual redelivery is workspace-scoped. */
    public WebhookDelivery retryDelivery(String callerId, String workspaceId, String deliveryId) {
        requireAdmin(callerId, workspaceId);
        WebhookDelivery d = webhooks.redeliver(workspaceId, deliveryId);
        events.recordInWorkspace(workspaceId, deliveryId, "WEBHOOK_DELIVERY_RETRIED", callerId, Map.of());
        return d;
    }

    // ── Cap Y · License / seat management ────────────────────────────────────────
    public Map<String, Object> licenseSeats(String callerId, String workspaceId) {
        requireAdmin(callerId, workspaceId);
        LicenseSeats cfg = seats.findById(workspaceId).orElseGet(() -> {
            LicenseSeats fresh = new LicenseSeats();
            fresh.setWorkspaceId(workspaceId);
            return fresh;
        });
        long active = jdbc.queryForObject(
            "SELECT COUNT(*) FROM workspace_members WHERE workspace_id = ?", Long.class, workspaceId);
        return seatPayload(cfg, active);
    }

    @Transactional
    public Map<String, Object> updateLicenseSeats(String callerId, String workspaceId, String planName,
                                                  int totalSeats, int costPerSeatCents, LocalDate renewalDate) {
        requireAdmin(callerId, workspaceId);
        LicenseSeats cfg = seats.findById(workspaceId).orElseGet(() -> {
            LicenseSeats fresh = new LicenseSeats();
            fresh.setWorkspaceId(workspaceId);
            return fresh;
        });
        if (planName != null) cfg.setPlanName(planName); {
        cfg.setTotalSeats(Math.max(0, totalSeats));
        }
        cfg.setCostPerSeatCents(Math.max(0, costPerSeatCents));
        cfg.setRenewalDate(renewalDate);
        cfg.setUpdatedAt(OffsetDateTime.now());
        seats.save(cfg);
        events.recordInWorkspace(workspaceId, workspaceId, "LICENSE_SEATS_UPDATED", callerId,
            Map.of("totalSeats", cfg.getTotalSeats()));
        long active = jdbc.queryForObject(
            "SELECT COUNT(*) FROM workspace_members WHERE workspace_id = ?", Long.class, workspaceId);
        return seatPayload(cfg, active);
    }

    private Map<String, Object> seatPayload(LicenseSeats cfg, long activeSeats) {
        int available = (int) Math.max(0, cfg.getTotalSeats() - activeSeats);
        long monthlyCost = (long) cfg.getTotalSeats() * cfg.getCostPerSeatCents();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("planName", cfg.getPlanName());
        out.put("totalSeats", cfg.getTotalSeats());
        out.put("activeSeats", activeSeats);
        out.put("availableSeats", available);
        out.put("costPerSeatCents", cfg.getCostPerSeatCents());
        out.put("monthlyCostCents", monthlyCost);
        out.put("renewalDate", cfg.getRenewalDate());
        out.put("utilizationPercent", cfg.getTotalSeats() == 0 ? 0 : (int) Math.round(activeSeats * 100.0 / cfg.getTotalSeats()));
        out.put("renewalAlert", renewalSoon(cfg.getRenewalDate()));
        out.put("growthProjection", projectGrowth(activeSeats));
        return out;
    }

    /** Naive linear projection: +1 seat / 10% headroom signal. Pure, illustrative. */
    static long projectGrowth(long activeSeats) {
        return Math.round(activeSeats * 1.15);
    }

    static boolean renewalSoon(LocalDate renewalDate) {
        return renewalDate != null && !renewalDate.isAfter(LocalDate.now().plusDays(30));
    }
}
