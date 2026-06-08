package com.bcits.works;

import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

/**
 * Cap Y · Access review HTTP surface (iteration 16). Thin; delegates to {@link AccessReviewService}.
 */
@RestController
@RequestMapping("/api/v1/access-reviews")
public class AccessReviewController {

    private final AccessReviewService service;
    private final AuthenticatedUser authenticatedUser;

    public AccessReviewController(AccessReviewService service, AuthenticatedUser authenticatedUser) {
        this.service = service;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<AccessReview> list(@RequestParam String workspaceId) {
        return service.list(authenticatedUser.id(), workspaceId);
    }

    @GetMapping("/members")
    public List<Map<String, Object>> members(@RequestParam String workspaceId,
                                             @RequestParam(defaultValue = "90") int thresholdDays) {
        return service.members(authenticatedUser.id(), workspaceId, thresholdDays);
    }

    @PostMapping
    public Map<String, Object> start(@RequestParam String workspaceId, @RequestBody(required = false) Map<String, Object> body) {
        int thresholdDays = body == null || body.get("thresholdDays") == null
            ? 90 : ((Number) body.get("thresholdDays")).intValue();
        return service.start(authenticatedUser.id(), workspaceId, thresholdDays);
    }

    @PostMapping("/{reviewId}/deactivate")
    public Map<String, Object> deactivate(@PathVariable String reviewId, @RequestBody Map<String, Object> body) {
        String userId = (String) body.get("userId");
        return service.deactivate(authenticatedUser.id(), reviewId, userId);
    }

    @PostMapping("/{reviewId}/complete")
    public AccessReview complete(@PathVariable String reviewId, @RequestBody(required = false) Map<String, Object> body) {
        String summary = body == null ? null : (String) body.get("summary");
        return service.complete(authenticatedUser.id(), reviewId, summary);
    }
}
