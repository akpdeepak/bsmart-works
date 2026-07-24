package com.bcits.works.messaging;
import com.bcits.works.messaging.api.ActionItem;
import com.bcits.works.messaging.api.ActionItemRepository;

import com.bcits.works.Decision;

import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Converts an internal message into a real work artifact (EPIC-9 message→artifact). Replaces the
 * former stub that stamped a throwaway {@code UUID} into {@code artifact_ref} pointing at nothing:
 * a {@code /task} creates a real {@link ActionItem} and a {@code /decision} a real {@link Decision},
 * both workspace-scoped, and the returned ref is the created entity's id so the message links to a
 * row that actually exists.
 */
@Service
public class MessageArtifactService {

    /** Result of a conversion: the artifact type stamped on the message and the id it now references. */
    public record Artifact(String type, String ref) { }

    private static final String TASK_PREFIX = "/task ";
    private static final String DECISION_PREFIX = "/decision ";
    private static final int MAX_TITLE = 255;

    private final ActionItemRepository actionItems;
    private final DecisionRepository decisions;

    public MessageArtifactService(ActionItemRepository actionItems, DecisionRepository decisions) {
        this.actionItems = actionItems;
        this.decisions = decisions;
    }

    /**
     * If {@code text} is a recognised slash-command, create the artifact in {@code workspaceId} owned
     * by {@code userId} and return it; otherwise return {@code null} (an ordinary message).
     */
    public Artifact convert(String workspaceId, String userId, String text) {
        if (text == null) return null;
        if (text.startsWith(TASK_PREFIX)) {
            String title = title(text.substring(TASK_PREFIX.length()));
            if (title == null) return null;
            return createActionItem(workspaceId, userId, title);
        }
        if (text.startsWith(DECISION_PREFIX)) {
            String title = title(text.substring(DECISION_PREFIX.length()));
            if (title == null) return null;
            return createDecision(workspaceId, userId, title);
        }
        return null;
    }

    private Artifact createActionItem(String workspaceId, String userId, String title) {
        ActionItem a = new ActionItem();
        a.setId("ACT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        a.setWorkspaceId(workspaceId);
        a.setTitle(title);
        a.setDescription("Captured from an internal message.");
        a.setStatus("OPEN");
        a.setPriority("MEDIUM");
        a.setOwnerId(userId);
        a.setCreatedBy(userId);
        OffsetDateTime now = OffsetDateTime.now();
        a.setCreatedAt(now);
        a.setUpdatedAt(now);
        actionItems.save(a);
        return new Artifact("TASK", a.getId());
    }

    private Artifact createDecision(String workspaceId, String userId, String title) {
        Decision d = new Decision();
        d.setId("DEC-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        d.setWorkspaceId(workspaceId);
        d.setTitle(title);
        d.setDescription("Captured from an internal message.");
        d.setStatus("PROPOSED");
        d.setOwnerId(userId);
        d.setCreatedBy(userId);
        OffsetDateTime now = OffsetDateTime.now();
        d.setCreatedAt(now);
        d.setUpdatedAt(now);
        decisions.save(d);
        return new Artifact("DECISION", d.getId());
    }

    private static String title(String raw) {
        if (raw == null) return null;
        String trimmed = raw.trim();
        if (trimmed.isEmpty()) return null;
        return trimmed.length() > MAX_TITLE ? trimmed.substring(0, MAX_TITLE) : trimmed;
    }
}
