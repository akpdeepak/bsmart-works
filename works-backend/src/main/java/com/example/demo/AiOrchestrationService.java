package com.example.demo;

import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Optional;
import java.util.UUID;

/**
 * The single entry point for every AI call in the product (iteration 10, Cap O / I10-S01–S02; RB-40
 * §2). No capability calls a model on its own terms — they all flow through here. For one request
 * (workspace, user, capability, input) the orchestration:
 *
 * <ol>
 *   <li>resolves effective AI enablement across the scope hierarchy ({@link AiPolicyResolver},
 *       most-restrictive-wins);</li>
 *   <li>reads the budget state ({@link AiBudgetService}: &lt;80% NORMAL, 80% DEGRADED, 100% DISABLED);</li>
 *   <li>applies the server-side data boundary ({@link DataBoundaryService}) — PII/financial redaction
 *       <em>before</em> anything could leave the box;</li>
 *   <li>selects the model tier;</li>
 *   <li>calls the live provider when available + enabled + under budget, otherwise the deterministic
 *       fallback ({@link DeterministicAiProvider});</li>
 *   <li>records exactly one {@link AiInvocation} audit row and accrues the cost onto the budget;</li>
 *   <li>returns a <b>plan to confirm</b> for state-changing capabilities — never auto-executes
 *       (confirmation-first, I10-S02). NL→BQL returns a BQL preview (no mutation); summarize is
 *       read-only.</li>
 * </ol>
 *
 * <p>With no live key configured the orchestration uses the deterministic provider and records
 * {@code fallbackUsed = true} with the {@code DETERMINISTIC} tier — the whole plane is fully
 * functional and testable without an LLM.
 */
@Service
public class AiOrchestrationService {

    private static final DateTimeFormatter MONTH = DateTimeFormatter.ofPattern("yyyy-MM");

    private final AiWorkspacePolicyRepository policies;
    private final AiCapabilityToggleRepository toggles;
    private final AiUserPreferenceRepository preferences;
    private final AiBudgetRepository budgets;
    private final AiDataBoundaryRepository boundaries;
    private final AiInvocationRepository invocations;
    private final AiPolicyResolver policyResolver;
    private final AiBudgetService budgetService;
    private final DataBoundaryService dataBoundary;
    private final DeterministicAiProvider deterministicProvider;
    private final AiProvider liveProvider; // null unless a live provider bean is configured (out of scope)
    private final BqlCompiler bqlCompiler;
    private final EventService eventService;

    public AiOrchestrationService(AiWorkspacePolicyRepository policies,
                                  AiCapabilityToggleRepository toggles,
                                  AiUserPreferenceRepository preferences,
                                  AiBudgetRepository budgets,
                                  AiDataBoundaryRepository boundaries,
                                  AiInvocationRepository invocations,
                                  AiPolicyResolver policyResolver,
                                  AiBudgetService budgetService,
                                  DataBoundaryService dataBoundary,
                                  DeterministicAiProvider deterministicProvider,
                                  org.springframework.beans.factory.ObjectProvider<AiProvider> liveProviders,
                                  BqlCompiler bqlCompiler,
                                  EventService eventService) {
        this.policies = policies;
        this.toggles = toggles;
        this.preferences = preferences;
        this.budgets = budgets;
        this.boundaries = boundaries;
        this.invocations = invocations;
        this.policyResolver = policyResolver;
        this.budgetService = budgetService;
        this.dataBoundary = dataBoundary;
        this.deterministicProvider = deterministicProvider;
        this.bqlCompiler = bqlCompiler;
        this.eventService = eventService;
        // A live provider is anything implementing AiProvider that is NOT the deterministic one.
        // None is shipped this iteration; the seam is here so one can plug in behind a key.
        this.liveProvider = liveProviders.stream()
            .filter(p -> !p.isDeterministic())
            .findFirst()
            .orElse(null);
    }

    /** The plane's answer for a read/preview call: the output plus how it was produced (for the UI + audit). */
    public record AiResponse(String capability, String output, boolean confident, boolean aiEnabled,
                             boolean fallbackUsed, String modelTier, String policyState,
                             String plan) { }

