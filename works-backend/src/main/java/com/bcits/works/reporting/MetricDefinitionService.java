package com.bcits.works.reporting;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.BqlCompiler;
import com.bcits.works.shared.BqlContext;
import com.bcits.works.shared.BqlException;
import com.bcits.works.shared.BqlFieldRegistry;
import com.bcits.works.shared.RbacGate;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * The metric metadata store and its field-level-security gate — the catalog, custom definitions,
 * immutable snapshots, and voluntary shares — carved out of {@link KpiService} (RB-10 §2, one job
 * per layer). {@code KpiService} keeps the computation engine (the layered metric aggregation) and
 * delegates the FLS context, the definition list, and the sharing rule here.
 *
 * <p>Field-level security (RB-40 §1, spec 06 §5.5) lives here as the single gate: a custom metric may
 * never become a back-door into a sensitive field a lower-tier caller cannot see. Behaviour is
 * preserved verbatim from the pre-split {@code KpiService}.
 */
@Service
public class MetricDefinitionService {

    /**
     * Tier at/above which leadership-sensitive fields (e.g. {@code businessValue}) are visible —
     * the same field-level-security convention BQL uses ({@code BqlController.SENSITIVE_FIELD_MIN_TIER}),
     * reused here so a custom metric can never become a back-door into a sensitive field a lower-tier
     * caller may not see (RB-40 §1, spec 06 §5.5).
     */
    static final int SENSITIVE_FIELD_MIN_TIER = 3; // LEAD+

    /** Sentinel caller for trusted backend jobs (no human user) — full field visibility (RB-40 §1). */
    public static final String SYSTEM_CALLER = "__system__";

    private final MetricDefinitionRepository definitions;
    private final MetricSnapshotRepository snapshots;
    private final MetricShareRepository shares;
    private final BqlCompiler bqlCompiler;
    private final RbacGate rbac;

    public MetricDefinitionService(MetricDefinitionRepository definitions,
                                   MetricSnapshotRepository snapshots,
                                   MetricShareRepository shares,
                                   BqlCompiler bqlCompiler,
                                   RbacGate rbac) {
        this.definitions = definitions;
        this.snapshots = snapshots;
        this.shares = shares;
        this.bqlCompiler = bqlCompiler;
        this.rbac = rbac;
    }

    // ── Field-level security (RB-40 §1) — the single gate ──────────────────────────

    /** True when the caller's workspace tier may see leadership-sensitive fields (field-level security). */
    private boolean canSeeSensitive(String workspaceId, String userId) {
        if (SYSTEM_CALLER.equals(userId)) {
            return true; // trusted backend job, no human caller
        }
        return userId != null && rbac.getUserTier(userId, workspaceId) >= SENSITIVE_FIELD_MIN_TIER;
    }

    /** The caller's BQL field-visibility context — reused by the KPI engine when it runs custom metrics. */
    public BqlContext fieldContext(String workspaceId, String callerId) {
        return BqlContext.forUser(callerId, canSeeSensitive(workspaceId, callerId));
    }

    /**
     * Does this definition reference any field the caller's tier may not see? A custom metric carries
     * field references in two places — its {@code sourceField} (built-in column alias) and its
     * {@code bqlFormula} (a BQL expression). Both are resolved through the closed
     * {@link BqlFieldRegistry} allow-list under the caller's field-security context; if either touches
     * a sensitive field the caller cannot see, the metric is field-restricted (RB-40 §1).
     */
    public boolean referencesForbiddenField(MetricDefinition def, BqlContext ctx) {
        String src = def.getSourceField();
        if (src != null && !src.isBlank()) {
            try {
                BqlFieldRegistry.resolve(src, ctx);
            } catch (BqlException e) {
                // Unknown source fields are tolerated (custom catalog keys); only a *forbidden*
                // (sensitive, gated) field restricts the metric.
                if (e.getMessage() != null && e.getMessage().startsWith("Field not permitted")) {
                    return true;
                }
            }
        }
        String formula = def.getBqlFormula();
        if (formula != null && !formula.isBlank()) {
            try {
                bqlCompiler.compileFor(formula, ctx);
            } catch (BqlException e) {
                if (e.getMessage() != null && e.getMessage().startsWith("Field not permitted")) {
                    return true;
                }
                // A malformed formula is not a field-security failure — leave it to the compile path.
            }
        }
        return false;
    }

    // ── Metric definitions (catalog + custom, safe formula builder) ────────────────

    public List<Map<String, Object>> catalog() {
        return MetricCatalog.all().stream().map(m -> Map.<String, Object>of(
            "key", m.key(), "label", m.label(), "primitive", m.primitive(), "unit", m.unit(),
            "scopeLevel", m.scopeLevel(), "higherIsBetter", m.higherIsBetter(),
            "privateByDefault", m.privateByDefault())).collect(Collectors.toList());
    }

