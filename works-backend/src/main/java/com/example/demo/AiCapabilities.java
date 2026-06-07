package com.example.demo;

import java.util.List;
import java.util.Map;

/**
 * The registry of iteration-11 AI capabilities (RB-40 §2 — one orchestration layer means one place
 * that knows what AI surfaces exist). Each capability declares its default model tier (RB-40 §2
 * model tiering: cheap/fast for intent + classification, capable for generation) and a one-line
 * description of its deterministic fallback — the mandatory answer to "what happens when AI is off,
 * over budget, or unavailable?" (no fallback documented = it does not ship).
 */
public final class AiCapabilities {

    private AiCapabilities() { }

    public static final String COMMAND_BAR        = "command_bar";        // Cap P — conversational command bar + multi-action plans
    public static final String TRIAGE             = "triage";             // Cap O — smart triage on incoming items
    public static final String GENERATION         = "generation";         // Cap O/I — story/AC/test/comment/article/release-note drafting
    public static final String ANOMALY            = "anomaly";            // Cap O — anomaly explanation on charts
    public static final String COMPLIANCE_SUGGEST = "compliance_suggest"; // Cap K — AI-suggested compliance rules
    public static final String SLA_PREDICTION     = "sla_prediction";     // Cap M — SLA breach prediction
    public static final String KB_RAG             = "kb_rag";             // Cap I — RAG over the knowledge base
    public static final String KB_SUGGEST         = "kb_suggest";         // Cap N — article suggestion at intake
    public static final String ROUTING            = "routing";            // Cap N — smart customer-request routing
    public static final String STANDUP            = "standup";            // Cap U — standup helper draft (iter 14)
    public static final String REVIEW_RANK        = "review_rank";        // Cap U — code review queue ranking (iter 14)
    public static final String CODE_EXPLAIN       = "code_explain";       // Cap U — explain unfamiliar linked code (iter 14)
    public static final String COMMIT_SUMMARY     = "commit_summary";     // Cap U — propose item update from commit (iter 14)
    public static final String KPI_NARRATIVE      = "kpi_narrative";      // Cap L — AI team-health narrative (iteration 12)
    public static final String AUTOMATION_SUGGEST = "automation_suggest"; // Cap C — AI-suggested automation rules (iteration 13)
    public static final String SPRINT_PLAN        = "sprint_plan";        // Cap V — sprint planning commit suggestion (I15-S01)
    public static final String SPRINT_REVIEW      = "sprint_review";      // Cap V — sprint review prep draft (I15-S06)
    public static final String SPRINT_PATTERNS    = "sprint_patterns";    // Cap V — cross-sprint pattern detection (I15-S07)
    public static final String BACKLOG_REFINE     = "backlog_refine";     // Cap W — backlog refinement ranking (I15-S09)
    public static final String FEEDBACK_CLUSTER   = "feedback_cluster";   // Cap W — customer-feedback theme clustering (I15-S11)
    public static final String RELEASE_NOTES      = "release_notes";      // Cap W — release-notes auto-draft (I15-S13)
    public static final String EXEC_BRIEFING      = "exec_briefing";      // Cap X — AI executive briefing (iteration 16)
    public static final String BOARD_DECK         = "board_deck";         // Cap X — quarterly board-deck auto-draft (iteration 16)

    /** Description of each capability and its deterministic fallback, surfaced to the UI panel. */
    public record Descriptor(String id, String label, AiModelTier defaultTier, String fallback) { }

