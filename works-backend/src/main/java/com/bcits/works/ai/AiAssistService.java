package com.bcits.works.ai;

import com.bcits.works.AiCapabilities;
import com.bcits.works.knowledge.Article;
import com.bcits.works.knowledge.ArticleRepository;
import com.bcits.works.knowledge.KnowledgeSpaceRepository;
import com.bcits.works.auth.User;
import com.bcits.works.auth.UserRepository;
import com.bcits.works.projects.Project;
import com.bcits.works.projects.ProjectRepository;
import com.bcits.works.workitems.WorkItem;
import com.bcits.works.workitems.WorkItemRepository;
import com.bcits.works.workspaces.Team;
import com.bcits.works.workspaces.TeamRepository;

import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

import static com.bcits.works.ai.AiHeuristics.bestTeam;
import static com.bcits.works.ai.AiHeuristics.biggestSwingIndex;
import static com.bcits.works.ai.AiHeuristics.blankScaffold;
import static com.bcits.works.ai.AiHeuristics.deterministicNlToBql;
import static com.bcits.works.ai.AiHeuristics.detectType;
import static com.bcits.works.ai.AiHeuristics.heuristicPriority;
import static com.bcits.works.ai.AiHeuristics.nv;
import static com.bcits.works.ai.AiHeuristics.parseSteps;
import static com.bcits.works.ai.AiHeuristics.rankArticles;
import static com.bcits.works.ai.AiHeuristics.rankSimilar;
import static com.bcits.works.ai.AiHeuristics.renderPlanSummary;
import static com.bcits.works.ai.AiHeuristics.renderTemplate;
import static com.bcits.works.ai.AiHeuristics.slaRisk;
import static com.bcits.works.ai.AiHeuristics.str;

/**
 * The iteration-11 AI capability engine (RB-40 §2). Every capability here gathers
 * <em>workspace-scoped</em> data (RB-40 §1), routes through {@link AiControlPlaneService#invoke}
 * (so scope / budget / cache / audit apply once, centrally), and ships a deterministic fallback —
 * the candidate it computes from real data — that is served verbatim when AI is off, over budget,
 * or unavailable. There is no live model in this build: the offline provider returns the candidate,
 * so AI-on and fallback differ in narrative richness and accounting, never in correctness.
 *
 * <p>The parsing/ranking/heuristic helpers are pure and live in {@link AiHeuristics} so they can be
 * unit-tested without a database (RB-10 §7), and they double as the deterministic fallback
 * implementations. This service owns only the stateful orchestration: data gathering, RBAC, tenant
 * scoping, event recording, and the control-plane round-trip.
 */
@Service
public class AiAssistService {

    private final AiControlPlaneService controlPlane;
    private final WorkItemRepository workItems;
    private final ProjectRepository projects;
    private final UserRepository users;
    private final ArticleRepository articles;
    private final KnowledgeSpaceRepository spaces;
    private final TeamRepository teams;
    private final AiCommandExecutionService commandExecution;
    private final AiSummarizationService summarization;

    public AiAssistService(AiControlPlaneService controlPlane, WorkItemRepository workItems,
                           ProjectRepository projects, UserRepository users, ArticleRepository articles,
                           KnowledgeSpaceRepository spaces, TeamRepository teams,
                           AiCommandExecutionService commandExecution,
                           AiSummarizationService summarization) {
        this.controlPlane = controlPlane;
        this.workItems = workItems;
        this.projects = projects;
        this.users = users;
        this.articles = articles;
        this.spaces = spaces;
        this.teams = teams;
        this.commandExecution = commandExecution;
        this.summarization = summarization;
    }

    // ── Shared result envelope ───────────────────────────────────────────────────
    // Every capability returns its structured payload plus the control-plane verdict, so the UI can
    // honestly show whether AI ran, fell back, was degraded to the cheap tier, or hit the cache.

    public record AiMeta(boolean usedAi, boolean fallback, String policyState, String tier, int costCents, boolean cacheHit) {
        public static AiMeta of(AiControlPlaneService.AiOutcome o) {
            return new AiMeta(o.usedAi(), o.fallback(), o.policyState(),
                o.tier() == null ? "NONE" : o.tier().name(), o.costCents(), o.cacheHit());
        }
    }

