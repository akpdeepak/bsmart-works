package com.bcits.works.ai;

import com.bcits.works.knowledge.Article;
import com.bcits.works.knowledge.ArticleRepository;
import com.bcits.works.knowledge.KnowledgeSpace;
import com.bcits.works.knowledge.KnowledgeSpaceRepository;
import com.bcits.works.projects.ProjectRepository;
import com.bcits.works.workitems.WorkItem;
import com.bcits.works.workitems.WorkItemRepository;
import com.bcits.works.AiCapabilities;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AnswerEngineService {

    private final AiControlPlaneService controlPlane;
    private final ArticleRepository articles;
    private final KnowledgeSpaceRepository spaces;
    private final ProjectRepository projects;
    private final WorkItemRepository workItems;

    public AnswerEngineService(AiControlPlaneService controlPlane,
                               ArticleRepository articles,
                               KnowledgeSpaceRepository spaces,
                               ProjectRepository projects,
                               WorkItemRepository workItems) {
        this.controlPlane = controlPlane;
        this.articles = articles;
        this.spaces = spaces;
        this.projects = projects;
        this.workItems = workItems;
    }

    public record AnswerSource(String id, String title, String type) {}
    public record AnswerResponse(String answer, List<AnswerSource> sources, String confidence, AiAssistService.AiMeta meta) {}

    public AnswerResponse ask(String workspaceId, String userId, String question, boolean inContext) {
        // 1. Fetch cross-domain data
        List<Article> wsArticles = workspaceArticles(workspaceId);
        List<WorkItem> wsItems = scopedItems(workspaceId);

        // 2. Simplistic keyword matching for RAG
        List<AnswerSource> citations = new ArrayList<>();
        StringBuilder contextBuilder = new StringBuilder();

        // Articles RAG
        List<Article> rankedArticles = rankArticles(wsArticles, question, 3);
        for (Article a : rankedArticles) {
            citations.add(new AnswerSource(a.getId(), a.getTitle(), "article"));
            contextBuilder.append("Article [").append(a.getId()).append("]: ").append(snippet(a.getContent())).append("\n");
        }

        // WorkItems RAG
        List<WorkItem> rankedItems = rankItems(wsItems, question, 3);
        for (WorkItem w : rankedItems) {
            citations.add(new AnswerSource(w.getId(), w.getTitle(), "work_item"));
            contextBuilder.append("WorkItem [").append(w.getId()).append("]: ")
                .append(snippet(w.getDescription())).append(" (Status: ")
                .append(w.getStatus()).append(")\n");
        }

        String grounded = citations.isEmpty()
            ? "No relevant data found in workspace."
            : "Based on context:\n" + contextBuilder;

        AiControlPlaneService.AiOutcome out = controlPlane.invoke(new AiControlPlaneService.AiCall(
            workspaceId, userId, AiCapabilities.KB_RAG, "Answer Engine: " + question,
            grounded, null, inContext));

        String answer = out.fallback()
            ? (citations.isEmpty() ? "I don't have enough information to answer that." : "See related sources below.")
            : out.text();

        String confidence = out.fallback() ? "LOW" : (citations.isEmpty() ? "LOW" : "HIGH");

        return new AnswerResponse(answer, citations, confidence, AiAssistService.AiMeta.of(out));
    }

    private List<KnowledgeSpace> workspaceSpaces(String workspaceId) {
        return spaces.findByWorkspaceIdOrderByNameAsc(workspaceId);
    }

    private List<Article> workspaceArticles(String workspaceId) {
        return workspaceSpaces(workspaceId).stream()
            .flatMap(s -> articles.findBySpaceIdOrderByUpdatedAtDesc(s.getId()).stream())
            .collect(Collectors.toList());
    }

    private List<WorkItem> scopedItems(String workspaceId) {
        return projects.findByWorkspaceId(workspaceId).stream()
            .flatMap(p -> workItems.findByProjectId(p.getId()).stream())
            .collect(Collectors.toList());
    }

    private List<Article> rankArticles(List<Article> all, String query, int limit) {
        if (query == null || query.isBlank()) return List.of();
        String q = query.toLowerCase();
        return all.stream()
            .filter(a -> (a.getTitle() != null && a.getTitle().toLowerCase().contains(q)) ||
                         (a.getContent() != null && a.getContent().toLowerCase().contains(q)))
            .limit(limit)
            .collect(Collectors.toList());
    }

    private List<WorkItem> rankItems(List<WorkItem> all, String query, int limit) {
        if (query == null || query.isBlank()) return List.of();
        String q = query.toLowerCase();
        return all.stream()
            .filter(w -> (w.getTitle() != null && w.getTitle().toLowerCase().contains(q)) ||
                         (w.getDescription() != null && w.getDescription().toLowerCase().contains(q)) ||
                         (w.getStatus() != null && w.getStatus().toLowerCase().contains(q)))
            .limit(limit)
            .collect(Collectors.toList());
    }

    private String snippet(String text) {
        if (text == null) return "";
        return text.length() > 200 ? text.substring(0, 200) + "..." : text;
    }
}
