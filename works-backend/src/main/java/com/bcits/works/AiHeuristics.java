package com.bcits.works;

import com.bcits.works.shared.ApiException;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Pure, stateless deterministic helpers extracted from {@link AiAssistService}.
 *
 * <p>Every method here is referentially transparent — no database, no control plane, no events,
 * no request state — so it can be unit-tested in isolation (RB-10 §7). These functions double as
 * the deterministic fallback implementations the service serves verbatim when AI is off, over
 * budget, or unavailable (RB-40 §2). The command-bar parsers reference the public
 * {@link AiAssistService.PlanStep} / {@link AiAssistService.ActionType} types, which the service
 * still owns and executes.
 */
final class AiHeuristics {

    private AiHeuristics() {
    }

    static final List<String> STOPWORDS = List.of("the", "a", "an", "to", "of", "in", "on", "for", "and", "is", "with");

    private static final Pattern ITEM_REF = Pattern.compile("\\b([A-Z][A-Z0-9]*-\\d+)\\b");
    private static final Pattern EMAIL = Pattern.compile("[\\w.+-]+@[\\w-]+\\.[\\w.-]+");

    private static final java.util.Set<String> FIND_VERBS =
        java.util.Set.of("find", "search", "show", "list", "dhundo", "dikhao", "dikhaao", "खोजो");

    // ── Command-bar parsing (Cap P) ──────────────────────────────────────────────

