package com.bcits.works.workitems;

import com.bcits.works.messaging.api.WatcherService;
import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.AuthenticatedUser;
import com.bcits.works.shared.RbacGate;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class WorkItemEngagementService {

    private final JdbcTemplate jdbc;
    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;
    private final WatcherService watcherService;

    public WorkItemEngagementService(JdbcTemplate jdbc, AuthenticatedUser authenticatedUser,
                                     RbacGate rbac, WatcherService watcherService) {
        this.jdbc = jdbc;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
        this.watcherService = watcherService;
    }

    public Map<String, Object> watch(String workItemId) {
        String userId = requireItemViewAccess(workItemId);
        watcherService.watch(workItemId, userId);
        return Map.of("watching", true, "watchers", watcherService.watchers(workItemId).size());
    }

    public Map<String, Object> unwatch(String workItemId) {
        String userId = requireItemViewAccess(workItemId);
        watcherService.unwatch(workItemId, userId);
        return Map.of("watching", false, "watchers", watcherService.watchers(workItemId).size());
    }

    public Map<String, Object> watchers(String workItemId) {
        String userId = requireItemViewAccess(workItemId);
        List<String> watcherIds = watcherService.watchers(workItemId);
        return Map.of("watchers", watcherIds, "watching", watcherIds.contains(userId));
    }

    public Map<String, Object> star(String workItemId) {
        String userId = requireItemViewAccess(workItemId);
        jdbc.update("INSERT INTO starred_items (user_id, work_item_id) VALUES (?,?) ON CONFLICT DO NOTHING",
                userId, workItemId);
        return Map.of("starred", true, "itemId", workItemId);
    }

    public Map<String, Object> unstar(String workItemId) {
        String userId = requireItemViewAccess(workItemId);
        jdbc.update("DELETE FROM starred_items WHERE user_id = ? AND work_item_id = ?", userId, workItemId);
        return Map.of("starred", false, "itemId", workItemId);
    }

    private String requireItemViewAccess(String workItemId) {
        String userId = authenticatedUser.id();
        String workspaceId = rbac.workspaceForWorkItem(workItemId);
        if (workspaceId == null || rbac.getUserTier(userId, workspaceId) < 1) {
            throw ApiException.notFound("Work item", workItemId);
        }
        return userId;
    }
}
