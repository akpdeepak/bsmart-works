package com.example.demo;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/dashboards")
@CrossOrigin(origins = "*")
public class DashboardController {

    @Autowired private DashboardService dashboardService;

    @GetMapping("/developer")
    public ResponseEntity<Map<String, Object>> getDeveloperDashboard(
            @RequestParam String userId) {
        return ResponseEntity.ok(dashboardService.getDeveloperDashboard(userId));
    }

    @GetMapping("/scrum-master")
    public ResponseEntity<Map<String, Object>> getScrumMasterDashboard(
            @RequestParam(defaultValue = "WS-001") String workspaceId) {
        return ResponseEntity.ok(dashboardService.getScrumMasterDashboard(workspaceId));
    }

    @GetMapping("/product-owner")
    public ResponseEntity<Map<String, Object>> getProductOwnerDashboard(
            @RequestParam(defaultValue = "WS-001") String workspaceId) {
        return ResponseEntity.ok(dashboardService.getProductOwnerDashboard(workspaceId));
    }

    @GetMapping("/executive")
    public ResponseEntity<Map<String, Object>> getExecutiveDashboard(
            @RequestParam(defaultValue = "WS-001") String workspaceId) {
        return ResponseEntity.ok(dashboardService.getExecutiveDashboard(workspaceId));
    }

    @GetMapping("/admin")
    public ResponseEntity<Map<String, Object>> getAdminDashboard(
            @RequestParam(defaultValue = "WS-001") String workspaceId) {
        return ResponseEntity.ok(dashboardService.getAdminDashboard(workspaceId));
    }
}
