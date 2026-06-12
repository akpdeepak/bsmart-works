package com.bcits.works;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Resolves the per-type status configuration for a workspace, reusing the existing workflow engine
 * ({@code workflow} / {@code workflow_status}, V21) rather than a parallel store — one data model
 * (Orchestrator §0). On first read for a (workspace, type) with no workflow, the default template
 * from {@link StatusWorkflowDefaults} is materialised into real rows so the workspace can edit them
 * through the normal {@code /workflows/{id}/statuses} CRUD afterward.
 *
 * <p>Seeding is idempotent: a type is seeded only when it has no workflow at all in the workspace.
 */
@Service
public class StatusConfigService {

    private final WorkflowRepository workflowRepo;
    private final WorkflowStatusRepository statusRepo;

    public StatusConfigService(WorkflowRepository workflowRepo, WorkflowStatusRepository statusRepo) {
        this.workflowRepo = workflowRepo;
        this.statusRepo = statusRepo;
    }

    /** The status configuration for one work-item type: its workflow id and ordered statuses. */
    public record TypeStatusConfig(String typeKey, String workflowId, List<WorkflowStatus> statuses) {}

    /**
     * Returns the per-type status config for every built-in type in the workspace, seeding any type
     * that has no workflow yet. The result drives the Settings → Status Management editor and (later)
     * the per-type status pickers on the detail surface.
     */
    @Transactional
    public List<TypeStatusConfig> readGrouped(String workspaceId) {
        ensureSeeded(workspaceId);
        List<TypeStatusConfig> out = new ArrayList<>();
        for (String typeKey : StatusWorkflowDefaults.allTypeKeys()) {
            Workflow wf = primaryWorkflow(workspaceId, typeKey);
            if (wf == null) continue;
            out.add(new TypeStatusConfig(typeKey, wf.getId(),
                statusRepo.findByWorkflowIdOrderByPosition(wf.getId())));
        }
        return out;
    }

    /** Materialise default workflows for any built-in type that has none in this workspace. */
    @Transactional
    public void ensureSeeded(String workspaceId) {
        for (String typeKey : StatusWorkflowDefaults.allTypeKeys()) {
            if (!workflowRepo.findByWorkspaceIdAndItemType(workspaceId, typeKey).isEmpty()) continue;
            seedType(workspaceId, typeKey);
        }
    }

    private void seedType(String workspaceId, String typeKey) {
        List<StatusWorkflowDefaults.SeedStatus> seeds = StatusWorkflowDefaults.forType(typeKey);
        if (seeds.isEmpty()) return;

        Workflow wf = new Workflow();
        wf.setId("WF-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        wf.setWorkspaceId(workspaceId);
        wf.setName(typeKey + " statuses");
        wf.setItemType(typeKey);
        wf.setIsDefault(true);
        wf.setCreatedAt(OffsetDateTime.now());
        wf.setUpdatedAt(OffsetDateTime.now());
        workflowRepo.save(wf);

        int pos = 0;
        for (StatusWorkflowDefaults.SeedStatus s : seeds) {
            WorkflowStatus ws = new WorkflowStatus();
            ws.setId("WFS-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            ws.setWorkflowId(wf.getId());
            ws.setName(s.name());
            ws.setCategory(s.category());
            ws.setColor(s.color());
            ws.setPosition(pos++);
            ws.setIsInitial(s.initial());
            ws.setOutcome(s.outcome());
            ws.setWarnHours(s.warnHours() != null ? BigDecimal.valueOf(s.warnHours()) : null);
            ws.setBreachHours(s.breachHours() != null ? BigDecimal.valueOf(s.breachHours()) : null);
            statusRepo.save(ws);
        }
    }

    /** The workflow that owns a type's statuses — the default one if present, else the first found. */
    private Workflow primaryWorkflow(String workspaceId, String typeKey) {
        List<Workflow> matches = workflowRepo.findByWorkspaceIdAndItemType(workspaceId, typeKey);
        if (matches.isEmpty()) return null;
        return matches.stream().filter(w -> Boolean.TRUE.equals(w.getIsDefault()))
            .findFirst().orElse(matches.get(0));
    }
}
