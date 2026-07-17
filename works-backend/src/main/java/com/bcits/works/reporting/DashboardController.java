package com.bcits.works.reporting;

import com.bcits.works.shared.AuthenticatedUser;
import com.bcits.works.shared.RbacGate;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/dashboards")
@CrossOrigin(origins = "*")
public class DashboardController {

    private final DashboardService dashboardService;
    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;

    public DashboardController(DashboardService dashboardService,
                               AuthenticatedUser authenticatedUser,
                               RbacGate rbac) {
        this.dashboardService = dashboardService;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping("/developer")
    public ResponseEntity<Map<String, Object>> getDeveloperDashboard() {
        String userId = authenticatedUser.id();
        return ResponseEntity.ok(dashboardService.getDeveloperDashboard(userId));
    }

    @GetMapping("/scrum-master")
    public ResponseEntity<Map<String, Object>> getScrumMasterDashboard(
            @RequestParam String workspaceId) {
        requireView(workspaceId);
        return ResponseEntity.ok(dashboardService.getScrumMasterDashboard(workspaceId));
    }

    @GetMapping("/product-owner")
    public ResponseEntity<Map<String, Object>> getProductOwnerDashboard(
            @RequestParam String workspaceId) {
        requireView(workspaceId);
        return ResponseEntity.ok(dashboardService.getProductOwnerDashboard(workspaceId));
    }

    @GetMapping("/executive")
    public ResponseEntity<Map<String, Object>> getExecutiveDashboard(
            @RequestParam String workspaceId) {
        requireView(workspaceId);
        return ResponseEntity.ok(dashboardService.getExecutiveDashboard(workspaceId));
    }

    @GetMapping("/admin")
    public ResponseEntity<Map<String, Object>> getAdminDashboard(
            @RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "manage_roles");
        return ResponseEntity.ok(dashboardService.getAdminDashboard(workspaceId));
    }

    private void requireView(String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
    }
}
