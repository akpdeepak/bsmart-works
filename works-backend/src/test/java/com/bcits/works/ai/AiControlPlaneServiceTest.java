package com.bcits.works.ai;

import com.bcits.works.AiCapabilities;
import com.bcits.works.shared.RateLimiter;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.mock;

/**
 * Behaviour of the AI Control Plane (RB-40 §2): scope resolution (most-restrictive-wins), the
 * budget thresholds (80% degrade, 100% disable), response caching, and the audit log. Pure unit
 * tests with mocked repositories — no Spring context, no database (RB-10 §7).
 */
@Tag("unit")
class AiControlPlaneServiceTest {

    private final AiPolicyRepository policies = mock(AiPolicyRepository.class);
    private final AiBudgetRepository budgets = mock(AiBudgetRepository.class);
    private final AiInvocationRepository invocations = mock(AiInvocationRepository.class);
    private final AiCacheEntryRepository cache = mock(AiCacheEntryRepository.class);
    private final AiProvider provider = mock(AiProvider.class);
    private final RateLimiter rateLimiter = new RateLimiter();

    private final AiControlPlaneService cp =
        new AiControlPlaneService(policies, budgets, invocations, cache, provider, rateLimiter);

    private static final String WS = "ws-1";
    private static final String USER = "user-1";

    private AiPolicy policy(String scope, String capability, String userId, boolean enabled) {
        AiPolicy p = new AiPolicy();
        p.setWorkspaceId(WS);
        p.setScopeType(scope);
        p.setCapability(capability);
        p.setUserId(userId);
        p.setEnabled(enabled);
        return p;
    }

    private void noPolicies() {
        when(policies.findByWorkspaceId(WS)).thenReturn(List.of());
    }

    private void emptyBudget() {
        when(budgets.findByWorkspaceIdAndPeriod(eq(WS), anyString())).thenReturn(Optional.empty());
    }

    // ── scope resolution ─────────────────────────────────────────────────────────

    @Test
    void resolve_enabledByDefaultWhenNoPolicies() {
        noPolicies();
        assertThat(cp.resolve(WS, AiCapabilities.TRIAGE, USER, true).enabled()).isTrue();
    }

    @Test
    void resolve_workspaceOffBeatsEverything() {
        when(policies.findByWorkspaceId(WS)).thenReturn(List.of(policy("WORKSPACE", null, null, false)));
        var r = cp.resolve(WS, AiCapabilities.TRIAGE, USER, true);
        assertThat(r.enabled()).isFalse();
        assertThat(r.state()).isEqualTo("DISABLED_WORKSPACE");
    }

    @Test
    void resolve_capabilityOffDisablesOnlyThatCapability() {
        when(policies.findByWorkspaceId(WS)).thenReturn(List.of(policy("CAPABILITY", AiCapabilities.TRIAGE, null, false)));
        assertThat(cp.resolve(WS, AiCapabilities.TRIAGE, USER, true).state()).isEqualTo("DISABLED_CAPABILITY");
        assertThat(cp.resolve(WS, AiCapabilities.ROUTING, USER, true).enabled()).isTrue();
    }

    @Test
    void resolve_userOffDisablesForThatUser() {
        when(policies.findByWorkspaceId(WS)).thenReturn(List.of(policy("USER", null, USER, false)));
        assertThat(cp.resolve(WS, AiCapabilities.TRIAGE, USER, true).state()).isEqualTo("DISABLED_USER");
        assertThat(cp.resolve(WS, AiCapabilities.TRIAGE, "someone-else", true).enabled()).isTrue();
    }

    @Test
    void resolve_inContextOffIsMostGranular() {
        noPolicies();
        assertThat(cp.resolve(WS, AiCapabilities.TRIAGE, USER, false).state()).isEqualTo("DISABLED_IN_CONTEXT");
    }

    // ── budget ───────────────────────────────────────────────────────────────────

    @Test
    void budgetStatus_defaultsWhenNoRow() {
        emptyBudget();
        var b = cp.budgetStatus(WS);
        assertThat(b.capCents()).isEqualTo(AiControlPlaneService.DEFAULT_CAP_CENTS);
        assertThat(b.spentCents()).isZero();
        assertThat(b.degraded()).isFalse();
        assertThat(b.disabled()).isFalse();
    }

