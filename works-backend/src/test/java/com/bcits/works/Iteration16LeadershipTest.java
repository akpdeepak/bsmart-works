package com.bcits.works;
import com.bcits.works.security.EvidencePackageService;
import com.bcits.works.reporting.LeadershipService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Iteration 16 — pure-logic tests for the Leadership Console (Cap X) and Admin Operations Center
 * (Cap Y) deterministic helpers. These are the AI fallbacks and the scoring/allocation rules, so
 * they are unit-testable without a database (RB-10 §7).
 */
@Tag("unit")
class Iteration16LeadershipTest {

    // ── Resource allocation (Cap X) ──────────────────────────────────────────────
    @Test
    void allocationState_flagsOverAndUnderVsTeamMean() {
        assertThat(LeadershipService.allocationState(10, 4.0)).isEqualTo("OVER");   // >1.5× mean, ≥3 items
        assertThat(LeadershipService.allocationState(1, 6.0)).isEqualTo("UNDER");   // <0.5× mean
        assertThat(LeadershipService.allocationState(4, 4.0)).isEqualTo("BALANCED");
        assertThat(LeadershipService.allocationState(2, 0)).isEqualTo("BALANCED");  // no mean → balanced
    }

    // ── Risk portfolio (Cap X) ───────────────────────────────────────────────────
    @Test
    void riskScore_isImpactTimesProbabilityOnOneToThreeScale() {
        assertThat(LeadershipService.riskScore("High", "High")).isEqualTo(9);
        assertThat(LeadershipService.riskScore("Medium", "Low")).isEqualTo(2);
        assertThat(LeadershipService.riskScore(null, "Critical")).isEqualTo(3);
    }

    // ── Customer health (Cap X) ──────────────────────────────────────────────────
    @Test
    void healthScore_penalisesOverdueAndClampsToRange() {
        assertThat(LeadershipService.healthScore(5.0, 0, 0)).isEqualTo(100);
        assertThat(LeadershipService.healthScore(5.0, 10, 0)).isZero();      // heavy overdue penalty clamps at 0
        assertThat(LeadershipService.healthScore(0, 0, 0)).isEqualTo(70);    // no CSAT → neutral baseline
    }

    // ── Executive briefing fallback (Cap X) ──────────────────────────────────────
    @Test
    void renderBriefing_includesDeliveryAndRiskHeadlines() {
        Map<String, Object> rollup = Map.of("totals",
            Map.of("total", 40, "in_progress", 6, "overdue", 2, "unassigned", 1), "completionRate", 55);
        Map<String, Object> customers = Map.of("customers", List.of(), "atRiskCount", 0);
        Map<String, Object> risks = Map.of("risks", List.of(Map.of("score", 9, "title", "Vendor SLA gap")));
        String md = Iteration16AiService.renderBriefing("Delivery", rollup, customers, risks);
        assertThat(md).contains("40 work items", "55%", "Vendor SLA gap", "Focus: Delivery");
    }

    @Test
    void buildSlides_alwaysProducesOverviewAndRiskSlides() {
        Map<String, Object> rollup = Map.of("totals", Map.of("total", 10, "in_progress", 2, "overdue", 0), "completionRate", 80);
        List<Map<String, Object>> slides = Iteration16AiService.buildSlides("Q3",
            rollup, Map.of("themes", List.of()), Map.of("risks", List.of()));
        assertThat(slides).hasSize(4);
        assertThat(slides.get(0).get("title").toString()).contains("Q3");
        assertThat(Iteration16AiService.renderSlides(slides)).contains("Slide 1", "Top risks");
    }

    // ── License seats (Cap Y) ────────────────────────────────────────────────────
    @Test
    void renewalSoon_trueWithinThirtyDays() {
        assertThat(AdminOpsService.renewalSoon(LocalDate.now().plusDays(10))).isTrue();
        assertThat(AdminOpsService.renewalSoon(LocalDate.now().plusDays(60))).isFalse();
        assertThat(AdminOpsService.renewalSoon(null)).isFalse();
    }

    @Test
    void projectGrowth_growsActiveSeatsByHeadroom() {
        assertThat(AdminOpsService.projectGrowth(20)).isEqualTo(23); // 20 * 1.15
    }

    // ── Evidence package (Cap Y) ─────────────────────────────────────────────────
    @Test
    void renderBundle_evidencesAccessAuditAndAiControls() {
        Map<String, Object> controls = Map.of(
            "members", 10L, "mfaEnabled", 8L, "mfaAdoptionPercent", 80L,
            "auditEvents", 1200L, "slaPolicies", 3L, "complianceRules", 5L,
            "openViolations", 0L, "aiInvocations", 42L, "accessReviews", 2L);
        String md = EvidencePackageService.renderBundle("SOC2", controls);
        assertThat(md).contains("SOC2 evidence package", "MFA adoption: 80%",
            "Immutable audit events captured: 1200", "AI invocations audited", "crypto-shredded");
    }
}
