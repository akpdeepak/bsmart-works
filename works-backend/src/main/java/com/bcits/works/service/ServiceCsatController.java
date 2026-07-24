package com.bcits.works.service;
import com.bcits.works.shared.RbacGate;

import com.bcits.works.shared.AuthenticatedUser;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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
    private final RbacGate rbac;

    public ServiceCsatController(CsatResponseRepository csat, CsatService csatService,
                                 AuthenticatedUser authenticatedUser, RbacGate rbac) {
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