    private static final List<Descriptor> ALL = List.of(
        new Descriptor(COMMAND_BAR, "Conversational command bar", AiModelTier.HAIKU,
            "Falls back to the manual create/edit forms and the visual BQL builder — the parsed fields pre-fill them."),
        new Descriptor(TRIAGE, "Smart triage", AiModelTier.HAIKU,
            "Falls back to workspace default priority/assignee and a keyword search for similar items."),
        new Descriptor(GENERATION, "Story / AC / test / comment drafting", AiModelTier.SONNET,
            "Falls back to the blank type template — the editor opens with the standard scaffold to fill in by hand."),
        new Descriptor(ANOMALY, "Anomaly explanation", AiModelTier.SONNET,
            "Falls back to the raw delta and the contributing items list, without a narrative."),
        new Descriptor(COMPLIANCE_SUGGEST, "AI-suggested compliance rules", AiModelTier.SONNET,
            "Falls back to the seeded rule-template library in the visual rule builder."),
        new Descriptor(SLA_PREDICTION, "SLA breach prediction", AiModelTier.HAIKU,
            "Falls back to the deterministic age-vs-target threshold already shown on SLA timers."),
        new Descriptor(KB_RAG, "Knowledge-base Q&A (RAG)", AiModelTier.SONNET,
            "Falls back to ranked keyword search results over articles — the existing KB search."),
        new Descriptor(KB_SUGGEST, "Article suggestion at intake", AiModelTier.HAIKU,
            "Falls back to keyword article search; suggestions simply do not appear if none match."),
        new Descriptor(ROUTING, "Smart request routing", AiModelTier.HAIKU,
            "Falls back to the project's default team / round-robin assignment."),
        new Descriptor(STANDUP, "Standup helper", AiModelTier.HAIKU,
            "Falls back to the deterministic draft assembled from yesterday's resolved items, today's in-progress items, and blockers."),
        new Descriptor(REVIEW_RANK, "Code review queue ranking", AiModelTier.HAIKU,
            "Falls back to the deterministic urgency score (PR age, size, linked-item priority) — the queue still ranks, without a narrative reason."),
        new Descriptor(CODE_EXPLAIN, "Explain linked code", AiModelTier.SONNET,
            "Falls back to the raw list of linked commits, branches and touched files, without a narrative."),
        new Descriptor(COMMIT_SUMMARY, "Propose item update from commit", AiModelTier.HAIKU,
            "Falls back to the deterministic parse of the commit message (item ref + intent keyword → suggested status)."),
        new Descriptor(KPI_NARRATIVE, "AI team-health narrative", AiModelTier.SONNET,
            "Falls back to a deterministic summary of the metric deltas — the numbers, without a narrative."),
        new Descriptor(AUTOMATION_SUGGEST, "AI-suggested automation rules", AiModelTier.SONNET,
            "Falls back to the one-click automation template library in the visual builder."),
        new Descriptor(SPRINT_PLAN, "Sprint planning commit suggestion", AiModelTier.SONNET,
            "Falls back to the deterministic capacity calculation (velocity − time-off) and the "
            + "refined-item list ranked by priority and points — the manual planning view."),
        new Descriptor(SPRINT_REVIEW, "Sprint review prep", AiModelTier.SONNET,
            "Falls back to the computed metrics plus the shipped / slipped item lists, without the narrative summary."),
        new Descriptor(SPRINT_PATTERNS, "Cross-sprint pattern detection", AiModelTier.SONNET,
            "Falls back to the frequency tables — recurring impediment categories and repeated "
            + "estimation misses — shown without an interpretive narrative."),
        new Descriptor(BACKLOG_REFINE, "Backlog refinement ranking", AiModelTier.SONNET,
            "Falls back to the deterministic weighted score (value / effort / strategic-fit) and the "
            + "needs-detail flags, presented in the manual backlog view."),
        new Descriptor(FEEDBACK_CLUSTER, "Customer-feedback theme clustering", AiModelTier.SONNET,
            "Falls back to keyword bucketing into themes with lexicon sentiment — the deterministic clusterer."),
        new Descriptor(RELEASE_NOTES, "Release-notes auto-draft", AiModelTier.SONNET,
            "Falls back to completed items grouped by type into a plain markdown changelog for manual editing."),
        new Descriptor(EXEC_BRIEFING, "AI executive briefing", AiModelTier.SONNET,
            "Falls back to the deterministic briefing assembled from the cross-team rollup, customer-health "
            + "and risk-portfolio figures — the numbers and headlines, without the narrative prose."),
        new Descriptor(BOARD_DECK, "Quarterly board-deck auto-draft", AiModelTier.SONNET,
            "Falls back to the deterministic slide outline built from the same rollup, OKR and risk data — "
            + "the structured slides for manual narration.")
    );

    private static final Map<String, Descriptor> BY_ID =
        ALL.stream().collect(java.util.stream.Collectors.toMap(Descriptor::id, d -> d));

    public static List<Descriptor> all() {
        return ALL;
    }

    public static boolean isKnown(String capability) {
        return BY_ID.containsKey(capability);
    }

    /** Default tier for a capability; unknown capabilities default to the cheap tier. */
    public static AiModelTier defaultTier(String capability) {
        Descriptor d = BY_ID.get(capability);
        return d == null ? AiModelTier.HAIKU : d.defaultTier();
    }
}
