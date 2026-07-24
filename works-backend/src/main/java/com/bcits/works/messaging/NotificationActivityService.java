package com.bcits.works.messaging;
import com.bcits.works.workspaces.api.Workspace;
import com.bcits.works.messaging.api.Notification;
import com.bcits.works.messaging.api.NotificationRepository;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.RbacGate;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Workspace-scoped notification history, intentionally separate from the actionable Inbox. */
@Service
public class NotificationActivityService {

    private final NotificationRepository notifications;
    private final RbacGate rbac;

    public NotificationActivityService(NotificationRepository notifications, RbacGate rbac) {
        this.notifications = notifications;
        this.rbac = rbac;
    }

    @Transactional(readOnly = true, timeout = 2)
    public List<Notification> list(String workspaceId, String userId, int page, int size) {
        requireWorkspace(workspaceId, userId);
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 200);
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        return notifications.findByWorkspaceIdAndUserId(workspaceId, userId, pageable);
    }

    @Transactional(readOnly = true, timeout = 2)
    public long unreadCount(String workspaceId, String userId) {
        requireWorkspace(workspaceId, userId);
        return notifications.countByWorkspaceIdAndUserIdAndIsRead(workspaceId, userId, false);
    }

    @Transactional
    public Notification markRead(String workspaceId, String userId, Long id) {
        requireWorkspace(workspaceId, userId);
        Notification notification = notifications.findById(id)
            .filter(candidate -> workspaceId.equals(candidate.getWorkspaceId()))
            .filter(candidate -> userId.equals(candidate.getUserId()))
            .orElseThrow(() -> ApiException.notFound("Notification", String.valueOf(id)));
        notification.setRead(true);
        return notifications.save(notification);
    }

    @Transactional
    public void markAllRead(String workspaceId, String userId) {
        requireWorkspace(workspaceId, userId);
        List<Notification> unread = notifications
            .findByWorkspaceIdAndUserIdOrderByCreatedAtDesc(workspaceId, userId);
        unread.forEach(notification -> notification.setRead(true));
        notifications.saveAll(unread);
    }

    private void requireWorkspace(String workspaceId, String userId) {
        if (workspaceId == null || workspaceId.isBlank()) {
            throw ApiException.badRequest("WORKSPACE_REQUIRED", "A workspaceId is required.", "workspaceId");
        }
        rbac.require(userId, workspaceId, "view_items");
    }
}
