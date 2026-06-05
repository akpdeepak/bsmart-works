package com.example.demo;

import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.Set;
import java.util.UUID;

/**
 * Pure field-level logic for metric definitions (iteration 12, Cap L) — the <em>safe formula
 * builder</em>. Custom metrics are composed from a fixed set of aggregation primitives (sum, avg,
 * percentile, count, ratio), never raw SQL (RB-10 §6 — no capability invents its own query syntax),
 * and validation rejects anything that would violate the privacy model. No I/O, so it is unit-testable
 * in isolation (mirrors {@link ComplianceRuleService}); persistence/RBAC live in the controller.
 */
@Service
public class MetricFormulaService {

    static final Set<String> AGGREGATIONS = Set.of("SUM", "AVG", "PERCENTILE", "COUNT", "RATIO");
    static final Set<String> CATEGORIES   = Set.of("FLOW", "THROUGHPUT", "PREDICTABILITY", "QUALITY");
    static final Set<String> UNITS        = Set.of("count", "hours", "days", "points", "percent");
    static final Set<String> MIN_LAYERS   = Set.of("PERSONAL", "TEAM");

    public String normalizeAggregation(String v) {
        if (v == null) return "AVG";
        String s = v.trim().toUpperCase();
        return AGGREGATIONS.contains(s) ? s : "AVG";
    }

    public String normalizeCategory(String v) {
        if (v == null) return "FLOW";
        String s = v.trim().toUpperCase();
        return CATEGORIES.contains(s) ? s : "FLOW";
    }

    public String normalizeUnit(String v) {
        if (v == null) return "count";
        String s = v.trim().toLowerCase();
        return UNITS.contains(s) ? s : "count";
    }

    public String normalizeMinLayer(String v) {
        if (v == null) return "TEAM";
        String s = v.trim().toUpperCase();
        return MIN_LAYERS.contains(s) ? s : "TEAM";
    }

    /**
     * Validate that a definition is well-formed and privacy-safe; throws {@link ApiException} on
     * violation. A PERCENTILE metric needs a percentile in 1..99; the source must be a non-blank key
     * (the engine maps it to a computation). Raw SQL is impossible here — the only knobs are the
     * enumerated primitives — which is itself the privacy guarantee for the custom builder.
     */
    public void validate(MetricDefinition def) {
        if (def.getMetricKey() == null || def.getMetricKey().isBlank()) {
            throw ApiException.badRequest("METRIC_KEY_REQUIRED", "A metric needs a key.");
        }
        if (!def.getMetricKey().matches("[a-z0-9_]{2,80}")) {
            throw ApiException.badRequest("INVALID_METRIC_KEY",
                "Metric key must be lower_snake_case (a-z, 0-9, _), 2-80 chars.", "metricKey");
        }
        if (def.getSource() == null || def.getSource().isBlank()) {
            throw ApiException.badRequest("METRIC_SOURCE_REQUIRED",
                "A metric needs a computation source.", "source");
        }
        String agg = normalizeAggregation(def.getAggregation());
        if ("PERCENTILE".equals(agg)) {
            Integer p = def.getPercentile();
            if (p == null || p < 1 || p > 99) {
                throw ApiException.badRequest("INVALID_PERCENTILE",
                    "A percentile metric needs a percentile between 1 and 99.", "percentile");
            }
        }
    }

    /** Stamp a new (workspace-owned) definition with id, normalized primitives and timestamps. */
    public MetricDefinition prepareNew(MetricDefinition def, String workspaceId, String creatorId) {
        def.setId("MD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        def.setWorkspaceId(workspaceId);
        def.setCreatedBy(creatorId);
        def.setMetricKey(def.getMetricKey() == null ? null : def.getMetricKey().trim().toLowerCase());
        def.setAggregation(normalizeAggregation(def.getAggregation()));
        def.setCategory(normalizeCategory(def.getCategory()));
        def.setUnit(normalizeUnit(def.getUnit()));
        def.setMinLayer(normalizeMinLayer(def.getMinLayer()));
        def.setHigherIsBetter(def.getHigherIsBetter() == null ? Boolean.TRUE : def.getHigherIsBetter());
        def.setIsDefault(Boolean.FALSE);      // user-built metrics are never default-catalog
        def.setActive(def.getActive() == null ? Boolean.TRUE : def.getActive());
        OffsetDateTime now = OffsetDateTime.now();
        def.setCreatedAt(now);
        def.setUpdatedAt(now);
        return def;
    }

    /** Copy editable fields from {@code updated} onto {@code existing}; key/workspace are immutable. */
    public MetricDefinition applyUpdate(MetricDefinition existing, MetricDefinition updated) {
        if (updated.getName() != null)        existing.setName(updated.getName());
        if (updated.getDescription() != null) existing.setDescription(updated.getDescription());
        if (updated.getCategory() != null)    existing.setCategory(normalizeCategory(updated.getCategory()));
        if (updated.getAggregation() != null) existing.setAggregation(normalizeAggregation(updated.getAggregation()));
        if (updated.getSource() != null)      existing.setSource(updated.getSource());
        if (updated.getUnit() != null)        existing.setUnit(normalizeUnit(updated.getUnit()));
        if (updated.getMinLayer() != null)    existing.setMinLayer(normalizeMinLayer(updated.getMinLayer()));
        existing.setPercentile(updated.getPercentile());
        if (updated.getHigherIsBetter() != null) existing.setHigherIsBetter(updated.getHigherIsBetter());
        if (updated.getActive() != null)      existing.setActive(updated.getActive());
        existing.setUpdatedAt(OffsetDateTime.now());
        return existing;
    }
}
