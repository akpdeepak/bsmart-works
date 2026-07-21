package com.bcits.works.reporting;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@Transactional(readOnly = true, timeout = 2)
public class DashboardService {

    private final RoleDashboardQueryService roleDashboards;

    public DashboardService(RoleDashboardQueryService roleDashboards) {
        this.roleDashboards = roleDashboards;
    }

    public Map<String, Object> getDeveloperDashboard(String userId, String workspaceId) {
        return roleDashboards.getDeveloperDashboard(userId, workspaceId);
    }

    public Map<String, Object> getScrumMasterDashboard(String workspaceId) {
        return roleDashboards.getScrumMasterDashboard(workspaceId);
    }

    public Map<String, Object> getProductOwnerDashboard(String workspaceId, String userId) {
        return roleDashboards.getProductOwnerDashboard(workspaceId, userId);
    }

    public Map<String, Object> getSupportAgentDashboard(String workspaceId, String userId) {
        return roleDashboards.getSupportAgentDashboard(workspaceId, userId);
    }

    public Map<String, Object> getExecutiveDashboard(String workspaceId) {
        return roleDashboards.getExecutiveDashboard(workspaceId);
    }

    public Map<String, Object> getAdminDashboard(String workspaceId) {
        return roleDashboards.getAdminDashboard(workspaceId);
    }
}