    @Test
    void budgetStatus_degradesAt80AndDisablesAt100() {
        AiBudget eighty = budgetRow(10_000L, 8_000L);
        when(budgets.findByWorkspaceIdAndPeriod(eq(WS), anyString())).thenReturn(Optional.of(eighty));
        var d = cp.budgetStatus(WS);
        assertThat(d.percent()).isEqualTo(80);
        assertThat(d.degraded()).isTrue();
        assertThat(d.disabled()).isFalse();

        AiBudget full = budgetRow(10_000L, 10_000L);
        when(budgets.findByWorkspaceIdAndPeriod(eq(WS), anyString())).thenReturn(Optional.of(full));
        assertThat(cp.budgetStatus(WS).disabled()).isTrue();
    }

    private AiBudget budgetRow(long cap, long spent) {
        AiBudget b = new AiBudget();
        b.setWorkspaceId(WS);
        b.setMonthlyCapCents(cap);
        b.setSpentCents(spent);
        return b;
    }

    // ── invoke ───────────────────────────────────────────────────────────────────

    private AiControlPlaneService.AiCall call(String cacheKey, boolean inContext) {
        return new AiControlPlaneService.AiCall(WS, USER, AiCapabilities.GENERATION,
            "prompt with email a@b.com", "the draft", cacheKey, inContext);
    }

    @Test
    void invoke_disabledPolicyReturnsFallbackAndLogsIt() {
        when(policies.findByWorkspaceId(WS)).thenReturn(List.of(policy("WORKSPACE", null, null, false)));
        emptyBudget();

        var outcome = cp.invoke(call(null, true));

        assertThat(outcome.fallback()).isTrue();
        assertThat(outcome.policyState()).isEqualTo("DISABLED_WORKSPACE");
        verify(provider, never()).complete(any());
        verify(invocations).save(any(AiInvocation.class));  // the fallback is still audited
    }

    @Test
    void invoke_budgetExceededReturnsFallback() {
        noPolicies();
        when(budgets.findByWorkspaceIdAndPeriod(eq(WS), anyString())).thenReturn(Optional.of(budgetRow(100L, 100L)));

        var outcome = cp.invoke(call(null, true));

        assertThat(outcome.fallback()).isTrue();
        assertThat(outcome.policyState()).isEqualTo("BUDGET_EXCEEDED");
        verify(provider, never()).complete(any());
    }

    @Test
    void invoke_enabledCallsProviderRecordsAuditAndSpend() {
        noPolicies();
        emptyBudget();
        when(provider.complete(any())).thenReturn(new AiProvider.AiResult("done", AiModelTier.SONNET, 100, 2000));

        var outcome = cp.invoke(call(null, true));

        assertThat(outcome.usedAi()).isTrue();
        assertThat(outcome.fallback()).isFalse();
        assertThat(outcome.text()).isEqualTo("done");
        assertThat(outcome.costCents()).isPositive();      // SONNET on 2100 tokens > 0 cents
        verify(invocations).save(any(AiInvocation.class));
        verify(budgets).save(any(AiBudget.class));         // spend incremented
    }

    @Test
    void invoke_degradedForcesHaikuTier() {
        noPolicies();
        when(budgets.findByWorkspaceIdAndPeriod(eq(WS), anyString())).thenReturn(Optional.of(budgetRow(10_000L, 9_000L)));
        when(provider.complete(any())).thenAnswer(inv -> {
            AiProvider.AiRequest req = inv.getArgument(0);
            assertThat(req.tier()).isEqualTo(AiModelTier.HAIKU);   // forced down at 90%
            return new AiProvider.AiResult(req.draft(), req.tier(), 10, 10);
        });

        assertThat(cp.invoke(call(null, true)).policyState()).isEqualTo("DEGRADED");
    }

    @Test
    void invoke_redactsEmailFromPromptBeforeProvider() {
        noPolicies();
        emptyBudget();
        when(provider.complete(any())).thenAnswer(inv -> {
            AiProvider.AiRequest req = inv.getArgument(0);
            assertThat(req.prompt()).doesNotContain("a@b.com").contains("[redacted-email]");
            return new AiProvider.AiResult(req.draft(), req.tier(), 1, 1);
        });
        cp.invoke(call(null, true));
        verify(provider).complete(any());
    }

