package com.bcits.works.reporting;
import com.bcits.works.security.EvidencePackageService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Iteration 16 — pure-logic tests for the Leadership Console (Cap X) deterministic helpers: the
 * AI fallbacks and the scoring/allocation rules, unit-testable without a database (RB-10 §7).
 *
 * <p>The Cap Y licence-seat cases moved to {@code AdminOpsServiceSeatsTest} when Cap X's helpers
 * were carved into this module and {@code AdminOpsService} stayed at the flat root (GH-537).
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
