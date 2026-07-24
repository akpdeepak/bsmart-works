package com.bcits.works.reporting;

import com.bcits.works.shared.AuthenticatedUser;

import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Saved-view subscriptions — a user subscribes to a view for a periodic in-app + email summary.
 * Thin controller; RBAC + workspace scope live in {@link BqlSubscriptionService} (RB-10 §2).
 */
@RestController
@RequestMapping("/api/v1/bql-subscriptions")
public class BqlSubscriptionController {

    private final BqlSubscriptionService service;
    private final AuthenticatedUser authenticatedUser;

    public BqlSubscriptionController(BqlSubscriptionService service, AuthenticatedUser authenticatedUser) {
        this.service = service;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<BqlSubscription> list(@RequestParam String workspaceId) {
        return service.list(authenticatedUser.id(), workspaceId);
    }

    @PostMapping
    public BqlSubscription subscribe(@RequestParam String workspaceId, @RequestBody Map<String, String> body) {
        return service.subscribe(authenticatedUser.id(), workspaceId,
            body.get("savedViewId"), body.get("frequency"), body.get("channels"));
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> unsubscribe(@RequestParam String workspaceId, @PathVariable String id) {
        service.unsubscribe(authenticatedUser.id(), workspaceId, id);
        return Map.of("ok", true);
    }
}
