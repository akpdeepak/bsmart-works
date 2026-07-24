package com.bcits.works.ai.api;
import com.bcits.works.ai.AiBudget;
import com.bcits.works.ai.AiBudgetRepository;
import com.bcits.works.ai.AiCacheEntry;
import com.bcits.works.ai.AiCacheEntryRepository;
import com.bcits.works.ai.AiInvocation;
import com.bcits.works.ai.AiInvocationRepository;
import com.bcits.works.ai.AiPolicy;
import com.bcits.works.ai.AiPolicyRepository;

import com.bcits.works.AiCapabilities;
import com.bcits.works.shared.RateLimiter;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * The AI Control Plane (RB-40 §2): the single entry point every AI capability routes through, so
 * scope, budget, caching, audit and the deterministic fallback contract are enforced centrally and
 * cannot be forgotten per-feature.
 *
 * <p>{@link #invoke(AiCall)} applies, in order: (1) the scope hierarchy
 * (most-restrictive-wins across WORKSPACE → CAPABILITY → USER → in-context), (2) the per-workspace
 * monthly budget (80% → forced to the cheap tier, 100% → AI disabled and the fallback served),
 * (3) the response cache, then (4) the model gateway — recording an audit row and incrementing
 * spend for every outcome. Disabled / over-budget calls return a fallback outcome the caller turns
 * into its capability-specific deterministic behaviour.
 *
 * <p>RBAC and tenant scoping are the caller's responsibility before invoking (RB-10 §2); this
 * service assumes the workspace has already been authorised.
 */
@Service
public class AiControlPlaneService {

    static final int DEGRADE_AT_PERCENT = 80;
    static final int DISABLE_AT_PERCENT = 100;
    static final long DEFAULT_CAP_CENTS = 10_000L; // $100.00 / month
    static final int CACHE_TTL_HOURS = 24;
    static final int USER_RATE_LIMIT = 100;        // AI calls per user per hour
    static final long USER_RATE_WINDOW_SECONDS = 3600L;

    // PII boundary (RB-40 §2): strip obvious personal identifiers before a prompt could leave the
    // server. The offline provider never egresses, but the redaction seam must exist and be tested.
    private static final Pattern EMAIL = Pattern.compile("[\\w.+-]+@[\\w-]+\\.[\\w.-]+");
    private static final Pattern PHONE = Pattern.compile("\\b(?:\\+?\\d[\\d -]{7,}\\d)\\b");

    private final AiPolicyRepository policies;
    private final AiBudgetRepository budgets;
    private final AiInvocationRepository invocations;
    private final AiCacheEntryRepository cache;
    private final AiProvider provider;
    private final RateLimiter rateLimiter;

    public AiControlPlaneService(AiPolicyRepository policies, AiBudgetRepository budgets,
                                 AiInvocationRepository invocations, AiCacheEntryRepository cache,
                                 AiProvider provider, RateLimiter rateLimiter) {
        this.policies = policies;
        this.budgets = budgets;
        this.invocations = invocations;
        this.cache = cache;
        this.provider = provider;
        this.rateLimiter = rateLimiter;
    }

    // ── Public value types ─────────────────────────────────────────────────────

    /** A capability's request to the control plane. {@code draft} is the deterministically-computed
     *  candidate; {@code cacheKey} is the cache identity within (workspace, capability). */
    public record AiCall(String workspaceId, String userId, String capability,
                         String prompt, String draft, String cacheKey, boolean inContextEnabled) { }

    /** Result returned to the caller: either an AI/cached response, or a signal to use the fallback. */
    public record AiOutcome(boolean usedAi, boolean fallback, String text, AiModelTier tier,
                            String policyState, int costCents, boolean cacheHit) {
        public static AiOutcome fallback(String state) {
            return new AiOutcome(false, true, null, AiModelTier.NONE, state, 0, false);
        }
    }

    public record EffectivePolicy(boolean enabled, String state) { }

    public record BudgetStatus(String period, long capCents, long spentCents, int percent,
                               boolean degraded, boolean disabled) { }

    // ── Scope resolution (most-restrictive-wins) ────────────────────────────────

    public EffectivePolicy resolve(String workspaceId, String capability, String userId, boolean inContextEnabled) {
        List<AiPolicy> all = policies.findByWorkspaceId(workspaceId);
        // Broadest scope first: a workspace-wide "off" beats everything downstream.
        if (disabled(all, "WORKSPACE", null, null)) {
            return new EffectivePolicy(false, "DISABLED_WORKSPACE");
        }
        if (disabled(all, "CAPABILITY", capability, null)) {
            return new EffectivePolicy(false, "DISABLED_CAPABILITY");
        }
        if (disabled(all, "USER", null, userId)) {
            return new EffectivePolicy(false, "DISABLED_USER");
        }
        if (!inContextEnabled) {
            return new EffectivePolicy(false, "DISABLED_IN_CONTEXT");
        }
        return new EffectivePolicy(true, "ENABLED");
    }

    private boolean disabled(List<AiPolicy> all, String scopeType, String capability, String userId) {
        return all.stream().anyMatch(p ->
            scopeType.equals(p.getScopeType())
                && java.util.Objects.equals(nullIfBlank(capability), nullIfBlank(p.getCapability()))
                && java.util.Objects.equals(nullIfBlank(userId), nullIfBlank(p.getUserId()))
                && Boolean.FALSE.equals(p.getEnabled()));
    }

    // ── Budget ──────────────────────────────────────────────────────────────────

    public BudgetStatus budgetStatus(String workspaceId) {
        String period = currentPeriod();
        AiBudget b = budgets.findByWorkspaceIdAndPeriod(workspaceId, period).orElse(null);
        long cap = b == null ? DEFAULT_CAP_CENTS : b.getMonthlyCapCents();
        long spent = b == null ? 0L : b.getSpentCents();
        int pct = cap <= 0 ? 100 : (int) Math.floor((spent * 100.0) / cap);
        return new BudgetStatus(period, cap, spent, pct, pct >= DEGRADE_AT_PERCENT, pct >= DISABLE_AT_PERCENT);
    }

    @Transactional
    public AiBudget setBudgetCap(String workspaceId, long capCents) {
        String period = currentPeriod();
        AiBudget b = budgets.findByWorkspaceIdAndPeriod(workspaceId, period).orElseGet(() -> {
            AiBudget fresh = new AiBudget();
            fresh.setId("AIB-" + shortId());
            fresh.setWorkspaceId(workspaceId);
            fresh.setPeriod(period);
            fresh.setSpentCents(0L);
            fresh.setCreatedAt(OffsetDateTime.now());
            return fresh;
        });
        b.setMonthlyCapCents(Math.max(0L, capCents));
        b.setUpdatedAt(OffsetDateTime.now());
        return budgets.save(b);
    }

    // ── Policy management (upsert by scope) ──────────────────────────────────────

    public List<AiPolicy> listPolicies(String workspaceId) {
        return policies.findByWorkspaceId(workspaceId);
    }

    @Transactional
    public AiPolicy setPolicy(String workspaceId, String scopeType, String capability,
                              String userId, boolean enabled) {
        String cap = nullIfBlank(capability);
        String usr = nullIfBlank(userId);
        AiPolicy existing = policies.findByWorkspaceId(workspaceId).stream()
            .filter(p -> scopeType.equals(p.getScopeType())
                && java.util.Objects.equals(cap, nullIfBlank(p.getCapability()))
                && java.util.Objects.equals(usr, nullIfBlank(p.getUserId())))
            .findFirst().orElse(null);
        OffsetDateTime now = OffsetDateTime.now();
        if (existing == null) {
            existing = new AiPolicy();
            existing.setId("AIP-" + shortId());
            existing.setWorkspaceId(workspaceId);
            existing.setScopeType(scopeType);
            existing.setCapability(cap);
            existing.setUserId(usr);
            existing.setCreatedAt(now);
        }
        existing.setEnabled(enabled);
        existing.setUpdatedAt(now);
        return policies.save(existing);
    }

    // ── The single invocation entry point ────────────────────────────────────────

    @Transactional
    public AiOutcome invoke(AiCall call) {
        EffectivePolicy policy = resolve(call.workspaceId(), call.capability(), call.userId(), call.inContextEnabled());
        if (!policy.enabled()) {
            record(call, AiModelTier.NONE, 0, 0, 0, false, true, policy.state());
            return AiOutcome.fallback(policy.state());
        }

        BudgetStatus budget = budgetStatus(call.workspaceId());
        if (budget.disabled()) {
            record(call, AiModelTier.NONE, 0, 0, 0, false, true, "BUDGET_EXCEEDED");
            return AiOutcome.fallback("BUDGET_EXCEEDED");
        }
        // 80% → force the cheap tier (RB-40 §2). Otherwise use the capability's default tier.
        boolean degraded = budget.degraded();
        AiModelTier tier = degraded ? AiModelTier.HAIKU : AiCapabilities.defaultTier(call.capability());
        String state = degraded ? "DEGRADED" : "ENABLED";

        // Per-user rate limit (RB-40 §2): prevent one user from exhausting workspace AI budget.
        String rlKey = "ai:" + call.workspaceId() + ":" + call.userId();
        if (!rateLimiter.allow(rlKey, USER_RATE_LIMIT, USER_RATE_WINDOW_SECONDS)) {
            record(call, AiModelTier.NONE, 0, 0, 0, false, true, "RATE_LIMITED_USER");
            return AiOutcome.fallback("RATE_LIMITED_USER");
        }

        // Cache lookup (RB-40 §2): serve repeats without re-spending. Expired entries are misses.
        String cacheId = cacheId(call);
        AiCacheEntry hit = cacheId == null ? null : cache.findById(cacheId).orElse(null);
        if (hit != null && (hit.getExpiresAt() == null || hit.getExpiresAt().isAfter(OffsetDateTime.now()))) {
            hit.setHits((hit.getHits() == null ? 0 : hit.getHits()) + 1);
            cache.save(hit);
            record(call, AiModelTier.valueOf(safeTier(hit.getModelTier())), 0, 0, 0, true, false, state);
            return new AiOutcome(true, false, hit.getResponse(),
                AiModelTier.valueOf(safeTier(hit.getModelTier())), state, 0, true);
        }

        // Model gateway. The prompt is PII-redacted at the boundary before it could leave the server.
        AiProvider.AiRequest req = new AiProvider.AiRequest(
            call.capability(), tier, redact(call.prompt()), call.draft(), java.util.Map.of());
        AiProvider.AiResult result = provider.complete(req);
        int cost = result.tier().costCents(result.tokensIn() + result.tokensOut());

        addSpend(call.workspaceId(), cost);
        if (cacheId != null) {
            storeCache(cacheId, call, result.text(), result.tier());
        }
        record(call, result.tier(), result.tokensIn(), result.tokensOut(), cost, false, false, state);
        return new AiOutcome(true, false, result.text(), result.tier(), state, cost, false);
    }

    // ── internals ─────────────────────────────────────────────────────────────

    private void addSpend(String workspaceId, int cost) {
        if (cost <= 0) {
            return;
        }
        String period = currentPeriod();
        AiBudget b = budgets.findByWorkspaceIdAndPeriod(workspaceId, period).orElseGet(() -> {
            AiBudget fresh = new AiBudget();
            fresh.setId("AIB-" + shortId());
            fresh.setWorkspaceId(workspaceId);
            fresh.setPeriod(period);
            fresh.setMonthlyCapCents(DEFAULT_CAP_CENTS);
            fresh.setSpentCents(0L);
            fresh.setCreatedAt(OffsetDateTime.now());
            return fresh;
        });
        b.setSpentCents((b.getSpentCents() == null ? 0L : b.getSpentCents()) + cost);
        b.setUpdatedAt(OffsetDateTime.now());
        budgets.save(b);
    }

    private void storeCache(String cacheId, AiCall call, String response, AiModelTier tier) {
        AiCacheEntry entry = new AiCacheEntry();
        entry.setId(cacheId);
        entry.setWorkspaceId(call.workspaceId());
        entry.setCapability(call.capability());
        entry.setCacheKey(call.cacheKey());
        entry.setResponse(response);
        entry.setModelTier(tier.name());
        entry.setHits(0);
        entry.setCreatedAt(OffsetDateTime.now());
        entry.setExpiresAt(OffsetDateTime.now().plusHours(CACHE_TTL_HOURS));
        cache.save(entry);
    }

    private void record(AiCall call, AiModelTier tier, int tokensIn, int tokensOut, int cost,
                        boolean cacheHit, boolean fallbackUsed, String state) {
        AiInvocation inv = new AiInvocation();
        inv.setId("AINV-" + shortId());
        inv.setWorkspaceId(call.workspaceId());
        inv.setUserId(call.userId());
        inv.setCapability(call.capability());
        inv.setModelTier(tier == null ? "NONE" : tier.name());
        inv.setPromptChars(call.prompt() == null ? 0 : call.prompt().length());
        inv.setTokensIn(tokensIn);
        inv.setTokensOut(tokensOut);
        inv.setCostCents(cost);
        inv.setCacheHit(cacheHit);
        inv.setFallbackUsed(fallbackUsed);
        inv.setPolicyState(state);
        inv.setStatus("OK");
        inv.setCreatedAt(OffsetDateTime.now());
        invocations.save(inv);
    }

    static String redact(String text) {
        if (text == null) {
            return null;
        }
        String r = EMAIL.matcher(text).replaceAll("[redacted-email]");
        return PHONE.matcher(r).replaceAll("[redacted-phone]");
    }

    private String cacheId(AiCall call) {
        if (call.cacheKey() == null || call.cacheKey().isBlank()) {
            return null;
        }
        String id = call.workspaceId() + ":" + call.capability() + ":" + Integer.toHexString(call.cacheKey().hashCode());
        return id.length() > 120 ? id.substring(0, 120) : id;
    }

    private static String currentPeriod() {
        return YearMonth.now().toString(); // YYYY-MM
    }

    private static String shortId() {
        return UUID.randomUUID().toString().substring(0, 12);
    }

    private static String nullIfBlank(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }

    private static String safeTier(String tier) {
        try {
            AiModelTier.valueOf(tier);
            return tier;
        } catch (Exception e) {
            return AiModelTier.NONE.name();
        }
    }
}
