package com.bcits.works.reporting;


import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class DashboardService {

    private final RoleDashboardQueryService roleDashboards;

    public DashboardService(RoleDashboardQueryService roleDashboards) {
        this.roleDashboards = roleDashboards;
    }

    public Map<String, Object> getDeveloperDashboard(String userId) {
        return roleDashboards.getDeveloperDashboard(userId);
    }

    public Map<String, Object> getScrumMasterDashboard(String workspaceId) {
        return roleDashboards.getScrumMasterDashboard(workspaceId);
    }

    public Map<String, Object> getProductOwnerDashboard(String workspaceId) {
        return roleDashboards.getProductOwnerDashboard(workspaceId);
    }

    public Map<String, Object> getExecutiveDashboard(String workspaceId) {
        return roleDashboards.getExecutiveDashboard(workspaceId);
    }

    public Map<String, Object> getAdminDashboard(String workspaceId) {
        return roleDashboards.getAdminDashboard(workspaceId);
    }
}
