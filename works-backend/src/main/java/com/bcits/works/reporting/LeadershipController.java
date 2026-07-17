package com.bcits.works.reporting;

import com.bcits.works.Iteration16AiService;
import com.bcits.works.shared.AuthenticatedUser;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

/**
 * Cap X · Leadership Console HTTP surface (iteration 16). Thin; delegates to {@link LeadershipService}
 * (rollups) and {@link Iteration16AiService} (board deck). RBAC + tenant scoping live in the services.
 */
@RestController
@RequestMapping("/api/v1/leadership")
public class LeadershipController {

    private final LeadershipService service;
    private final Iteration16AiService ai;
    private final AuthenticatedUser authenticatedUser;

    public LeadershipController(LeadershipService service, Iteration16AiService ai,
                                AuthenticatedUser authenticatedUser) {
        this.service = service;
        this.ai = ai;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping("/rollup")
    public Map<String, Object> rollup(@RequestParam String workspaceId) {
        return service.crossTeamRollup(authenticatedUser.id(), workspaceId);
    }

    @GetMapping("/resource-allocation")
    public Map<String, Object> resourceAllocation(@RequestParam String workspaceId) {
        return service.resourceAllocation(authenticatedUser.id(), workspaceId);
    }

    @GetMapping("/risk-portfolio")
    public Map<String, Object> riskPortfolio(@RequestParam String workspaceId) {
        return service.riskPortfolio(authenticatedUser.id(), workspaceId);
    }

    @GetMapping("/customer-health")
    public Map<String, Object> customerHealth(@RequestParam String workspaceId) {
        return service.customerHealth(authenticatedUser.id(), workspaceId);
    }

    @GetMapping("/strategic-themes")
    public Map<String, Object> strategicThemes(@RequestParam String workspaceId) {
        return service.strategicThemes(authenticatedUser.id(), workspaceId);
    }

    @GetMapping("/strategy-execution")
    public Map<String, Object> strategyExecution(@RequestParam String workspaceId) {
        return service.strategyToExecution(authenticatedUser.id(), workspaceId);
    }

    @PostMapping("/board-deck")
    public Map<String, Object> boardDeck(@RequestParam String workspaceId, @RequestBody(required = false) Map<String, Object> body) {
        String quarter = body == null ? null : (String) body.get("quarter");
        boolean inContext = body == null || body.get("aiInContext") == null || Boolean.TRUE.equals(body.get("aiInContext"));
        return ai.boardDeck(workspaceId, authenticatedUser.id(), quarter, inContext);
    }
}
