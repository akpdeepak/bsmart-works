package com.bcits.works;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Focus mode + time blocking (Cap U, iteration 14). Focus blocks are <b>private to their owner</b>
 * (RB-40 §1): every method is scoped to a single {@code userId} and a block belongs to exactly one
 * user. During an active block all non-urgent notifications are suppressed; only a P0 incident
 * breaks through (and only if the block allows it) — the deterministic rule consulted at the
 * notification choke point ({@link NotificationBatchService}).
 *
 * <p>The pure suppression decision ({@link #suppresses}) is static so it is unit-testable without a
 * database (RB-10 §7).
 */
@Service
public class FocusModeService {

    private final FocusBlockRepository focusBlocks;
    private final EventService events;

    public FocusModeService(FocusBlockRepository focusBlocks, EventService events) {
        this.focusBlocks = focusBlocks;
        this.events = events;
    }

    /** Pure rule: a non-cancelled block covering {@code now} suppresses everything except a P0 that
     *  the block lets through. Returns true when the notification should be held back. */
    public static boolean suppresses(FocusBlock block, boolean isP0, OffsetDateTime now) {
        if (block == null) return false;
        if (!"SCHEDULED".equals(block.getStatus())) return false;
        boolean active = !block.getStartsAt().isAfter(now) && block.getEndsAt().isAfter(now);
        if (!active) return false;
        // Only a P0 the block explicitly allows breaks through; everything else is suppressed.
        return !(isP0 && block.isAllowP0());
    }

    /** The user's currently-active focus block, if any. */
    public Optional<FocusBlock> activeBlock(String userId, OffsetDateTime now) {
        return focusBlocks
            .findByUserIdAndStatusAndStartsAtBeforeAndEndsAtAfter(userId, "SCHEDULED", now, now)
            .stream().findFirst();
    }

    /** Whether a notification of the given urgency should be held back for this user right now. */
    public boolean isSuppressed(String userId, boolean isP0) {
        OffsetDateTime now = OffsetDateTime.now();
        return activeBlock(userId, now).map(b -> suppresses(b, isP0, now)).orElse(false);
    }

    /** Status indicator for the avatar: "In focus until 12:30" (RB-30 — others see this). */
    public FocusStatus status(String userId) {
        OffsetDateTime now = OffsetDateTime.now();
        return activeBlock(userId, now)
            .map(b -> new FocusStatus(true, b.getTitle(), b.getEndsAt(), b.isAllowP0()))
            .orElse(new FocusStatus(false, null, null, false));
    }

    public record FocusStatus(boolean inFocus, String title, OffsetDateTime until, boolean allowP0) { }

    public List<FocusBlock> list(String workspaceId, String userId) {
        return focusBlocks.findByWorkspaceIdAndUserIdOrderByStartsAtDesc(workspaceId, userId);
    }

    @Transactional
    public FocusBlock schedule(String workspaceId, String userId, String title,
                               OffsetDateTime startsAt, OffsetDateTime endsAt, boolean allowP0, String source) {
        if (startsAt == null || endsAt == null || !endsAt.isAfter(startsAt)) {
            throw ApiException.badRequest("INVALID_RANGE", "A focus block must end after it starts.");
        }
        FocusBlock b = new FocusBlock();
        b.setWorkspaceId(workspaceId);
        b.setUserId(userId);
        b.setTitle(title == null || title.isBlank() ? "Focus" : title.trim());
        b.setStartsAt(startsAt);
        b.setEndsAt(endsAt);
        b.setStatus("SCHEDULED");
        b.setSource(source == null ? "MANUAL" : source);
        b.setAllowP0(allowP0);
        b.setCreatedAt(OffsetDateTime.now());
        FocusBlock saved = focusBlocks.save(b);
        events.recordInWorkspace(workspaceId, "FB-" + saved.getId(), "focus_block.scheduled", userId,
            java.util.Map.of("title", saved.getTitle(), "from", String.valueOf(startsAt), "to", String.valueOf(endsAt)));
        return saved;
    }

    /** Cancel a block. A user may only cancel their own block (private — RB-40 §1); another user's
     *  id resolves to 404 so the block's existence is never confirmed. */
    @Transactional
    public FocusBlock cancel(Long id, String userId) {
        FocusBlock b = focusBlocks.findById(id)
            .orElseThrow(() -> ApiException.notFound("FocusBlock", String.valueOf(id)));
        if (!userId.equals(b.getUserId())) {
            throw ApiException.notFound("FocusBlock", String.valueOf(id));
        }
        b.setStatus("CANCELLED");
        FocusBlock saved = focusBlocks.save(b);
        events.recordInWorkspace(b.getWorkspaceId(), "FB-" + id, "focus_block.cancelled", userId, java.util.Map.of());
        return saved;
    }
}
