package com.bcits.works;
import com.bcits.works.workitems.WorkItem;
import com.bcits.works.workitems.WorkItemRepository;
import com.bcits.works.projects.Project;
import com.bcits.works.projects.ProjectRepository;

import org.springframework.stereotype.Service;

import java.util.List;

import static com.bcits.works.AiHeuristics.nv;
import static com.bcits.works.AiHeuristics.snippet;

@Service
public class AiSummarizationService {

    private final AiControlPlaneService controlPlane;
    private final WorkItemRepository workItems;
    private final ProjectRepository projects;
    private final CommentRepository comments;

    public AiSummarizationService(AiControlPlaneService controlPlane, WorkItemRepository workItems,
                                  ProjectRepository projects, CommentRepository comments) {
        this.controlPlane = controlPlane;
        this.workItems = workItems;
        this.projects = projects;
        this.comments = comments;
    }

    public AiAssistService.SummarizeResult summarize(String workspaceId, String userId, String kind,
                                                     String subjectId, boolean inContext) {
        String k = kind == null ? "comments" : kind.toLowerCase(java.util.Locale.ROOT);
        String draft = buildSummarizationDraft(workspaceId, k, subjectId);
        AiControlPlaneService.AiOutcome out = controlPlane.invoke(new AiControlPlaneService.AiCall(
            workspaceId, userId, AiCapabilities.SUMMARIZATION,
            "Summarize " + k + (subjectId != null ? " for " + subjectId : ""), draft, null, inContext));
        String summary = out.fallback() ? draft : (out.text() != null && !out.text().isBlank() ? out.text() : draft);
        return new AiAssistService.SummarizeResult(k, summary, AiAssistService.AiMeta.of(out));
    }

    private String buildSummarizationDraft(String workspaceId, String kind, String subjectId) {
        return switch (kind) {
            case "comments" -> commentsDraft(subjectId);
            case "sprint" -> sprintDraft(workspaceId, subjectId);
            default -> dashboardDraft(workspaceId);
        };
    }

    private String commentsDraft(String subjectId) {
        if (subjectId == null) {
            return "No subject specified.";
        }
        List<Comment> threadComments = comments.findByWorkItemIdOrderByCreatedAtAsc(subjectId);
        if (threadComments.isEmpty()) {
            return "No comments yet.";
        }
        Comment last = threadComments.get(threadComments.size() - 1);
        return threadComments.size() + " comment(s). Most recent: " + snippet(last.getBody());
    }

    private String sprintDraft(String workspaceId, String subjectId) {
        String projId = subjectId != null ? subjectId : firstProjectId(workspaceId);
        if (projId == null) {
            return "No project found.";
        }
        List<WorkItem> items = workItems.findByProjectId(projId);
        long done = items.stream().filter(w -> "Done".equalsIgnoreCase(nv(w.getStatus()))).count();
        long total = items.size();
        return total + " item(s) in project - " + done + " done ("
            + (total == 0 ? 0 : Math.round(done * 100.0 / total)) + "% complete).";
    }

    private String dashboardDraft(String workspaceId) {
        List<WorkItem> allItems = scopedItems(workspaceId);
        long open = allItems.stream().filter(w -> !"Done".equalsIgnoreCase(nv(w.getStatus()))).count();
        long doneCount = allItems.size() - open;
        return allItems.size() + " item(s) workspace-wide - " + doneCount + " done, " + open + " open.";
    }

    private List<WorkItem> scopedItems(String workspaceId) {
        return projects.findByWorkspaceId(workspaceId).stream()
            .flatMap(p -> workItems.findByProjectId(p.getId()).stream())
            .toList();
    }

    private String firstProjectId(String workspaceId) {
        return projects.findByWorkspaceId(workspaceId).stream().findFirst().map(Project::getId).orElse(null);
    }
}
