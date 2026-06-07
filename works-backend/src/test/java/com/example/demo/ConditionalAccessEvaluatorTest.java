package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Conditional-access decision logic (iteration 19 Cap T, RB-40 §4). */
@Tag("unit")
class ConditionalAccessEvaluatorTest {

    private ConditionalAccessPolicy policy(String ip, String geo, boolean deviceTrust,
                                           Integer start, Integer end) {
        ConditionalAccessPolicy p = new ConditionalAccessPolicy();
        p.setName("test");
        p.setEnabled(true);
        p.setIpAllowlist(ip);
        p.setGeoAllowlist(geo);
        p.setRequireDeviceTrust(deviceTrust);
        p.setAllowedStartMinute(start);
        p.setAllowedEndMinute(end);
        return p;
    }

    private ConditionalAccessEvaluator.AccessContext ctx(String ip, String country,
                                                         boolean trusted, int minute) {
        return new ConditionalAccessEvaluator.AccessContext(ip, country, trusted, minute);
    }

    // ── IP / CIDR ──────────────────────────────────────────────────────────────────────────────

    @Test
    void blankIpAllowlistAllowsAny() {
        assertThat(ConditionalAccessEvaluator.ipAllowed("", "8.8.8.8")).isTrue();
        assertThat(ConditionalAccessEvaluator.ipAllowed(null, "8.8.8.8")).isTrue();
    }

    @Test
    void cidrMatching() {
        assertThat(ConditionalAccessEvaluator.ipAllowed("10.0.0.0/8", "10.3.4.5")).isTrue();
        assertThat(ConditionalAccessEvaluator.ipAllowed("10.0.0.0/8", "11.0.0.1")).isFalse();
        assertThat(ConditionalAccessEvaluator.ipAllowed("203.0.113.0/24", "203.0.113.42")).isTrue();
        assertThat(ConditionalAccessEvaluator.ipAllowed("203.0.113.0/24", "203.0.114.1")).isFalse();
    }

    @Test
    void singleIpAndMultipleEntries() {
        assertThat(ConditionalAccessEvaluator.ipAllowed("1.2.3.4, 10.0.0.0/8", "1.2.3.4")).isTrue();
        assertThat(ConditionalAccessEvaluator.ipAllowed("1.2.3.4, 10.0.0.0/8", "10.9.9.9")).isTrue();
        assertThat(ConditionalAccessEvaluator.ipAllowed("1.2.3.4", "1.2.3.5")).isFalse();
    }

    // ── Geo ──────────────────────────────────────────────────────────────────────────────────

    @Test
    void geoMatchingIsCaseInsensitive() {
        assertThat(ConditionalAccessEvaluator.geoAllowed("IN,US", "in")).isTrue();
        assertThat(ConditionalAccessEvaluator.geoAllowed("IN,US", "SG")).isFalse();
        assertThat(ConditionalAccessEvaluator.geoAllowed("", "SG")).isTrue();
    }

    // ── Time window ────────────────────────────────────────────────────────────────────────────

    @Test
    void timeWindowSameDay() {
        assertThat(ConditionalAccessEvaluator.timeAllowed(360, 1320, 600)).isTrue();   // 10:00 in 06–22
        assertThat(ConditionalAccessEvaluator.timeAllowed(360, 1320, 60)).isFalse();   // 01:00 out
    }

    @Test
    void timeWindowWrappingMidnight() {
        // 22:00–06:00
        assertThat(ConditionalAccessEvaluator.timeAllowed(1320, 360, 60)).isTrue();    // 01:00 in
        assertThat(ConditionalAccessEvaluator.timeAllowed(1320, 360, 720)).isFalse();  // 12:00 out
    }

    @Test
    void nullWindowAllowsAnyTime() {
        assertThat(ConditionalAccessEvaluator.timeAllowed(null, null, 123)).isTrue();
    }

    // ── Whole-policy evaluation ──────────────────────────────────────────────────────────────────

    @Test
    void disabledPolicyAlwaysAllows() {
        ConditionalAccessPolicy p = policy("10.0.0.0/8", "IN", true, null, null);
        p.setEnabled(false);
        assertThat(ConditionalAccessEvaluator.evaluate(p, ctx("8.8.8.8", "US", false, 0)).allowed())
                .isTrue();
    }

    @Test
    void deniesOnFirstFailedDimension() {
        ConditionalAccessPolicy p = policy("10.0.0.0/8", "IN", true, 360, 1320);
        // IP out of range → denied, with a reason.
        ConditionalAccessEvaluator.Decision d =
                ConditionalAccessEvaluator.evaluate(p, ctx("8.8.8.8", "IN", true, 600));
        assertThat(d.allowed()).isFalse();
        assertThat(d.reason()).contains("8.8.8.8");
    }

    @Test
    void deviceTrustRequired() {
        ConditionalAccessPolicy p = policy("", "", true, null, null);
        assertThat(ConditionalAccessEvaluator.evaluate(p, ctx("8.8.8.8", "IN", false, 0)).allowed())
                .isFalse();
        assertThat(ConditionalAccessEvaluator.evaluate(p, ctx("8.8.8.8", "IN", true, 0)).allowed())
                .isTrue();
    }

    @Test
    void evaluateAllPassesWhenEveryPolicyAllows() {
        List<ConditionalAccessPolicy> policies = List.of(
                policy("10.0.0.0/8", "", false, null, null),
                policy("", "IN", false, 360, 1320));
        ConditionalAccessEvaluator.Decision d = ConditionalAccessEvaluator.evaluateAll(
                policies, ctx("10.1.2.3", "IN", false, 600));
        assertThat(d.allowed()).isTrue();
    }

    @Test
    void evaluateAllDeniesIfAnyPolicyDenies() {
        List<ConditionalAccessPolicy> policies = List.of(
                policy("10.0.0.0/8", "", false, null, null),
                policy("", "IN", false, null, null));
        ConditionalAccessEvaluator.Decision d = ConditionalAccessEvaluator.evaluateAll(
                policies, ctx("10.1.2.3", "SG", false, 600));
        assertThat(d.allowed()).isFalse();
    }
}
