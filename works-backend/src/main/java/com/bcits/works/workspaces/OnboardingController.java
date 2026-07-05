package com.bcits.works.workspaces;

import com.bcits.works.shared.AuthenticatedUser;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;

/**
 * Cap Y · User lifecycle automation HTTP surface (iteration 16). Thin; delegates to
 * {@link OnboardingPlaybookService}.
 */
@RestController
@RequestMapping("/api/v1/onboarding")
public class OnboardingController {

    private final OnboardingPlaybookService service;
    private final AuthenticatedUser authenticatedUser;

    public OnboardingController(OnboardingPlaybookService service, AuthenticatedUser authenticatedUser) {
        this.service = service;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping("/playbooks")
    public List<Map<String, Object>> playbooks(@RequestParam String workspaceId) {
        return service.listPlaybooks(authenticatedUser.id(), workspaceId);
    }

    @PostMapping("/playbooks")
    public OnboardingPlaybook createPlaybook(@Valid @RequestBody OnboardingPlaybook playbook) {
        return service.createPlaybook(authenticatedUser.id(), playbook);
    }

    @PostMapping("/playbooks/{playbookId}/steps")
    public OnboardingPlaybookStep addStep(@PathVariable String playbookId, @Valid @RequestBody OnboardingPlaybookStep step) {
        return service.addStep(authenticatedUser.id(), playbookId, step);
    }

    @GetMapping("/runs")
    public List<OnboardingRun> runs(@RequestParam String workspaceId) {
        return service.listRuns(authenticatedUser.id(), workspaceId);
    }

    @GetMapping("/runs/{runId}")
    public Map<String, Object> run(@PathVariable String runId) {
        return service.getRun(authenticatedUser.id(), runId);
    }

    @PostMapping("/runs")
    public Map<String, Object> startRun(@RequestParam String workspaceId, @RequestBody Map<String, Object> body) {
        String playbookId = (String) body.get("playbookId");
        String subjectName = (String) body.get("subjectName");
        String subjectEmail = (String) body.get("subjectEmail");
        return service.startRun(authenticatedUser.id(), workspaceId, playbookId, subjectName, subjectEmail);
    }

    @PostMapping("/runs/{runId}/steps/{stepId}/complete")
    public Map<String, Object> completeStep(@PathVariable String runId, @PathVariable String stepId,
                                            @RequestBody(required = false) Map<String, Object> body) {
        boolean skip = body != null && Boolean.TRUE.equals(body.get("skip"));
        String note = body == null ? null : (String) body.get("note");
        return service.completeStep(authenticatedUser.id(), runId, stepId, skip, note);
    }

    @PostMapping("/runs/{runId}/cancel")
    public Map<String, Object> cancelRun(@PathVariable String runId) {
        return service.cancelRun(authenticatedUser.id(), runId);
    }
}