    // ── Cap P · Conversational command bar + multi-action plans ──────────────────

    public enum ActionType { CREATE_ITEM, ASSIGN, MOVE_STATUS, COMMENT, FIND, UNKNOWN }

    public record PlanStep(String action, String description, Map<String, Object> params, boolean editable) { }

    public record ActionPlan(String text, List<PlanStep> steps, AiMeta meta) { }

    /** Parse a natural-language (English / Hindi / Hinglish) command into an editable multi-action plan. */
    public ActionPlan parseCommand(String workspaceId, String userId, String text, boolean inContext) {
        List<PlanStep> steps = parseSteps(text == null ? "" : text);
        String draft = renderPlanSummary(steps);
        String prompt = "Parse command for workspace " + workspaceId + ": " + text;
        AiControlPlaneService.AiOutcome out = controlPlane.invoke(new AiControlPlaneService.AiCall(
            workspaceId, userId, AiCapabilities.COMMAND_BAR, prompt, draft, null, inContext));
        // The plan itself is deterministic and always returned (so the fallback = manual-form prefill
        // works); AI only contributes the natural-language confirmation summary.
        String summary = out.fallback() ? "Review and confirm each step (AI summary unavailable):" : draft;
        return new ActionPlan(summary, steps, AiMeta.of(out));
    }

    /** Execute a confirmed plan. Each mutating step is RBAC-gated in the service (RB-10 §2) and
     *  recorded as an event (RB-10 §3). Read-only FIND steps return matches. */
    public Map<String, Object> executePlan(String workspaceId, String userId, List<PlanStep> steps) {
        return commandExecution.executePlan(workspaceId, userId, steps);
    }

    // ── Cap O · Smart triage ─────────────────────────────────────────────────────

    public record TriageSuggestion(String priority, String type, String assigneeId, String assigneeName,
                                   List<Map<String, Object>> similar, AiMeta meta) { }

    public TriageSuggestion triage(String workspaceId, String userId, String title, String description,
                                   String projectId, boolean inContext) {
        String priority = heuristicPriority(title, description);
        String type = detectType((nv(title) + " " + nv(description)).toLowerCase(Locale.ROOT));
        List<WorkItem> scoped = scopedItems(workspaceId);
        List<WorkItem> similar = rankSimilar(scoped, nv(title) + " " + nv(description), 5);
        // Suggest the assignee who most recently handled similar items.
        String assigneeId = similar.stream().map(WorkItem::getAssigneeId)
            .filter(a -> a != null && !a.isBlank()).findFirst().orElse(null);
        String assigneeName = assigneeId == null ? null
            : users.findById(assigneeId).map(User::getFullName).orElse(null);
        List<Map<String, Object>> similarOut = similar.stream()
            .map(w -> Map.<String, Object>of("id", w.getId(), "title", nv(w.getTitle()), "status", nv(w.getStatus())))
            .collect(Collectors.toList());

        String draft = "Suggested priority " + priority + ", type " + type
            + (assigneeName != null ? ", assignee " + assigneeName : "") + ".";
        AiControlPlaneService.AiOutcome out = controlPlane.invoke(new AiControlPlaneService.AiCall(
            workspaceId, userId, AiCapabilities.TRIAGE, String.format("Triage: %s", title), draft, null, inContext));
        if (out.fallback()) {
            // Fallback: workspace defaults + keyword similar items, no assignee suggestion.
            return new TriageSuggestion("Medium", type, null, null, similarOut, AiMeta.of(out));
        }
        return new TriageSuggestion(priority, type, assigneeId, assigneeName, similarOut, AiMeta.of(out));
    }

    // ── Cap O/I · Generation (story / AC / test cases / comment / article / release notes) ──

    public record GeneratedDraft(String kind, String draft, AiMeta meta) { }

    public GeneratedDraft generate(String workspaceId, String userId, String kind, Map<String, Object> ctx,
                                   boolean inContext) {
        String k = kind == null ? "story" : kind.toLowerCase(Locale.ROOT);
        String topic = str(ctx == null ? null : ctx.getOrDefault("topic", ctx.get("title")));
        String full = renderTemplate(k, topic, ctx);
        AiControlPlaneService.AiOutcome out = controlPlane.invoke(new AiControlPlaneService.AiCall(
            workspaceId, userId, AiCapabilities.GENERATION, "Generate " + k + ": " + topic, full,
            k + ":" + topic, inContext));
        // Fallback for generation is the blank type scaffold (RB-40 §2 documented fallback).
        String draft = out.fallback() ? blankScaffold(k) : out.text();
        return new GeneratedDraft(k, draft, AiMeta.of(out));
    }

