package com.bcits.works.workspaces;
import com.bcits.works.AdminOpsService;

import com.bcits.works.shared.AuthenticatedUser;
import com.bcits.works.automation.api.WebhookDelivery;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.time.LocalDate;
import java.util.Map;

/**
 * Cap Y · Admin Operations Center HTTP surface (iteration 16). Thin; delegates to
 * {@link AdminOpsService}. RBAC (admin-tier) + tenant scoping live in the service.
 */
@RestController
@RequestMapping("/api/v1/admin")
public class AdminOpsController {

    private final AdminOpsService service;
    private final AuthenticatedUser authenticatedUser;

    public AdminOpsController(AdminOpsService service, AuthenticatedUser authenticatedUser) {
        this.service = service;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping("/health")
    public Map<String, Object> health(@RequestParam String workspaceId) {
        return service.workspaceHealth(authenticatedUser.id(), workspaceId);
    }

    @GetMapping("/ai-cost")
    public Map<String, Object> aiCost(@RequestParam String workspaceId) {
        return service.aiCostDashboard(authenticatedUser.id(), workspaceId);
    }

    @PutMapping("/ai-budget")
    public Map<String, Object> setAiBudget(@RequestParam String workspaceId, @RequestBody Map<String, Object> body) {
        long capCents = body.get("monthlyCapCents") == null ? 0L : ((Number) body.get("monthlyCapCents")).longValue();
        return service.setAiBudget(authenticatedUser.id(), workspaceId, capCents);
    }

    @GetMapping("/integration-health")
    public Map<String, Object> integrationHealth(@RequestParam String workspaceId) {
        return service.integrationHealth(authenticatedUser.id(), workspaceId);
    }

    @PostMapping("/integration-health/retry/{deliveryId}")
    public WebhookDelivery retry(@RequestParam String workspaceId, @PathVariable String deliveryId) {
        return service.retryDelivery(authenticatedUser.id(), workspaceId, deliveryId);
    }

    @GetMapping("/license-seats")
    public Map<String, Object> licenseSeats(@RequestParam String workspaceId) {
        return service.licenseSeats(authenticatedUser.id(), workspaceId);
    }

    @PutMapping("/license-seats")
    public Map<String, Object> updateLicenseSeats(@RequestParam String workspaceId, @RequestBody Map<String, Object> body) {
        String planName = (String) body.get("planName");
        int total = body.get("totalSeats") == null ? 0 : ((Number) body.get("totalSeats")).intValue();
        int cost = body.get("costPerSeatCents") == null ? 0 : ((Number) body.get("costPerSeatCents")).intValue();
        LocalDate renewal = body.get("renewalDate") == null ? null : LocalDate.parse(body.get("renewalDate").toString());
        return service.updateLicenseSeats(authenticatedUser.id(), workspaceId, planName, total, cost, renewal);
    }
}
