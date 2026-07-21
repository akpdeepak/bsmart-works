package com.bcits.works.messaging;

import com.bcits.works.shared.AuthenticatedUser;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

/** Thin HTTP boundary for the workspace-scoped Smart Inbox. */
@RestController
@RequestMapping("/api/v1/inbox")
public class SmartInboxController {

    private final SmartInboxService inbox;
    private final AuthenticatedUser authenticatedUser;

    public SmartInboxController(SmartInboxService inbox, AuthenticatedUser authenticatedUser) {
        this.inbox = inbox;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<SmartInboxService.InboxItem> list(@RequestParam String workspaceId) {
        return inbox.list(workspaceId, authenticatedUser.id());
    }

    @GetMapping("/count")
    public Map<String, Long> count(@RequestParam String workspaceId) {
        return Map.of("count", inbox.count(workspaceId, authenticatedUser.id()));
    }

    @PostMapping("/snooze")
    public ResponseEntity<Void> snooze(@RequestParam String workspaceId, @RequestBody SnoozeRequest request) {
        inbox.snooze(workspaceId, authenticatedUser.id(), request.itemKey(), request.until());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/done")
    public ResponseEntity<Void> done(@RequestParam String workspaceId, @RequestBody ItemRequest request) {
        inbox.markDone(workspaceId, authenticatedUser.id(), request.itemKey());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/bulk-done")
    public Map<String, Integer> bulkDone(@RequestParam String workspaceId,
                                         @RequestBody BulkRequest request) {
        return Map.of("updated", inbox.bulkDoneLowPriority(
            workspaceId, authenticatedUser.id(), request.itemKeys()));
    }

    @PostMapping("/missed-summary")
    public SmartInboxService.SummaryResult missedSummary(@RequestParam String workspaceId) {
        return inbox.missedSummary(workspaceId, authenticatedUser.id());
    }

    public record ItemRequest(String itemKey) { }
    public record SnoozeRequest(String itemKey, OffsetDateTime until) { }
    public record BulkRequest(List<String> itemKeys) { }
}