    /**
     * Run the NL→BQL surface (I10-S12). Returns a BQL <b>preview</b> only — confirmation-first means
     * nothing is executed here; the UI shows the plan and the user runs it through the existing BQL
     * executor on Confirm. An un-compilable or low-confidence parse comes back not-confident.
     */
    public AiResponse nlToBql(String workspaceId, String userId, String phrase, boolean contextOptOut) {
        Decision d = decide(workspaceId, userId, "NL_TO_BQL", contextOptOut);
        String redacted = redactFor(workspaceId, phrase);
        AiProvider.AiResult r = providerFor(d).complete(
            new AiProvider.AiTask(AiProvider.Capability.NL_TO_BQL, redacted, userId));

        boolean confident = r.confident() && compiles(r.text(), userId);
        String outcome = confident ? "OK" : "LOW_CONFIDENCE";
        record(workspaceId, userId, "NL_TO_BQL", r, d, outcome);

        String plan = confident
            ? "Here's what I'll do: run the query  " + r.text() + "  — [Confirm] [Edit] [Cancel]."
            : "Couldn't confidently interpret that — switch to the manual BQL/visual builder.";
        return new AiResponse("NL_TO_BQL", confident ? r.text() : "", confident, d.enabled,
            r.fallbackUsed(), r.modelTier(), d.state.name(), plan);
    }

    /** Run the summarization surface (I10-S13). Read-only — no plan to confirm. */
    public AiResponse summarize(String workspaceId, String userId, String text, boolean contextOptOut) {
        Decision d = decide(workspaceId, userId, "SUMMARIZATION", contextOptOut);
        String redacted = redactFor(workspaceId, text);
        AiProvider.AiResult r = providerFor(d).complete(
            new AiProvider.AiTask(AiProvider.Capability.SUMMARIZATION, redacted, userId));
        record(workspaceId, userId, "SUMMARIZATION", r, d, "OK");
        return new AiResponse("SUMMARIZATION", r.text(), true, d.enabled,
            r.fallbackUsed(), r.modelTier(), d.state.name(), null);
    }

    // ── internals ────────────────────────────────────────────────────────────────

    /** The resolved gate for one call: is AI enabled, the budget state, and the chosen tier. */
    record Decision(boolean enabled, AiBudgetService.State state, String tier) { }

    private Decision decide(String workspaceId, String userId, String capability, boolean contextOptOut) {
        AiPolicyResolver.Mode mode = policies.findByWorkspaceId(workspaceId)
            .map(p -> policyResolver.parseMode(p.getMode()))
            .orElse(AiPolicyResolver.Mode.OPT_IN);
        String capableTier = policies.findByWorkspaceId(workspaceId)
            .map(AiWorkspacePolicy::getDefaultModelTier)
            .orElse("SONNET");
        AiPolicyResolver.Toggle cap = toggles.findByWorkspaceIdAndCapability(workspaceId, capability)
            .map(t -> policyResolver.toggleOf(t.getEnabled()))
            .orElse(AiPolicyResolver.Toggle.INHERIT);
        AiPolicyResolver.Toggle usr = preferences.findByWorkspaceIdAndUserId(workspaceId, userId)
            .map(pref -> policyResolver.toggleOf(pref.getEnabled()))
            .orElse(AiPolicyResolver.Toggle.INHERIT);

        boolean enabled = policyResolver.isEnabled(mode, cap, usr, contextOptOut);

        Optional<AiBudget> budget = budgets.findByWorkspaceIdAndPeriodMonth(workspaceId, currentMonth());
        AiBudgetService.State state = budget
            .map(b -> budgetService.state(b.getCapAmount(), b.getSpentAmount()))
            .orElse(AiBudgetService.State.NORMAL);
        String tier = budgetService.tierFor(state, capableTier);
        return new Decision(enabled, state, tier);
    }

