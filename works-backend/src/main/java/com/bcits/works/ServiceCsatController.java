package com.bcits.works;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * CSAT reporting for the service desk (iteration 9, Cap N). Workspace-scoped trends (count, average,
 * 1..5 distribution, % satisfied) for the BCITS quality team. Reads require workspace membership
 * (RB-40 §1); aggregation is delegated to {@link CsatService}.
 */
@RestController
@RequestMapping("/api/v1/service/csat")
public class ServiceCsatController {

    private final CsatResponseRepository csat;
    private final CsatService csatService;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public ServiceCsatController(CsatResponseRepository csat, CsatService csatService,
                                 AuthenticatedUser authenticatedUser, RbacService rbac) {
        this.csat = csat;
        this.csatService = csatService;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping
    public Map<String, Object> trends(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        List<CsatResponse> responses = csat.findByWorkspaceIdOrderBySubmittedAtDesc(workspaceId);
        CsatService.CsatSummary summary = csatService.summarize(responses);
        return Map.of(
                "summary", Map.of(
                        "count", summary.count(),
                        "average", summary.average(),
                        "distribution", summary.distribution(),
                        "percentSatisfied", summary.percentSatisfied()),
                "responses", responses);
    }
}