    public record ArtifactGenerationResult(List<Map<String, Object>> blocks, AiMeta meta) { }

    public ArtifactGenerationResult generateArtifact(String workspaceId, String userId, String prompt, boolean inContext) {
        // Seed / deterministic fallback content handed to the control plane. When AI is off, over
        // budget, or unavailable the outcome is a fallback and we return a structured scaffold; when
        // a model answers, we parse ITS text into editable blocks instead of discarding it (the prior
        // implementation always returned two hardcoded blocks and threw out.text() away).
        String seed = "Create a structured document for: " + nv(prompt)
                + "\nUse short markdown headings and paragraphs.";
        AiControlPlaneService.AiOutcome out = controlPlane.invoke(new AiControlPlaneService.AiCall(
            workspaceId, userId, AiCapabilities.GENERATION, "Generate canvas artifact for: " + prompt, seed, null, inContext));

        List<Map<String, Object>> blocks = out.fallback()
            ? scaffoldBlocks(prompt)
            : parseBlocks(out.text(), prompt);
        return new ArtifactGenerationResult(blocks, AiMeta.of(out));
    }

    private static Map<String, Object> block(String id, String type, String content, Map<String, Object> metadata) {
        Map<String, Object> b = new java.util.LinkedHashMap<>();
        b.put("id", id);
        b.put("type", type);
        b.put("content", content);
        b.put("metadata", metadata);
        return b;
    }

    private static String headingFrom(String prompt) {
        String p = nv(prompt).strip();
        if (p.isEmpty()) return "Untitled artifact";
        String firstLine = p.split("\\r?\\n", 2)[0].strip();
        return firstLine.length() > 120 ? firstLine.substring(0, 120) : firstLine;
    }

    /** Parse real model output into editable blocks: markdown-ish headings, bullets, and paragraphs. */
    private List<Map<String, Object>> parseBlocks(String text, String prompt) {
        List<Map<String, Object>> blocks = new ArrayList<>();
        blocks.add(block("b0", "heading", headingFrom(prompt), Map.of("level", 1)));
        if (text == null || text.isBlank()) {
            blocks.add(block("b1", "paragraph", "", Map.of()));
            return blocks;
        }
        int i = 1;
        for (String line : text.split("\\r?\\n")) {
            String t = line.strip();
            if (t.isEmpty()) continue;
            if (t.startsWith("### ")) {
                blocks.add(block("b" + i++, "heading", t.substring(4).strip(), Map.of("level", 3)));
            } else if (t.startsWith("## ")) {
                blocks.add(block("b" + i++, "heading", t.substring(3).strip(), Map.of("level", 2)));
            } else if (t.startsWith("# ")) {
                blocks.add(block("b" + i++, "heading", t.substring(2).strip(), Map.of("level", 2)));
            } else if (t.startsWith("- ") || t.startsWith("* ")) {
                blocks.add(block("b" + i++, "bullet", t.substring(2).strip(), Map.of()));
            } else {
                blocks.add(block("b" + i++, "paragraph", t, Map.of()));
            }
        }
        return blocks;
    }

    /** Deterministic fallback (RB-40 §2): a usable, editable outline scaffold seeded from the prompt. */
    private List<Map<String, Object>> scaffoldBlocks(String prompt) {
        List<Map<String, Object>> blocks = new ArrayList<>();
        blocks.add(block("b0", "heading", headingFrom(prompt), Map.of("level", 1)));
        blocks.add(block("b1", "paragraph",
            "Draft outline generated without AI. Fill in each section below.", Map.of()));
        blocks.add(block("b2", "heading", "Overview", Map.of("level", 2)));
        blocks.add(block("b3", "paragraph", "", Map.of()));
        blocks.add(block("b4", "heading", "Details", Map.of("level", 2)));
        blocks.add(block("b5", "paragraph", "", Map.of()));
        blocks.add(block("b6", "heading", "Next steps", Map.of("level", 2)));
        blocks.add(block("b7", "paragraph", "", Map.of()));
        return blocks;
    }


