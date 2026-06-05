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
    public static final String KPI_NARRATIVE      = "kpi_narrative";      // Cap L — AI team-health narrative (iteration 12)
    public static final String AUTOMATION_SUGGEST = "automation_suggest"; // Cap C — AI-suggested automation rules (iteration 13)

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
        new Descriptor(KPI_NARRATIVE, "AI team-health narrative", AiModelTier.SONNET,
            "Falls back to a deterministic summary of the metric deltas — the numbers, without a narrative."),
        new Descriptor(AUTOMATION_SUGGEST, "AI-suggested automation rules", AiModelTier.SONNET,
            "Falls back to the one-click automation template library in the visual builder.")
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