    /** Split a command on conjunctions and parse each clause into a {@link AiAssistService.PlanStep}. */
    static List<AiAssistService.PlanStep> parseSteps(String text) {
        List<AiAssistService.PlanStep> steps = new ArrayList<>();
        for (String clause : splitClauses(text)) {
            String c = clause.trim();
            if (c.isEmpty()) {
                continue;
            }
            steps.add(parseClause(c));
        }
        if (steps.isEmpty()) {
            steps.add(new AiAssistService.PlanStep(AiAssistService.ActionType.UNKNOWN.name(),
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

    static AiAssistService.PlanStep parseClause(String clause) {
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
            return new AiAssistService.PlanStep(AiAssistService.ActionType.COMMENT.name(),
                "Comment on " + (itemRef != null ? itemRef : "item"), params, true);
        }
        // A leading find verb is a query — even if the text later mentions "assigned to me".
        if (FIND_VERBS.contains(firstWord)) {
            params.put("query", stripCreateVerb(clause));
            return new AiAssistService.PlanStep(AiAssistService.ActionType.FIND.name(),
                String.format("Find items matching: %s", params.get("query")), params, true);
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
            return new AiAssistService.PlanStep(AiAssistService.ActionType.ASSIGN.name(),
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
            return new AiAssistService.PlanStep(AiAssistService.ActionType.MOVE_STATUS.name(),
                "Move " + (itemRef != null ? itemRef : "item") + " to " + nv(params.get("status")), params, true);
        }
        // CREATE: "create", "add", "new", "banao", "बनाओ", "नया"
        if (containsAny(lower, "create", "add", "new ", "banao", "bana ", "banaye", "बनाओ", "नया")) {
            params.put("type", detectType(lower));
            params.put("priority", heuristicPriority(clause, ""));
            params.put("title", stripCreateVerb(clause));
            return new AiAssistService.PlanStep(AiAssistService.ActionType.CREATE_ITEM.name(),
                String.format("Create %s: %s", params.get("type"), params.get("title")), params, true);
        }
        // FIND / SEARCH: "find", "search", "show", "list", "dhundo", "खोजो", "dikhao"
        if (containsAny(lower, "find", "search", "show", "list", "dhundo", "खोजो", "dikhao", "dikhaao")) {
            params.put("query", stripCreateVerb(clause));
            return new AiAssistService.PlanStep(AiAssistService.ActionType.FIND.name(),
                String.format("Find items matching: %s", params.get("query")), params, true);
        }
        return new AiAssistService.PlanStep(AiAssistService.ActionType.UNKNOWN.name(), "Unrecognised: " + clause, params, true);
    }

    static String renderPlanSummary(List<AiAssistService.PlanStep> steps) {
        StringBuilder sb = new StringBuilder("Here's what I'll do:\n");
        int i = 1;
        for (AiAssistService.PlanStep s : steps) {
            sb.append(i++).append(". ").append(s.description()).append('\n');
        }
        return sb.toString().trim();
    }

    // ── Triage / classification ──────────────────────────────────────────────────

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

    // Returns canonical type keys — uppercase since the V68 work-item type redesign.
    // These flow into created items (CREATE_ITEM), triage suggestions, and BQL
    // type clauses, so mixed-case here would write or query values the DB no
    // longer contains. (Statuses stayed mixed-case; detectStatus is unchanged.)
    static String detectType(String lower) {
        if (containsAny(lower, "bug", "defect", "error", "crash")) {
            return "BUG";
        }
        if (containsAny(lower, "story", "feature", "as a user")) {
            return "STORY";
        }
        if (containsAny(lower, "epic")) {
            return "EPIC";
        }
        if (containsAny(lower, "incident", "outage")) {
            return "INCIDENT";
        }
        return "TASK";
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

    // ── Ranking ──────────────────────────────────────────────────────────────────

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

    // ── Anomaly / SLA ─────────────────────────────────────────────────────────────

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

    // ── Generation templates ──────────────────────────────────────────────────────

    /**
     * Returns a deterministic template scaffold for a known generation {@code kind}.
     * Throws {@link ApiException} (HTTP 400) for any unrecognised kind so that
     * mis-wired callers surface an explicit error instead of silently receiving a
     * user-story scaffold (audit finding #17).
     *
     * <p>Known kinds: {@code ac} / {@code acceptance_criteria}, {@code test_cases} /
     * {@code tests}, {@code comment}, {@code article}, {@code release_notes}.
     */
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
            default -> throw ApiException.badRequest("UNKNOWN_GENERATION_KIND",
                "Unknown generation kind: " + kind
                + ". Valid kinds: ac, acceptance_criteria, test_cases, tests, comment, article, release_notes.");
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

    // ── NL → BQL ──────────────────────────────────────────────────────────────────

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
        if (!"TASK".equals(type) || containsAny(lower, "task")) {
            clauses.add("type = \"" + type + "\"");
        }
        // Assignee — canonical BQL: currentUser() function + IS EMPTY null check (compiler-parseable).
        if (containsAny(lower, "assigned to me", "my items", "mine")) {
            clauses.add("assignee = currentUser()");
        } else if (containsAny(lower, "unassigned")) {
            clauses.add("assignee IS EMPTY");
        }
        // Time windows — canonical relative-date functions.
        if (containsAny(lower, "last week", "this week")) {
            clauses.add("createdAt >= startOfWeek()");
        } else if (containsAny(lower, "today")) {
            clauses.add("createdAt >= today()");
        } else if (containsAny(lower, "overdue")) {
            clauses.add("dueDate < today() AND status != \"Done\"");
        }
        return String.join(" AND ", clauses);
    }

    // ── Small utilities ──────────────────────────────────────────────────────────

    static boolean matches(WorkItem w, String q) {
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

    static String afterKeyword(String text, String... keywords) {
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

    static String stripCreateVerb(String clause) {
        return clause.replaceAll("(?i)^\\s*(create|add|new|find|search|show|list|banao|bana|banaye|dhundo|dikhao)\\s+", "")
            .replaceAll("(?i)\\b(a |an |the )", "").trim();
    }

    static String snippet(String content) {
        String c = nv(content);
        return c.length() > 200 ? c.substring(0, 200) + "…" : c;
    }

    static boolean containsAny(String haystack, String... needles) {
        for (String n : needles) {
            if (haystack.contains(n)) {
                return true;
            }
        }
        return false;
    }

    static String str(Object o) {
        return o == null ? "" : o.toString();
    }

    static String nv(Object o) {
        return o == null ? "" : o.toString();
    }
}