    // ── Cap O · Anomaly explanation ──────────────────────────────────────────────

    public record AnomalyExplanation(String explanation, double delta, int index, List<String> citations, AiMeta meta) { }

    public AnomalyExplanation explainAnomaly(String workspaceId, String userId, String metric,
                                             List<Double> series, boolean inContext) {
        int idx = biggestSwingIndex(series);
        double delta = idx <= 0 || series == null ? 0 : series.get(idx) - series.get(idx - 1);
        List<String> citations = recentItemIds(workspaceId, 3);
        String dir = delta < 0 ? "dropped" : "rose";
        String draft = idx < 0
            ? String.format("No significant anomaly detected in %s.", nv(metric))
            : String.format("%s %s by %d at point %d. Likely linked to recent activity on %s.",
                nv(metric), dir, Math.abs(Math.round(delta)), idx, String.join(", ", citations));
        AiControlPlaneService.AiOutcome out = controlPlane.invoke(new AiControlPlaneService.AiCall(
            workspaceId, userId, AiCapabilities.ANOMALY, String.format("Explain anomaly in %s", metric), draft, null, inContext));
        String explanation = out.fallback()
            ? String.format("%s changed by %d at point %d (no AI narrative).", nv(metric), Math.round(delta), idx)
            : out.text();
        return new AnomalyExplanation(explanation, delta, idx, citations, AiMeta.of(out));
    }

    // ── Cap K · AI-suggested compliance rules ────────────────────────────────────

    public record TodayNudge(String text, String workItemId, String title) { }
    public record TodayNudgesResult(String summary, List<TodayNudge> nudges,
                                    boolean fallback, AiMeta meta) { }

    public TodayNudgesResult todayNudges(String workspaceId, String callerId, boolean inContext) {
        LocalDate today = LocalDate.now();
        List<WorkItem> assigned = scopedItems(workspaceId).stream()
            .filter(w -> callerId.equals(w.getAssigneeId()))
            .filter(AiAssistService::isOpenItem)
            .sorted(Comparator
                .comparing((WorkItem w) -> w.getDueDate() == null ? LocalDate.MAX : w.getDueDate())
                .thenComparingInt(w -> priorityRank(w.getPriority()))
                .thenComparing(w -> nv(w.getId())))
            .toList();

        List<TodayNudge> nudges = new ArrayList<>();
        assigned.stream()
            .filter(w -> w.getDueDate() != null && !w.getDueDate().isAfter(today))
            .limit(2)
            .map(w -> new TodayNudge("Focus on " + w.getId() + " - due " +
                (w.getDueDate().isBefore(today) ? "overdue" : "today") + ": " + nv(w.getTitle()),
                w.getId(), nv(w.getTitle())))
            .forEach(nudges::add);

        assigned.stream()
            .filter(w -> nudges.stream().noneMatch(n -> w.getId().equals(n.workItemId())))
            .filter(w -> priorityRank(w.getPriority()) <= 1)
            .limit(Math.max(0, 3 - nudges.size()))
            .map(w -> new TodayNudge("Pull forward " + w.getId() + " - " + nv(w.getPriority()) +
                " priority and still open: " + nv(w.getTitle()), w.getId(), nv(w.getTitle())))
            .forEach(nudges::add);

        if (nudges.isEmpty() && !assigned.isEmpty()) {
            WorkItem next = assigned.get(0);
            nudges.add(new TodayNudge("Start with " + next.getId() + " - next assigned open item: "
                + nv(next.getTitle()), next.getId(), nv(next.getTitle())));
        }

        String draft = nudges.isEmpty()
            ? "No proactive Today nudges; assigned work is clear."
            : nudges.stream().map(TodayNudge::text).collect(Collectors.joining(" "));
        AiControlPlaneService.AiOutcome out = controlPlane.invoke(new AiControlPlaneService.AiCall(
            workspaceId, callerId, AiCapabilities.COCKPIT_PROTIPS, "Generate Today focus nudges", draft, null, inContext));
        String summary = out.fallback() || out.text() == null || out.text().isBlank() ? draft : out.text();
        return new TodayNudgesResult(summary, nudges, out.fallback(), AiMeta.of(out));
    }

