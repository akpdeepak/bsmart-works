package com.example.demo;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Observability surface (iteration 18, Cap S — "in-product status page" + "Performance SLAs …
 * monitoring"). Two reads:
 * <ul>
 *   <li>{@code GET /status} — component health for the in-product status page. Any authenticated
 *       user may see it (it carries no tenant data, only up/down + coarse counts).</li>
 *   <li>{@code GET /observability/performance} — the per-operation P50/P95/P99 vs the RB-40 §5
 *       budgets. Operational detail, so it requires an admin on a workspace (RBAC in the service
 *       layer via {@link RbacService}, RB-10 §2).</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/v1")
public class ObservabilityController {

    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;
    private final PerformanceMonitor monitor;
    private final JdbcTemplate jdbc;
    private final String appVersion;

    public ObservabilityController(AuthenticatedUser authenticatedUser, RbacService rbac,
                                   PerformanceMonitor monitor, JdbcTemplate jdbc,
                                   @Value("${app.version:dev}") String appVersion) {
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
        this.monitor = monitor;
        this.jdbc = jdbc;
        this.appVersion = appVersion;
    }

    @GetMapping("/status")
    public Map<String, Object> status() {
        authenticatedUser.id(); // authentication required
        boolean dbUp = checkDb();
        List<Map<String, Object>> components = List.of(
                component("API", true, "Application server responding"),
                component("Database", dbUp, dbUp ? "PostgreSQL reachable" : "PostgreSQL unreachable"),
                component("Real-time", true, "SSE streaming available"));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("status", dbUp ? "operational" : "degraded");
        out.put("version", appVersion);
        out.put("checkedAt", OffsetDateTime.now().toString());
        out.put("components", components);
        return out;
    }

    @GetMapping("/observability/performance")
    public Map<String, Object> performance(@RequestParam String workspaceId) {
        String userId = authenticatedUser.id();
        if (!rbac.isAdmin(userId, workspaceId)) {
            throw ApiException.forbidden("Performance metrics require workspace admin access.");
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("operations", monitor.snapshot());
        out.put("collectedAt", OffsetDateTime.now().toString());
        return out;
    }

    private boolean checkDb() {
        try {
            jdbc.queryForObject("SELECT 1", Integer.class);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private Map<String, Object> component(String name, boolean up, String detail) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("name", name);
        c.put("up", up);
        c.put("detail", detail);
        return c;
    }
}