    /**
     * Pick the provider: the live one only when AI is enabled, a live provider exists, and the budget
     * is not exhausted; otherwise the deterministic fallback. With no live provider configured this
     * always returns the deterministic provider.
     */
    private AiProvider providerFor(Decision d) {
        if (d.enabled && liveProvider != null && d.state != AiBudgetService.State.DISABLED) {
            return liveProvider;
        }
        return deterministicProvider;
    }

    private String redactFor(String workspaceId, String input) {
        AiDataBoundary b = boundaries.findByWorkspaceId(workspaceId).orElse(null);
        boolean blockPii = b == null || Boolean.TRUE.equals(b.getBlockPii());
        boolean blockFinancial = b == null || Boolean.TRUE.equals(b.getBlockFinancial());
        return dataBoundary.redact(input, blockPii, blockFinancial);
    }

    private boolean compiles(String bql, String userId) {
        if (bql == null || bql.isBlank()) {
            return false;
        }
        try {
            bqlCompiler.compile(bql, userId);
            return true;
        } catch (BqlException ex) {
            return false;
        }
    }

    /** Write the per-call audit row and accrue its cost onto the month's budget (RB-40 §2). */
    private void record(String workspaceId, String userId, String capability,
                        AiProvider.AiResult r, Decision d, String outcome) {
        AiInvocation inv = new AiInvocation();
        inv.setId("AINV-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        inv.setWorkspaceId(workspaceId);
        inv.setUserId(userId);
        inv.setCapability(capability);
        inv.setModelTier(r.modelTier());
        inv.setPromptChars(r.tokensIn() * 4);
        inv.setTokensIn(r.tokensIn());
        inv.setTokensOut(r.tokensOut());
        BigDecimal cost = costOf(r);
        inv.setCost(cost);
        inv.setPolicyState(d.enabled ? d.state.name() : "OFF");
        inv.setFallbackUsed(r.fallbackUsed());
        inv.setOutcome(outcome);
        inv.setCreatedAt(OffsetDateTime.now());
        invocations.save(inv);

        if (cost.signum() > 0) {
            accrue(workspaceId, cost, userId);
        }
        eventService.record(inv.getId(), "AI_INVOCATION_RECORDED", userId,
            java.util.Map.of("capability", capability, "tier", r.modelTier(),
                "fallback", r.fallbackUsed(), "outcome", outcome));
    }

    /**
     * Deterministic calls cost nothing (no model); a live call would price tokens by tier. Kept here
     * so the seam meters cost the moment a live provider is added.
     */
    private BigDecimal costOf(AiProvider.AiResult r) {
        if (r.fallbackUsed() || DeterministicAiProvider.TIER.equals(r.modelTier())) {
            return BigDecimal.ZERO;
        }
        // Placeholder per-1k-token pricing for a future live provider (cheap tier vs capable tier).
        BigDecimal perThousand = "HAIKU".equals(r.modelTier())
            ? new BigDecimal("0.50") : new BigDecimal("3.00");
        return perThousand
            .multiply(BigDecimal.valueOf(r.tokensIn() + r.tokensOut()))
            .divide(BigDecimal.valueOf(1000), 4, java.math.RoundingMode.HALF_UP);
    }

    private void accrue(String workspaceId, BigDecimal cost, String userId) {
        AiBudget budget = budgets.findByWorkspaceIdAndPeriodMonth(workspaceId, currentMonth())
            .orElseGet(() -> {
                AiBudget b = new AiBudget();
                b.setId("AIBG-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                b.setWorkspaceId(workspaceId);
                b.setPeriodMonth(currentMonth());
                b.setCapAmount(BigDecimal.ZERO);
                b.setSpentAmount(BigDecimal.ZERO);
                return b;
            });
        budget.setSpentAmount(budget.getSpentAmount().add(cost));
        budget.setUpdatedBy(userId);
        budget.setUpdatedAt(OffsetDateTime.now());
        budgets.save(budget);
    }

    private String currentMonth() {
        return OffsetDateTime.now(ZoneOffset.UTC).format(MONTH);
    }
}