    /**
     * Metric definitions visible to the caller. Field-level security (RB-40 §1): a definition built
     * over a sensitive field (its {@code sourceField} or {@code bqlFormula}) is filtered out for a
     * caller whose tier is below {@link #SENSITIVE_FIELD_MIN_TIER} — listing must not leak the
     * existence of sensitive-field-based metrics to low-tier callers.
     */
    public List<MetricDefinition> listDefinitions(String workspaceId, String callerId) {
        BqlContext ctx = fieldContext(workspaceId, callerId);
        return definitions.findByWorkspaceIdOrderByNameAsc(workspaceId).stream()
            .filter(d -> !referencesForbiddenField(d, ctx))
            .collect(Collectors.toList());
    }

    @Transactional
    public MetricDefinition createDefinition(String workspaceId, String creatorId, MetricDefinition def) {
        // Safe formula + privacy validation: custom metrics aggregate only, never INDIVIDUAL.
        MetricFormula.validateDefinition(def.getPrimitive(), def.getScopeLevel());
        // Field-level security (RB-40 §1): a creator may not define a metric over a sensitive field
        // their own tier cannot see — that would launder a forbidden field into an aggregate they
        // (and every lower tier) can then read.
        BqlContext ctx = fieldContext(workspaceId, creatorId);
        if (referencesForbiddenField(def, ctx)) {
            throw ApiException.forbidden(
                "This metric references a field your role is not permitted to query "
                + "(field-level security, RB-40 §1).");
        }
        def.setId("MD-" + shortId());
        def.setWorkspaceId(workspaceId);
        def.setPrimitive(MetricFormula.normalizePrimitive(def.getPrimitive()));
        def.setScopeLevel(MetricFormula.normalizeScope(def.getScopeLevel()));
        def.setBuiltIn(false);
        def.setCreatedBy(creatorId);
        OffsetDateTime now = OffsetDateTime.now();
        def.setCreatedAt(now);
        def.setUpdatedAt(now);
        return definitions.save(def);
    }

    // ── Immutable snapshots ────────────────────────────────────────────────────────

    @Transactional
    public MetricSnapshot snapshot(String workspaceId, String metricKey, String scopeLevel,
                                   String scopeId, String period, double value, int sampleSize) {
        MetricSnapshot s = new MetricSnapshot();
        s.setId("MS-" + shortId());
        s.setWorkspaceId(workspaceId);
        s.setMetricKey(metricKey);
        s.setScopeLevel(scopeLevel);
        s.setScopeId(scopeId);
        s.setPeriod(period);
        s.setValue(value);
        s.setSampleSize(sampleSize);
        s.setCreatedAt(OffsetDateTime.now());
        return snapshots.save(s);
    }

    public List<MetricSnapshot> history(String workspaceId, String metricKey, String scopeLevel, String scopeId) {
        return snapshots.findByWorkspaceIdAndMetricKeyAndScopeLevelAndScopeIdOrderByPeriodAsc(
            workspaceId, metricKey, scopeLevel, scopeId == null ? "" : scopeId);
    }

    // ── Voluntary sharing ──────────────────────────────────────────────────────────

    @Transactional
    public MetricShare share(String workspaceId, String ownerId, String viewerId) {
        if (ownerId.equals(viewerId)) {
            throw ApiException.badRequest("INVALID_SHARE", "You already see your own metrics.");
        }
        MetricShare existing = shares.findByWorkspaceIdAndOwnerUserIdAndViewerUserId(workspaceId, ownerId, viewerId)
            .orElse(null);
        if (existing != null) {
            return existing;
        }
        MetricShare s = new MetricShare();
        s.setId("MSH-" + shortId());
        s.setWorkspaceId(workspaceId);
        s.setOwnerUserId(ownerId);
        s.setViewerUserId(viewerId);
        s.setCreatedAt(OffsetDateTime.now());
        return shares.save(s);
    }

    @Transactional
    public void unshare(String workspaceId, String ownerId, String viewerId) {
        shares.findByWorkspaceIdAndOwnerUserIdAndViewerUserId(workspaceId, ownerId, viewerId)
            .ifPresent(shares::delete);
    }

    public List<MetricShare> sharesByOwner(String workspaceId, String ownerId) {
        return shares.findByWorkspaceIdAndOwnerUserId(workspaceId, ownerId);
    }

    /**
     * Enforces that {@code viewerId} may see {@code ownerId}'s individual metrics — the API-level
     * guarantee that managers cannot drill into individuals unless the owner voluntarily shared
     * (RB-40 §1). Called by the KPI engine's personal view.
     */
    public void requireShared(String workspaceId, String ownerId, String viewerId) {
        boolean shared = shares.findByWorkspaceIdAndOwnerUserIdAndViewerUserId(workspaceId, ownerId, viewerId).isPresent();
        if (!shared) {
            throw ApiException.forbidden(
                "Individual metrics are private. Managers cannot drill into individuals; the owner "
                + "must voluntarily share them (RB-40 §1).");
        }
    }

    private static String shortId() {
        return UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}
