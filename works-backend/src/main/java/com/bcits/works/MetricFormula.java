package com.bcits.works;

import com.bcits.works.shared.ApiException;

import java.util.List;
import java.util.Set;

/**
 * The safe formula builder for KPI metrics (iteration 12, Cap L). Metrics are composed from a small,
 * fixed set of aggregate primitives — never raw SQL — so a custom metric can neither inject SQL nor
 * expose row-level (per-individual) data. {@link #validateDefinition} additionally forbids custom
 * metrics from targeting the INDIVIDUAL scope, which is the privacy guardrail (RB-40 §1): aggregate
 * metrics can never become a back-door into one person's numbers.
 *
 * <p>Pure and static — unit-testable in isolation and reused as the deterministic computation core.
 */
public final class MetricFormula {

    private MetricFormula() { }

    public static final Set<String> PRIMITIVES = Set.of("SUM", "AVG", "PERCENTILE", "COUNT", "RATIO");
    public static final Set<String> CUSTOM_SCOPES = Set.of("TEAM", "PROJECT", "ORG");
    public static final Set<String> ALL_SCOPES = Set.of("TEAM", "PROJECT", "ORG", "INDIVIDUAL", "MANAGER");

    public static boolean isPrimitive(String primitive) {
        return primitive != null && PRIMITIVES.contains(primitive.trim().toUpperCase());
    }

    public static String normalizePrimitive(String primitive) {
        return isPrimitive(primitive) ? primitive.trim().toUpperCase() : "AVG";
    }

    public static String normalizeScope(String scope) {
        if (scope == null) {
            return "TEAM";
        }
        String s = scope.trim().toUpperCase();
        return ALL_SCOPES.contains(s) ? s : "TEAM";
    }

    /**
     * Validate a custom metric definition. Throws {@link ApiException} (400) when the primitive is
     * unknown or the scope is INDIVIDUAL — a custom metric may only aggregate at TEAM/PROJECT/ORG so
     * it can never expose an individual's data (RB-40 §1, commitment 4).
     */
    public static void validateDefinition(String primitive, String scopeLevel) {
        if (!isPrimitive(primitive)) {
            throw ApiException.badRequest("INVALID_PRIMITIVE",
                "primitive must be one of SUM, AVG, PERCENTILE, COUNT, RATIO.", "primitive");
        }
        String s = scopeLevel == null ? "" : scopeLevel.trim().toUpperCase();
        if (!CUSTOM_SCOPES.contains(s)) {
            throw ApiException.badRequest("INVALID_SCOPE",
                "Custom metrics must aggregate at TEAM, PROJECT or ORG — never INDIVIDUAL "
                + "(privacy by design, RB-40 §1).", "scopeLevel");
        }
    }

    // ── The aggregate primitives ────────────────────────────────────────────────

    public static double sum(List<Double> values) {
        return values == null ? 0 : values.stream().filter(java.util.Objects::nonNull).mapToDouble(Double::doubleValue).sum();
    }

    public static double avg(List<Double> values) {
        List<Double> v = nonNull(values);
        return v.isEmpty() ? 0 : sum(v) / v.size();
    }

    public static long count(List<Double> values) {
        return nonNull(values).size();
    }

    /** ratio = numerator / denominator as a percentage (0 when denominator is 0). */
    public static double ratio(double numerator, double denominator) {
        return denominator == 0 ? 0 : round1((numerator / denominator) * 100.0);
    }

    /** Nearest-rank percentile (p in [0,100]) over the values; 0 for an empty series. */
    public static double percentile(List<Double> values, double p) {
        List<Double> v = nonNull(values).stream().sorted().toList();
        if (v.isEmpty()) {
            return 0;
        }
        double clamped = Math.max(0, Math.min(100, p));
        int rank = (int) Math.ceil((clamped / 100.0) * v.size());
        int idx = Math.max(0, Math.min(v.size() - 1, rank - 1));
        return round1(v.get(idx));
    }

    public static double median(List<Double> values) {
        return percentile(values, 50);
    }

    public static double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    /** Apply a primitive by name to a values series (PERCENTILE defaults to P50). */
    public static double apply(String primitive, List<Double> values) {
        return switch (normalizePrimitive(primitive)) {
            case "SUM" -> round1(sum(values));
            case "COUNT" -> count(values);
            case "PERCENTILE" -> percentile(values, 85);
            case "RATIO" -> avg(values); // ratio needs two args; AVG is the safe single-series fallback
            default -> round1(avg(values));
        };
    }

    private static List<Double> nonNull(List<Double> values) {
        return values == null ? List.of()
            : values.stream().filter(java.util.Objects::nonNull).toList();
    }
}