    public record RuleSuggestion(String name, String scopeBql, String assertionBql, String rationale) { }

    public Map<String, Object> suggestComplianceRules(String workspaceId, String userId, boolean inContext) {
        List<WorkItem> scoped = scopedItems(workspaceId);
        List<RuleSuggestion> suggestions = new ArrayList<>();
        long noDesc = scoped.stream().filter(w -> w.getDescription() == null || w.getDescription().isBlank()).count();
        if (noDesc > 0) {
            suggestions.add(new RuleSuggestion("Items must have a description",
                "", "description != null AND description != \"\"",
                noDesc + " items currently have no description."));
        }
        long highNoAssignee = scoped.stream()
            .filter(w -> "High".equalsIgnoreCase(nv(w.getPriority())) || "Critical".equalsIgnoreCase(nv(w.getPriority())))
            .filter(w -> w.getAssigneeId() == null).count();
        if (highNoAssignee > 0) {
            suggestions.add(new RuleSuggestion("High-priority items must be assigned",
                "priority = \"High\"", "assigneeId != null",
                highNoAssignee + " high/critical items are unassigned."));
        }
        suggestions.add(new RuleSuggestion("Done items must have story points",
            "status = \"Done\"", "storyPoints != null",
            "Closing without estimates hurts velocity accuracy."));
        String draft = suggestions.size() + " rule suggestions based on current workspace patterns.";
        AiControlPlaneService.AiOutcome out = controlPlane.invoke(new AiControlPlaneService.AiCall(
            workspaceId, userId, AiCapabilities.COMPLIANCE_SUGGEST, "Suggest compliance rules", draft, null, inContext));
        return Map.of("suggestions", suggestions, "meta", AiMeta.of(out));
    }

    // ── Cap M · SLA breach prediction ─────────────────────────────────────────────

    public record SlaPrediction(String workItemId, String title, String risk, long ageHours, String reason) { }

    public Map<String, Object> predictSla(String workspaceId, String userId, String projectId, boolean inContext) {
        List<WorkItem> scoped = (projectId != null ? workItems.findByProjectId(projectId) : scopedItems(workspaceId));
        OffsetDateTime now = OffsetDateTime.now();
        List<SlaPrediction> preds = scoped.stream()
            .filter(w -> !"Done".equalsIgnoreCase(nv(w.getStatus())))
            .map(w -> {
                long age = w.getCreatedAt() == null ? 0 : java.time.Duration.between(w.getCreatedAt(), now).toHours();
                String risk = slaRisk(nv(w.getPriority()), age);
                return new SlaPrediction(w.getId(), nv(w.getTitle()), risk, age,
                    "Open " + age + "h at priority " + nv(w.getPriority()) + ".");
            })
            .filter(p -> !"LOW".equals(p.risk()))
            .sorted(Comparator.comparing(SlaPrediction::risk))
            .limit(25)
            .collect(Collectors.toList());
        String draft = preds.size() + " items at risk of SLA breach.";
        AiControlPlaneService.AiOutcome out = controlPlane.invoke(new AiControlPlaneService.AiCall(
            workspaceId, userId, AiCapabilities.SLA_PREDICTION, "Predict SLA breaches", draft, null, inContext));
        return Map.of("predictions", preds, "meta", AiMeta.of(out));
    }

    // ── Cap I · RAG over the knowledge base + Cap N · article suggestion ──────────


    public Map<String, Object> kbSuggest(String workspaceId, String userId, String text, boolean inContext) {
        List<Article> ranked = rankArticles(workspaceArticles(workspaceId), nv(text), 3);
        List<Map<String, Object>> hits = ranked.stream()
            .map(a -> Map.<String, Object>of("id", a.getId(), "title", nv(a.getTitle())))
            .collect(Collectors.toList());
        AiControlPlaneService.AiOutcome out = controlPlane.invoke(new AiControlPlaneService.AiCall(
            workspaceId, userId, AiCapabilities.KB_SUGGEST, "Suggest articles for: " + text,
            hits.size() + " suggestions", null, inContext));
        return Map.of("articles", hits, "meta", AiMeta.of(out));
    }

