package com.bcits.works;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * The iteration-11 AI capability engine (RB-40 §2). Every capability here gathers
 * <em>workspace-scoped</em> data (RB-40 §1), routes through {@link AiControlPlaneService#invoke}
 * (so scope / budget / cache / audit apply once, centrally), and ships a deterministic fallback —
 * the candidate it computes from real data — that is served verbatim when AI is off, over budget,
 * or unavailable. There is no live model in this build: the offline provider returns the candidate,
 * so AI-on and fallback differ in narrative richness and accounting, never in correctness.
 *
 * <p>The parsing/ranking/heuristic helpers are pure and static so they can be unit-tested without a
 * database (RB-10 §7), and they double as the deterministic fallback implementations.
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
    private final CommentRepository comments;
    private final EventService events;
    private final RbacService rbac;

    public AiAssistService(AiControlPlaneService controlPlane, WorkItemRepository workItems,
                           ProjectRepository projects, UserRepository users, ArticleRepository articles,
                           KnowledgeSpaceRepository spaces, TeamRepository teams, CommentRepository comments,
                           EventService events, RbacService rbac) {
        this.controlPlane = controlPlane;
        this.workItems = workItems;
        this.projects = projects;
        this.users = users;
        this.articles = articles;
        this.spaces = spaces;
        this.teams = teams;
        this.comments = comments;
        this.events = events;
        this.rbac = rbac;
    }

    // ── Shared result envelope ───────────────────────────────────────────────────
    // Every capability returns its structured payload plus the control-plane verdict, so the UI can
    // honestly show whether AI ran, fell back, was degraded to the cheap tier, or hit the cache.

    public record AiMeta(boolean usedAi, boolean fallback, String policyState, String tier, int costCents, boolean cacheHit) {
        static AiMeta of(AiControlPlaneService.AiOutcome o) {
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

    /** Split a command on conjunctions and parse each clause into a {@link PlanStep}. Pure + static. */
    static List<PlanStep> parseSteps(String text) {
        List<PlanStep> steps = new ArrayList<>();
        for (String clause : splitClauses(text)) {
            String c = clause.trim();
            if (c.isEmpty()) {
                continue;
            }
            steps.add(parseClause(c));
        }
        if (steps.isEmpty()) {
            steps.add(new PlanStep(ActionType.UNKNOWN.name(),
                "Could not interpret the command — try the manual builder.", Map.of(), true));
        }
        return steps;
    }

    static List<String> splitClauses(String text) {
        if (text == null) {
            return List.of();
        }
        // Split on commas, " and ", " then ", " aur " (Hindi 'and'), " phir " (Hindi 'then').
        String[] parts = text.split("(?i),|\\band\\b|\\bthen\\b|\\baur\\b|\\bphir\\b");
        return Arrays.stream(parts).map(String::trim).filter(s -> !s.isEmpty()).collect(Collectors.toList());
    }

    private static final Pattern ITEM_REF = Pattern.compile("\\b([A-Z][A-Z0-9]*-\\d+)\\b");
    private static final Pattern EMAIL = Pattern.compile("[\\w.+-]+@[\\w-]+\\.[\\w.-]+");

    private static final java.util.Set<String> FIND_VERBS =
        java.util.Set.of("find", "search", "show", "list", "dhundo", "dikhao", "dikhaao", "खोजो");

    static PlanStep parseClause(String clause) {
        String lower = clause.toLowerCase(Locale.ROOT);
        Map<String, Object> params = new LinkedHashMap<>();
        Matcher ref = ITEM_REF.matcher(clause);
        String itemRef = ref.find() ? ref.group(1) : null;
        Matcher em = EMAIL.matcher(clause);
        if (em.find()) {
            params.put("email", em.group());
        }
        String firstWord = lower.isBlank() ? "" : lower.trim().split("\\s+")[0];

        // COMMENT first — "add comment …" must not be read as a create ("add").
        if (containsAny(lower, "comment", "tippani", "टिप्पणी")) {
            if (itemRef != null) {
                params.put("workItemId", itemRef);
            }
            String body = afterKeyword(clause, "comment", "tippani", "टिप्पणी");
            params.put("body", body != null ? body : clause);
            return new PlanStep(ActionType.COMMENT.name(),
                "Comment on " + (itemRef != null ? itemRef : "item"), params, true);
        }
        // A leading find verb is a query — even if the text later mentions "assigned to me".
        if (FIND_VERBS.contains(firstWord)) {
            params.put("query", stripCreateVerb(clause));
            return new PlanStep(ActionType.FIND.name(), String.format("Find items matching: %s", params.get("query")), params, true);
        }
        // ASSIGN: "assign", "assign karo", "को असाइन", "ko ... assign"
        if (containsAny(lower, "assign", "assign karo", "asaain", "असाइन", "सौंप")) {
            if (itemRef != null) {
                params.put("workItemId", itemRef);
            }
            String assignee = afterKeyword(clause, "to", "ko", "को");
            if (assignee != null) {
                params.put("assigneeName", assignee);
            }
            return new PlanStep(ActionType.ASSIGN.name(),
                "Assign " + (itemRef != null ? itemRef : "item") + " to " + nv(params.get("assigneeName")), params, true);
        }
        // MOVE / STATUS: "move", "set status", "transition", "me daal", "में डालो", "move karo"
        if (containsAny(lower, "move", "transition", "set status", "status", "me daal", "में डालो", "move karo")) {
            if (itemRef != null) {
                params.put("workItemId", itemRef);
            }
            String status = detectStatus(lower);
            if (status != null) {
                params.put("status", status);
            }
            return new PlanStep(ActionType.MOVE_STATUS.name(),
                "Move " + (itemRef != null ? itemRef : "item") + " to " + nv(params.get("status")), params, true);
        }
        // CREATE: "create", "add", "new", "banao", "बनाओ", "नया"
        if (containsAny(lower, "create", "add", "new ", "banao", "bana ", "banaye", "बनाओ", "नया")) {
            params.put("type", detectType(lower));
            params.put("priority", heuristicPriority(clause, ""));
            params.put("title", stripCreateVerb(clause));
            return new PlanStep(ActionType.CREATE_ITEM.name(),
                String.format("Create %s: %s", params.get("type"), params.get("title")), params, true);
        }
        // FIND / SEARCH: "find", "search", "show", "list", "dhundo", "खोजो", "dikhao"
        if (containsAny(lower, "find", "search", "show", "list", "dhundo", "खोजो", "dikhao", "dikhaao")) {
            params.put("query", stripCreateVerb(clause));
            return new PlanStep(ActionType.FIND.name(), String.format("Find items matching: %s", params.get("query")), params, true);
        }
        return new PlanStep(ActionType.UNKNOWN.name(), "Unrecognised: " + clause, params, true);
    }

    static String renderPlanSummary(List<PlanStep> steps) {
        StringBuilder sb = new StringBuilder("Here's what I'll do:\n");
        int i = 1;
        for (PlanStep s : steps) {
            sb.append(i++).append(". ").append(s.description()).append('\n');
        }
        return sb.toString().trim();
    }

    /** Execute a confirmed plan. Each mutating step is RBAC-gated in the service (RB-10 §2) and
     *  recorded as an event (RB-10 §3). Read-only FIND steps return matches. */
    @Transactional
    public Map<String, Object> executePlan(String workspaceId, String userId, List<PlanStep> steps) {
        List<Map<String, Object>> results = new ArrayList<>();
        for (PlanStep step : steps) {
            results.add(executeStep(workspaceId, userId, step));
        }
        return Map.of("executed", results.size(), "results", results);
    }

    private Map<String, Object> executeStep(String workspaceId, String userId, PlanStep step) {
        ActionType type;
        try {
            type = ActionType.valueOf(step.action());
        } catch (Exception e) {
            type = ActionType.UNKNOWN;
        }
        Map<String, Object> params = step.params() == null ? Map.of() : step.params();
        switch (type) {
            case CREATE_ITEM -> {
                rbac.require(userId, workspaceId, "create_items");
                String projectId = firstProjectId(workspaceId);
                WorkItem w = new WorkItem();
                String prefix = projectId != null ? projectId.replace("PROJ-", "") : "WEB";
                w.setId(prefix + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase());
                w.setTitle(str(params.get("title")));
                w.setType(str(params.getOrDefault("type", "Task")));
                w.setPriority(str(params.getOrDefault("priority", "Medium")));
                w.setStatus("Todo");
                w.setProjectId(projectId != null ? projectId : "PROJ-001");
                w.setCreatedBy(userId);
                w.setCreatedAt(OffsetDateTime.now());
                WorkItem saved = workItems.save(w);
                events.record(saved.getId(), "WORK_ITEM_CREATED", userId,
                    Map.of("title", nv(saved.getTitle()), "via", "ai_command_bar"));
                return Map.of("action", type.name(), "ok", true, "id", saved.getId());
            }
            case ASSIGN -> {
                String id = str(params.get("workItemId"));
                WorkItem w = workItems.findById(id).orElse(null);
                if (w == null) {
                    return Map.of("action", type.name(), "ok", false, "error", String.format("Item not found: %s", id));
                }
                String wsId = rbac.workspaceForProject(w.getProjectId());
                requireSameWorkspace(workspaceId, wsId);
                rbac.require(userId, workspaceId, "edit_any_item");
                String assigneeId = resolveUser(str(params.get("assigneeName")), str(params.get("email")), workspaceId);
                w.setAssigneeId(assigneeId);
                workItems.save(w);
                events.recordDiff(id, "ASSIGNED", userId, "assignee", null, assigneeId);
                return Map.of("action", type.name(), "ok", true, "id", id, "assigneeId", nv(assigneeId));
            }
            case MOVE_STATUS -> {
                String id = str(params.get("workItemId"));
                WorkItem w = workItems.findById(id).orElse(null);
                if (w == null) {
                    return Map.of("action", type.name(), "ok", false, "error", String.format("Item not found: %s", id));
                }
                String wsId = rbac.workspaceForProject(w.getProjectId());
                requireSameWorkspace(workspaceId, wsId);
                rbac.require(userId, workspaceId, "edit_any_item");
                String old = w.getStatus();
                w.setStatus(str(params.getOrDefault("status", w.getStatus())));
                workItems.save(w);
                events.recordDiff(id, "STATUS_CHANGED", userId, "status", old, w.getStatus());
                return Map.of("action", type.name(), "ok", true, "id", id, "status", nv(w.getStatus()));
            }
            case COMMENT -> {
                String id = str(params.get("workItemId"));
                WorkItem w = workItems.findById(id).orElse(null);
                if (w == null) {
                    return Map.of("action", type.name(), "ok", false, "error", String.format("Item not found: %s", id));
                }
                String wsId = rbac.workspaceForProject(w.getProjectId());
                requireSameWorkspace(workspaceId, wsId);
                rbac.require(userId, workspaceId, "view_items");
                Comment c = new Comment();
                c.setWorkItemId(id);
                c.setAuthorId(userId);
                c.setBody(str(params.get("body")));
                c.setCreatedAt(OffsetDateTime.now());
                Comment saved = comments.save(c);
                events.record(id, "COMMENT_ADDED", userId, Map.of("via", "ai_command_bar"));
                return Map.of("action", type.name(), "ok", true, "id", id, "commentId", saved.getId());
            }
            case FIND -> {
                rbac.require(userId, workspaceId, "view_items");
                String q = str(params.get("query"));
                List<Map<String, Object>> hits = scopedItems(workspaceId).stream()
                    .filter(w -> matches(w, q))
                    .limit(20)
                    .map(w -> Map.<String, Object>of("id", w.getId(), "title", nv(w.getTitle()),
                        "status", nv(w.getStatus())))
                    .collect(Collectors.toList());
                return Map.of("action", type.name(), "ok", true, "matches", hits);
            }
            default -> {
                return Map.of("action", "UNKNOWN", "ok", false, "error", "Unsupported step");
            }
        }
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

    public record KbAnswer(String answer, List<Map<String, Object>> citations, AiMeta meta) { }

    public KbAnswer kbAsk(String workspaceId, String userId, String question, boolean inContext) {
        List<Article> ranked = rankArticles(workspaceArticles(workspaceId), nv(question), 3);
        List<Map<String, Object>> citations = ranked.stream()
            .map(a -> Map.<String, Object>of("id", a.getId(), "title", nv(a.getTitle())))
            .collect(Collectors.toList());
        String grounded = ranked.isEmpty()
            ? "No knowledge-base article addresses that yet."
            : "Based on " + ranked.size() + " article(s): " + snippet(ranked.get(0).getContent());
        AiControlPlaneService.AiOutcome out = controlPlane.invoke(new AiControlPlaneService.AiCall(
            workspaceId, userId, AiCapabilities.KB_RAG, "KB question: " + question, grounded, null, inContext));
        // Fallback: ranked search results without a synthesised answer.
        String answer = out.fallback()
            ? (ranked.isEmpty() ? "No matching articles." : "See related articles below.")
            : out.text();
        return new KbAnswer(answer, citations, AiMeta.of(out));
    }

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

    /** Deterministic keyword-to-BQL translator — also the tested fallback. */
    static String deterministicNlToBql(String text) {
        String lower = text.toLowerCase(Locale.ROOT);
        List<String> clauses = new ArrayList<>();
        // Status
        String status = detectStatus(lower);
        if (status != null) {
            clauses.add("status = \"" + status + "\"");
        }
        // Priority
        String priority = containsAny(lower, "critical", "urgent") ? "Critical"
            : containsAny(lower, "high") ? "High"
            : containsAny(lower, "low") ? "Low"
            : containsAny(lower, "medium") ? "Medium" : null;
        if (priority != null) {
            clauses.add("priority = \"" + priority + "\"");
        }
        // Type
        String type = detectType(lower);
        if (!"Task".equals(type) || containsAny(lower, "task")) {
            clauses.add("type = \"" + type + "\"");
        }
        // Assignee
        if (containsAny(lower, "assigned to me", "my items", "mine")) {
            clauses.add("assigneeId = @me");
        } else if (containsAny(lower, "unassigned")) {
            clauses.add("assigneeId = null");
        }
        // Time windows
        if (containsAny(lower, "last week", "this week")) {
            clauses.add("createdAt > @startOfWeek");
        } else if (containsAny(lower, "today")) {
            clauses.add("createdAt > @today");
        } else if (containsAny(lower, "overdue")) {
            clauses.add("dueDate < @today AND status != \"Done\"");
        }
        return String.join(" AND ", clauses);
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
        String k = kind == null ? "comments" : kind.toLowerCase(Locale.ROOT);
        String draft = buildSummarizationDraft(workspaceId, k, subjectId);
        AiControlPlaneService.AiOutcome out = controlPlane.invoke(new AiControlPlaneService.AiCall(
            workspaceId, userId, AiCapabilities.SUMMARIZATION,
            "Summarize " + k + (subjectId != null ? " for " + subjectId : ""), draft, null, inContext));
        String summary = out.fallback() ? draft : (out.text() != null && !out.text().isBlank() ? out.text() : draft);
        return new SummarizeResult(k, summary, AiMeta.of(out));
    }

    private String buildSummarizationDraft(String workspaceId, String kind, String subjectId) {
        return switch (kind) {
            case "comments" -> {
                if (subjectId == null) {
                    yield "No subject specified.";
                }
                List<Comment> threadComments = comments.findByWorkItemIdOrderByCreatedAtAsc(subjectId);
                if (threadComments.isEmpty()) {
                    yield "No comments yet.";
                }
                Comment last = threadComments.get(threadComments.size() - 1);
                yield threadComments.size() + " comment(s). Most recent: " + snippet(last.getBody());
            }
            case "sprint" -> {
                String projId = subjectId != null ? subjectId : firstProjectId(workspaceId);
                if (projId == null) {
                    yield "No project found.";
                }
                List<WorkItem> items = workItems.findByProjectId(projId);
                long done = items.stream().filter(w -> "Done".equalsIgnoreCase(nv(w.getStatus()))).count();
                long total = items.size();
                yield total + " item(s) in project — " + done + " done (" +
                    (total == 0 ? 0 : Math.round(done * 100.0 / total)) + "% complete).";
            }
            default -> { // dashboard
                List<WorkItem> allItems = scopedItems(workspaceId);
                long open = allItems.stream().filter(w -> !"Done".equalsIgnoreCase(nv(w.getStatus()))).count();
                long doneCount = allItems.size() - open;
                yield allItems.size() + " item(s) workspace-wide — " + doneCount + " done, " + open + " open.";
            }
        };
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

    // ══════════════════════════════════════════════════════════════════════════════
    //  Pure deterministic helpers — unit-testable in isolation, double as fallbacks
    // ══════════════════════════════════════════════════════════════════════════════

    static final List<String> STOPWORDS = List.of("the", "a", "an", "to", "of", "in", "on", "for", "and", "is", "with");

    /** Heuristic priority from severity keywords in the title/description. */
    static String heuristicPriority(String title, String description) {
        String t = (nv(title) + " " + nv(description)).toLowerCase(Locale.ROOT);
        if (containsAny(t, "crash", "outage", "data loss", "security", "p0", "critical", "urgent", "down")) {
            return "Critical";
        }
        if (containsAny(t, "bug", "error", "fail", "broken", "p1", "high", "blocker")) {
            return "High";
        }
        if (containsAny(t, "minor", "typo", "cosmetic", "nice to have", "p3", "low")) {
            return "Low";
        }
        return "Medium";
    }

    static String detectType(String lower) {
        if (containsAny(lower, "bug", "defect", "error", "crash")) {
            return "Bug";
        }
        if (containsAny(lower, "story", "feature", "as a user")) {
            return "Story";
        }
        if (containsAny(lower, "epic")) {
            return "Epic";
        }
        if (containsAny(lower, "incident", "outage")) {
            return "Incident";
        }
        return "Task";
    }

    static String detectStatus(String lower) {
        if (containsAny(lower, "in progress", "progress", "doing", "start")) {
            return "In Progress";
        }
        if (containsAny(lower, "done", "complete", "finish", "resolved", "close")) {
            return "Done";
        }
        if (containsAny(lower, "review", "qa", "testing")) {
            return "In Review";
        }
        if (containsAny(lower, "todo", "backlog", "to do")) {
            return "Todo";
        }
        return null;
    }

    /** Word-overlap similarity ranking (a lightweight, deterministic stand-in for embeddings). */
    static List<WorkItem> rankSimilar(List<WorkItem> items, String query, int limit) {
        var terms = tokenize(query);
        return items.stream()
            .map(w -> Map.entry(w, overlap(terms, tokenize(nv(w.getTitle()) + " " + nv(w.getDescription())))))
            .filter(e -> e.getValue() > 0)
            .sorted(Map.Entry.<WorkItem, Integer>comparingByValue().reversed())
            .limit(limit)
            .map(Map.Entry::getKey)
            .collect(Collectors.toList());
    }

    static List<Article> rankArticles(List<Article> arts, String query, int limit) {
        var terms = tokenize(query);
        return arts.stream()
            .map(a -> Map.entry(a, overlap(terms, tokenize(nv(a.getTitle()) + " " + nv(a.getContent())))))
            .filter(e -> e.getValue() > 0)
            .sorted(Map.Entry.<Article, Integer>comparingByValue().reversed())
            .limit(limit)
            .map(Map.Entry::getKey)
            .collect(Collectors.toList());
    }

    static Team bestTeam(List<Team> teams, String text) {
        var terms = tokenize(text);
        return teams.stream()
            .max(Comparator.comparingInt(t -> overlap(terms, tokenize(nv(t.getName()) + " " + nv(t.getDescription())))))
            .filter(t -> overlap(terms, tokenize(nv(t.getName()) + " " + nv(t.getDescription()))) > 0)
            .orElse(teams.isEmpty() ? null : teams.get(0));
    }

    /** Index of the biggest absolute step-to-step swing; -1 if the series is too short. */
    static int biggestSwingIndex(List<Double> series) {
        if (series == null || series.size() < 2) {
            return -1;
        }
        int idx = -1;
        double max = -1;
        for (int i = 1; i < series.size(); i++) {
            double d = Math.abs(series.get(i) - series.get(i - 1));
            if (d > max) {
                max = d;
                idx = i;
            }
        }
        return max <= 0 ? -1 : idx;
    }

    static String slaRisk(String priority, long ageHours) {
        long budget = switch (priority == null ? "" : priority.toLowerCase(Locale.ROOT)) {
            case "critical" -> 4;
            case "high" -> 24;
            case "medium" -> 72;
            default -> 168;
        };
        if (ageHours >= budget) {
            return "HIGH";
        }
        if (ageHours >= budget * 0.75) {
            return "MEDIUM";
        }
        return "LOW";
    }

    static String renderTemplate(String kind, String topic, Map<String, Object> ctx) {
        String t = nv(topic).isBlank() ? "the requested capability" : topic;
        return switch (kind) {
            case "ac", "acceptance_criteria" -> "Acceptance criteria for " + t + ":\n"
                + "- Given a valid request, when the user acts, then the expected outcome occurs.\n"
                + "- Given invalid input, when submitted, then a clear error is shown.\n"
                + "- Given no permission, when attempted, then access is denied (RB-40 §1).";
            case "test_cases", "tests" -> "Test cases for " + t + ":\n"
                + "1. Happy path — valid input succeeds.\n2. Edge — boundary values handled.\n"
                + "3. Error — invalid input rejected with a clear message.\n4. Empty — no data state.\n"
                + "5. Unauthorized & cross-tenant — access denied.";
            case "comment" -> "Thanks for the update on " + t + ". I'll review and follow up shortly.";
            case "article" -> "# " + t + "\n\n## Overview\n_Describe the topic._\n\n## Steps\n1. \n2. \n\n## References\n- ";
            case "release_notes" -> "## Release notes\n\n### Highlights\n- " + t + "\n\n### Fixes\n- ";
            default -> "As a user, I want " + t + ", so that I get value.\n\nAcceptance criteria:\n- \n- ";
        };
    }

    static String blankScaffold(String kind) {
        return switch (kind) {
            case "ac", "acceptance_criteria" -> "Acceptance criteria:\n- \n- ";
            case "test_cases", "tests" -> "Test cases:\n1. \n2. ";
            case "article" -> "# Title\n\n## Overview\n\n## Steps\n";
            case "release_notes" -> "## Release notes\n\n### Highlights\n- ";
            case "comment" -> "";
            default -> "As a user, I want ..., so that ...";
        };
    }

    // ── small utilities ──────────────────────────────────────────────────────────

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

    private String resolveUser(String name, String email, String workspaceId) {
        if (email != null && !email.isBlank()) {
            return users.findByEmail(email).map(User::getId).orElse(null);
        }
        if (name == null || name.isBlank()) {
            return null;
        }
        // Scoped to workspace members only — prevents cross-tenant user resolution (RB-40 §1)
        return users.findByWorkspaceIdAndFullNameContaining(workspaceId, name.trim())
            .stream().map(User::getId).findFirst().orElse(null);
    }

    private void requireSameWorkspace(String expected, String actual) {
        if (actual == null || !actual.equals(expected)) {
            throw ApiException.forbidden("Item belongs to a different workspace.");
        }
    }

    private static boolean matches(WorkItem w, String q) {
        if (q == null || q.isBlank()) {
            return true;
        }
        String hay = (nv(w.getTitle()) + " " + nv(w.getDescription()) + " " + nv(w.getStatus())).toLowerCase(Locale.ROOT);
        return tokenize(q).stream().anyMatch(hay::contains);
    }

    static List<String> tokenize(String text) {
        if (text == null) {
            return List.of();
        }
        return Arrays.stream(text.toLowerCase(Locale.ROOT).split("[^a-z0-9]+"))
            .filter(s -> s.length() > 1 && !STOPWORDS.contains(s))
            .collect(Collectors.toList());
    }

    static int overlap(List<String> a, List<String> b) {
        if (a.isEmpty() || b.isEmpty()) {
            return 0;
        }
        var setB = new java.util.HashSet<>(b);
        return (int) a.stream().filter(setB::contains).count();
    }

    private static String afterKeyword(String text, String... keywords) {
        String lower = text.toLowerCase(Locale.ROOT);
        for (String kw : keywords) {
            int i = lower.indexOf(" " + kw + " ");
            if (i >= 0) {
                String rest = text.substring(i + kw.length() + 2).trim();
                // Stop at the next item ref / email if present.
                return rest.split("\\s{2,}|,")[0].trim();
            }
        }
        return null;
    }

    private static String stripCreateVerb(String clause) {
        return clause.replaceAll("(?i)^\\s*(create|add|new|find|search|show|list|banao|bana|banaye|dhundo|dikhao)\\s+", "")
            .replaceAll("(?i)\\b(a |an |the )", "").trim();
    }

    private static String snippet(String content) {
        String c = nv(content);
        return c.length() > 200 ? c.substring(0, 200) + "…" : c;
    }

    private static boolean containsAny(String haystack, String... needles) {
        for (String n : needles) {
            if (haystack.contains(n)) {
                return true;
            }
        }
        return false;
    }

    private static String str(Object o) {
        return o == null ? "" : o.toString();
    }

    private static String nv(Object o) {
        return o == null ? "" : o.toString();
    }
}
