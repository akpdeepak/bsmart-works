package com.bcits.works.workitems;

import com.bcits.works.EmailService;
import com.bcits.works.auth.UserRepository;
import com.bcits.works.messaging.NotificationBatchService;
import com.bcits.works.messaging.WatcherService;
import com.bcits.works.shared.RbacGate;

import org.springframework.stereotype.Service;

import java.util.List;

/**
 * The post-mutation notification pipeline for work items — assignee notifications and the watcher
 * broadcast — carved out of {@link WorkItemCommandService} (RB-10 §2, one job per layer). The command
 * service persists the change, then hands the before/after state here for the "who gets told what"
 * concern.
 *
 * <p>Behaviour is preserved verbatim from the pre-split {@code WorkItemCommandService}, including the
 * name-free stored notification with an actor id resolved at render via the vault (RB-40 §3 Slice 4c)
 * and the batched in-app notification.
 */
@Service
public class WorkItemNotifier {

    private final EmailService emailService;
    private final NotificationBatchService batchService;
    private final UserRepository userRepository;
    private final WatcherService watcherService;
    private final RbacGate rbac;

    public WorkItemNotifier(EmailService emailService, NotificationBatchService batchService,
                            UserRepository userRepository, WatcherService watcherService, RbacGate rbac) {
        this.emailService = emailService;
        this.batchService = batchService;
        this.userRepository = userRepository;
        this.watcherService = watcherService;
        this.rbac = rbac;
    }

    public void notifyAssigneeOnCreate(WorkItem saved, String userId) {
        if (saved.getAssigneeId() != null && !saved.getAssigneeId().equals(userId)) {
            createNotification(rbac.workspaceForProject(saved.getProjectId()), saved.getAssigneeId(), "ASSIGNED",
                "You were assigned to: " + saved.getTitle(), "/items/" + saved.getId());
            String actorName = actorName(userId);
            emailService.sendAssignmentEmail(saved.getAssigneeId(), actorName, saved.getId(), saved.getTitle());
        }
    }

    public void notifyAssigneeOnUpdate(WorkItem saved, String oldAssignee, String userId) {
        String newAssignee = saved.getAssigneeId();
        if (newAssignee != null && !newAssignee.equals(oldAssignee) && !newAssignee.equals(userId)) {
            createNotification(rbac.workspaceForProject(saved.getProjectId()), newAssignee, "ASSIGNED",
                "You were assigned to: " + saved.getTitle(), "/items/" + saved.getId());
            emailService.sendAssignmentEmail(newAssignee, actorName(userId), saved.getId(), saved.getTitle());
        }
    }

    public void notifyWatchers(String id, WorkItem saved, WorkItem updatedItem, String userId, String oldStatus,
                               String oldAssignee, String oldPriority, String oldTitle,
                               java.time.LocalDate oldDueDate, Integer oldStoryPoints,
                               String oldDescription, List<String> oldTags) {
        java.util.Set<String> notified = new java.util.HashSet<>();
        if (userId != null) {
            notified.add(userId);
        }
        String newAssignee = saved.getAssigneeId();
        if (newAssignee != null && !newAssignee.equals(oldAssignee)) {
            watcherService.watch(id, newAssignee);
            notified.add(newAssignee);
        }
        boolean changed = !java.util.Objects.equals(oldStatus, saved.getStatus())
            || !java.util.Objects.equals(oldAssignee, saved.getAssigneeId())
            || !java.util.Objects.equals(oldPriority, saved.getPriority())
            || !java.util.Objects.equals(oldTitle, saved.getTitle())
            || !java.util.Objects.equals(oldDueDate, saved.getDueDate())
            || !java.util.Objects.equals(oldStoryPoints, saved.getStoryPoints())
            || !java.util.Objects.equals(oldDescription, saved.getDescription())
            || (updatedItem.getTags() != null && !oldTags.equals(updatedItem.getTags().stream().sorted().toList()));
        if (changed) {
            String ref = saved.getAutoId() != null ? saved.getAutoId() : saved.getId();
            // Name-free message + actor id (RB-40 §3 Slice 4c): the actor's display name is resolved at
            // render via the vault, so the stored notification carries no raw PII.
            watcherService.notifyWatchers(rbac.workspaceForProject(saved.getProjectId()), id, userId,
                "updated " + ref + " - " + saved.getTitle(),
                notified);
        }
    }

    private void createNotification(String workspaceId, String userId, String type, String message, String link) {
        batchService.createIfNotBatched(workspaceId, userId, type, message, link);
    }

    private String actorName(String userId) {
        return userRepository.findById(userId != null ? userId : "").map(u -> u.getFullName()).orElse("Someone");
    }
}