    // ── Cap O iter-10 · Natural language → BQL (iteration 10, first AI surface) ──

    public record NlToBqlResult(String bql, boolean valid, String confidence, AiMeta meta) { }

    /**
     * Translates a natural-language query into a BQL expression.
     * Deterministic fallback: keyword → BQL clause mapping; AI enriches with a more
     * precise parse and a confidence label.
     */
    public NlToBqlResult nlToBql(String workspaceId, String userId, String text, boolean inContext) {
        String bql = deterministicNlToBql(text == null ? "" : text);
        AiControlPlaneService.AiOutcome out = controlPlane.invoke(new AiControlPlaneService.AiCall(
            workspaceId, userId, AiCapabilities.NL_TO_BQL, "Translate to BQL: " + text, bql, null, inContext));
        String finalBql = out.fallback() ? bql : (out.text() != null && !out.text().isBlank() ? out.text() : bql);
        String confidence = out.fallback() ? "KEYWORD_MATCH" : "AI";
        return new NlToBqlResult(finalBql, !finalBql.isBlank(), confidence, AiMeta.of(out));
    }

    // ── Cap O iter-10 · Summarization (iteration 10, second AI surface) ───────────

    public record SummarizeResult(String kind, String summary, AiMeta meta) { }

    /**
     * Summarizes a content entity. {@code kind} is one of {@code comments}, {@code sprint},
     * or {@code dashboard}; {@code subjectId} is the work-item id for comments or project id for
     * sprints. Deterministic fallback is a structured extract (not a narrative).
     */
    public SummarizeResult summarize(String workspaceId, String userId, String kind, String subjectId,
                                     boolean inContext) {
        return summarization.summarize(workspaceId, userId, kind, subjectId, inContext);
    }

    // ── Cap N · Smart request routing ─────────────────────────────────────────────

    public Map<String, Object> route(String workspaceId, String userId, String text, boolean inContext) {
        List<Team> wsTeams = teams.findByWorkspaceIdOrderByNameAsc(workspaceId);
        Team best = bestTeam(wsTeams, nv(text));
        String draft = best == null ? "No team matched; route to default queue."
            : "Route to team " + best.getName() + ".";
        AiControlPlaneService.AiOutcome out = controlPlane.invoke(new AiControlPlaneService.AiCall(
            workspaceId, userId, AiCapabilities.ROUTING, "Route request: " + text, draft, null, inContext));
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("teamId", best == null ? null : best.getId());
        result.put("teamName", best == null ? null : best.getName());
        result.put("reason", out.fallback() ? "Default routing (AI off)." : draft);
        result.put("candidates", wsTeams.stream().map(t -> Map.of("id", t.getId(), "name", t.getName())).toList());
        result.put("meta", AiMeta.of(out));
        return result;
    }

    // ── small utilities (stateful — need the repositories / tenant scoping) ──────

    private List<WorkItem> scopedItems(String workspaceId) {
        return projects.findByWorkspaceId(workspaceId).stream()
            .flatMap(p -> workItems.findByProjectId(p.getId()).stream())
            .collect(Collectors.toList());
    }

    private List<Article> workspaceArticles(String workspaceId) {
        return spaces.findByWorkspaceIdOrderByNameAsc(workspaceId).stream()
            .flatMap(s -> articles.findBySpaceIdOrderByUpdatedAtDesc(s.getId()).stream())
            .collect(Collectors.toList());
    }

    private String firstProjectId(String workspaceId) {
        return projects.findByWorkspaceId(workspaceId).stream().findFirst().map(Project::getId).orElse(null);
    }

    private List<String> recentItemIds(String workspaceId, int limit) {
        return scopedItems(workspaceId).stream().limit(limit).map(WorkItem::getId).collect(Collectors.toList());
    }

    private static boolean isOpenItem(WorkItem w) {
        return w.getDeletedAt() == null && !"Done".equalsIgnoreCase(nv(w.getStatus()));
    }

    private static int priorityRank(String priority) {
        return switch (nv(priority).toUpperCase(Locale.ROOT)) {
            case "CRITICAL" -> 0;
            case "HIGH" -> 1;
            case "MEDIUM" -> 2;
            case "LOW" -> 3;
            default -> 4;
        };
    }

}
