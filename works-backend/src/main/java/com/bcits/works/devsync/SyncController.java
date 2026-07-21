package com.bcits.works.devsync;

import com.bcits.works.shared.AuthenticatedUser;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Offline-draft sync endpoint (iteration 18, Cap S). A client replays its offline work-item edits
 * here on reconnect; {@link DraftSyncService} applies each one with optimistic-concurrency conflict
 * detection. RBAC and tenant scoping are enforced per draft in the service (RB-10 §2, RB-40 §1).
 */
@RestController
@RequestMapping("/api/v1/sync")
public class SyncController {

    private final AuthenticatedUser authenticatedUser;
    private final DraftSyncService service;

    public SyncController(AuthenticatedUser authenticatedUser, DraftSyncService service) {
        this.authenticatedUser = authenticatedUser;
        this.service = service;
    }

    public record SyncRequest(List<DraftSyncService.Draft> drafts) { }

    @PostMapping("/work-item-drafts")
    public Map<String, Object> sync(@RequestBody SyncRequest req) {
        String userId = authenticatedUser.id();
        List<DraftSyncService.Draft> drafts = req.drafts() == null ? List.of() : req.drafts();
        return Map.of("results", service.syncWorkItemDrafts(userId, drafts));
    }
}
