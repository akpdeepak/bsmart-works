package com.bcits.works;
import com.bcits.works.shared.RbacGate;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;
import com.bcits.works.reporting.ConversationalDashboard;
import com.bcits.works.reporting.ConversationalDashboardService;
import com.bcits.works.ai.AiAgentRun;
import com.bcits.works.ai.AiAgentService;
import com.bcits.works.ai.AiAssistant;
import com.bcits.works.ai.AiAssistantService;
import com.bcits.works.ai.AiMemory;
import com.bcits.works.ai.AiMemoryService;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Iteration-20 advanced-AI surfaces (Cap O): custom assistants, multi-step agents, AI memory and
 * conversational dashboards. RBAC is enforced here at the boundary (RB-10 §2): reads and chat/run
 * require workspace membership ({@code view_items}); creating, editing or deleting an assistant
 * requires {@code manage_ai}. Every endpoint is workspace-scoped (RB-40 §1); the model calls behind
 * them route through the AI Control Plane in the services. Shares the {@code /api/v1/ai} prefix with
 * {@link AiController} / {@link AiAssistController} — paths are disjoint.
 */
@RestController
@RequestMapping("/api/v1/ai")
public class AdvancedAiController {

    private final AiAssistantService assistants;
    private final AiAgentService agents;
    private final AiMemoryService memory;
    private final ConversationalDashboardService dashboards;
    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;

    public AdvancedAiController(AiAssistantService assistants, AiAgentService agents, AiMemoryService memory,
                                ConversationalDashboardService dashboards, AuthenticatedUser authenticatedUser,
                                RbacGate rbac) {
        this.assistants = assistants;
        this.agents = agents;
        this.memory = memory;
        this.dashboards = dashboards;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    private String requireMember(String workspaceId) {
        String userId = authenticatedUser.id();
        if (workspaceId == null || workspaceId.isBlank()) {
            throw ApiException.badRequest("WORKSPACE_REQUIRED", "workspaceId is required.");
        }
        rbac.require(userId, workspaceId, "view_items");
        return userId;
    }

    private String requireManageAi(String workspaceId) {
        String userId = authenticatedUser.id();
        if (workspaceId == null || workspaceId.isBlank()) {
            throw ApiException.badRequest("WORKSPACE_REQUIRED", "workspaceId is required.");
        }
        rbac.require(userId, workspaceId, "manage_ai");
        return userId;
    }

    // ── Custom assistants ───────────────────────────────────────────────────────────

    @GetMapping("/assistants")
    public List<AiAssistant> listAssistants(@RequestParam String workspaceId,
                                            @RequestParam(defaultValue = "false") boolean enabledOnly) {
        String userId = requireMember(workspaceId);
        return enabledOnly ? assistants.listEnabled(workspaceId) : assistants.list(workspaceId);
    }

    @GetMapping("/assistants/{id}")
    public AiAssistant getAssistant(@RequestParam String workspaceId, @PathVariable String id) {
        requireMember(workspaceId);
        return assistants.get(workspaceId, id);
    }

    public record AssistantRequest(String name, String description, String persona, Boolean enabled) { }

    @PostMapping("/assistants")
    public AiAssistant createAssistant(@RequestParam String workspaceId, @Valid @RequestBody AssistantRequest req) {
        String userId = requireManageAi(workspaceId);
        return assistants.create(workspaceId, userId, req.name(), req.description(), req.persona());
    }

    @PutMapping("/assistants/{id}")
    public AiAssistant updateAssistant(@RequestParam String workspaceId, @PathVariable String id,
                                       @Valid @RequestBody AssistantRequest req) {
        String userId = requireManageAi(workspaceId);
        return assistants.update(workspaceId, userId, id, req.name(), req.description(), req.persona(), req.enabled());
    }

    @DeleteMapping("/assistants/{id}")
    public void deleteAssistant(@RequestParam String workspaceId, @PathVariable String id) {
        String userId = requireManageAi(workspaceId);
        assistants.delete(workspaceId, userId, id);
    }

    public record ChatRequest(String message, Boolean aiInContext) { }

    @PostMapping("/assistants/{id}/chat")
    public AiAssistantService.ChatReply chat(@RequestParam String workspaceId, @PathVariable String id,
                                             @Valid @RequestBody ChatRequest req) {
        String userId = requireMember(workspaceId);
        boolean inContext = req.aiInContext() == null || req.aiInContext();
        return assistants.chat(workspaceId, userId, id, req.message(), inContext);
    }

    // ── Multi-step agents ─────────────────────────────────────────────────────────────

    @GetMapping("/agents/runs")
    public List<AiAgentRun> listRuns(@RequestParam String workspaceId) {
        requireMember(workspaceId);
        return agents.listRuns(workspaceId);
    }

    @GetMapping("/agents/runs/{id}")
    public AiAgentService.RunView getRun(@RequestParam String workspaceId, @PathVariable String id) {
        requireMember(workspaceId);
        return agents.getRun(workspaceId, id);
    }

    public record AgentRunRequest(String goal) { }

    @PostMapping("/agents/run")
    public AiAgentService.RunView runAgent(@RequestParam String workspaceId, @Valid @RequestBody AgentRunRequest req) {
        String userId = requireMember(workspaceId);
        return agents.run(workspaceId, userId, req.goal());
    }

    // ── AI memory ───────────────────────────────────────────────────────────────────

    @GetMapping("/memory")
    public List<AiMemory> listMemory(@RequestParam String workspaceId) {
        String userId = requireMember(workspaceId);
        return memory.recall(workspaceId, userId);
    }

    public record MemoryRequest(String assistantId, String kind, String key, String value) { }

    @PostMapping("/memory")
    public AiMemory remember(@RequestParam String workspaceId, @Valid @RequestBody MemoryRequest req) {
        String userId = requireMember(workspaceId);
        return memory.remember(workspaceId, userId, req.assistantId(), req.kind(), req.key(), req.value());
    }

    @DeleteMapping("/memory/{id}")
    public void forget(@RequestParam String workspaceId, @PathVariable String id) {
        String userId = requireMember(workspaceId);
        memory.forget(workspaceId, userId, id);
    }

    // ── Conversational dashboards ─────────────────────────────────────────────────────

    @GetMapping("/conversational-dashboards")
    public List<ConversationalDashboard> listDashboards(@RequestParam String workspaceId) {
        requireMember(workspaceId);
        return dashboards.list(workspaceId);
    }

    public record CompileRequest(String prompt, Boolean aiInContext) { }

    @PostMapping("/conversational-dashboards/compile")
    public ConversationalDashboardService.CompiledSpec compile(@RequestParam String workspaceId,
                                                               @Valid @RequestBody CompileRequest req) {
        String userId = requireMember(workspaceId);
        boolean inContext = req.aiInContext() == null || req.aiInContext();
        return dashboards.compile(workspaceId, userId, req.prompt(), inContext);
    }

    public record SaveDashboardRequest(String title, String prompt) { }

    @PostMapping("/conversational-dashboards")
    public ConversationalDashboard saveDashboard(@RequestParam String workspaceId,
                                                 @Valid @RequestBody SaveDashboardRequest req) {
        String userId = requireMember(workspaceId);
        return dashboards.save(workspaceId, userId, req.title(), req.prompt());
    }

    @DeleteMapping("/conversational-dashboards/{id}")
    public void deleteDashboard(@RequestParam String workspaceId, @PathVariable String id) {
        String userId = requireMember(workspaceId);
        dashboards.delete(workspaceId, userId, id);
    }
}
