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
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
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

    // Term-based ranked retrieval (RetrievalScorer): score every candidate by how many query terms it
    // contains (title weighted above body), keep only matches, and return the top {@code limit} by
    // descending score. This surfaces multi-term and partial matches that the former whole-query
    // substring filter missed, and orders results by relevance instead of arbitrary list position.
    private List<Article> rankArticles(List<Article> all, String query, int limit) {
        Set<String> terms = RetrievalScorer.tokenize(query);
        if (terms.isEmpty()) return List.of();
        return all.stream()
            .map(a -> Map.entry(a, RetrievalScorer.score(terms, a.getTitle(), a.getContent())))
            .filter(e -> e.getValue() > 0)
            .sorted(Comparator.<Map.Entry<Article, Integer>>comparingInt(Map.Entry::getValue).reversed())
            .limit(limit)
            .map(Map.Entry::getKey)
            .collect(Collectors.toList());
    }

    private List<WorkItem> rankItems(List<WorkItem> all, String query, int limit) {
        Set<String> terms = RetrievalScorer.tokenize(query);
        if (terms.isEmpty()) return List.of();
        return all.stream()
            .map(w -> Map.entry(w, RetrievalScorer.score(terms, w.getTitle(),
                    (w.getDescription() == null ? "" : w.getDescription()) + " " + (w.getStatus() == null ? "" : w.getStatus()))))
            .filter(e -> e.getValue() > 0)
            .sorted(Comparator.<Map.Entry<WorkItem, Integer>>comparingInt(Map.Entry::getValue).reversed())
            .limit(limit)
            .map(Map.Entry::getKey)
            .collect(Collectors.toList());
    }

    private String snippet(String text) {
        if (text == null) return "";
        return text.length() > 200 ? text.substring(0, 200) + "..." : text;
    }
}