    @Test
    void invoke_cacheHitSkipsProviderAndSpend() {
        noPolicies();
        emptyBudget();
        AiCacheEntry entry = new AiCacheEntry();
        entry.setResponse("cached answer");
        entry.setModelTier("SONNET");
        entry.setHits(0);
        when(cache.findById(anyString())).thenReturn(Optional.of(entry));

        var outcome = cp.invoke(call("repeat-key", true));

        assertThat(outcome.cacheHit()).isTrue();
        assertThat(outcome.text()).isEqualTo("cached answer");
        verify(provider, never()).complete(any());
        verify(budgets, never()).save(any());     // no spend on a cache hit
        verify(cache).save(any(AiCacheEntry.class)); // hit count bumped
    }

    @Test
    void invoke_storesCacheEntryWhenKeyProvided() {
        noPolicies();
        emptyBudget();
        when(cache.findById(anyString())).thenReturn(Optional.empty());
        when(provider.complete(any())).thenReturn(new AiProvider.AiResult("fresh", AiModelTier.SONNET, 10, 10));

        cp.invoke(call("new-key", true));

        verify(cache).save(any(AiCacheEntry.class));
    }

    @Test
    void invoke_expiredCacheEntryTreatedAsMiss() {
        noPolicies();
        emptyBudget();
        AiCacheEntry stale = new AiCacheEntry();
        stale.setResponse("old answer");
        stale.setModelTier("SONNET");
        stale.setHits(1);
        stale.setExpiresAt(java.time.OffsetDateTime.now().minusHours(1));  // expired
        when(cache.findById(anyString())).thenReturn(Optional.of(stale));
        when(provider.complete(any())).thenReturn(new AiProvider.AiResult("new answer", AiModelTier.SONNET, 10, 10));

        var outcome = cp.invoke(call("stale-key", true));

        assertThat(outcome.cacheHit()).isFalse();
        assertThat(outcome.text()).isEqualTo("new answer");
        verify(provider).complete(any());
    }

    @Test
    void invoke_userRateLimitExceededReturnsFallback() {
        noPolicies();
        emptyBudget();
        // Exhaust the per-user rate limit by driving the real RateLimiter past the threshold.
        String rlKey = "ai:" + WS + ":" + USER;
        for (int i = 0; i < AiControlPlaneService.USER_RATE_LIMIT; i++) {
            rateLimiter.allow(rlKey, AiControlPlaneService.USER_RATE_LIMIT, AiControlPlaneService.USER_RATE_WINDOW_SECONDS);
        }

        var outcome = cp.invoke(call(null, true));

        assertThat(outcome.fallback()).isTrue();
        assertThat(outcome.policyState()).isEqualTo("RATE_LIMITED_USER");
        verify(provider, never()).complete(any());
        verify(invocations).save(any(AiInvocation.class));  // rate-limited invocations are still audited
    }

    // ── policy / budget management ────────────────────────────────────────────────

    @Test
    void setPolicy_insertsThenUpdatesSameScope() {
        when(policies.findByWorkspaceId(WS)).thenReturn(List.of());
        when(policies.save(any(AiPolicy.class))).thenAnswer(i -> i.getArgument(0));

        AiPolicy created = cp.setPolicy(WS, "CAPABILITY", AiCapabilities.TRIAGE, null, false);
        assertThat(created.getId()).startsWith("AIP-");
        assertThat(created.getEnabled()).isFalse();

        // Existing row of the same scope is updated, not duplicated.
        when(policies.findByWorkspaceId(WS)).thenReturn(List.of(created));
        AiPolicy updated = cp.setPolicy(WS, "CAPABILITY", AiCapabilities.TRIAGE, null, true);
        assertThat(updated.getId()).isEqualTo(created.getId());
        assertThat(updated.getEnabled()).isTrue();
        verify(policies, times(2)).save(any(AiPolicy.class));
    }

    @Test
    void setBudgetCap_createsRowWhenAbsent() {
        emptyBudget();
        when(budgets.save(any(AiBudget.class))).thenAnswer(i -> i.getArgument(0));
        AiBudget b = cp.setBudgetCap(WS, 5000L);
        assertThat(b.getMonthlyCapCents()).isEqualTo(5000L);
        assertThat(b.getId()).startsWith("AIB-");
    }

    @Test
    void redact_handlesNullAndStripsPhone() {
        assertThat(AiControlPlaneService.redact(null)).isNull();
        assertThat(AiControlPlaneService.redact("call +91 98765 43210 now")).contains("[redacted-phone]");
    }
}
