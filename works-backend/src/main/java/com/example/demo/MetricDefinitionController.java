package com.example.demo;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Metric definitions (iteration 12, Cap L) — the default catalog and the custom metric builder.
 * Workspace-scoped CRUD plus clone-from-default-catalog. RBAC lives in the service boundary
 * (RB-10 §2): reading the catalog needs workspace membership; defining or editing a custom metric
 * needs {@code manage_metrics}. Definitions use only safe formula primitives — validated by
 * {@link MetricFormulaService}, never raw SQL — and every mutation is recorded as an event (RB-10 §3).
 */
@RestController
@RequestMapping("/api/v1/metrics/definitions")
public class MetricDefinitionController {

    private final MetricDefinitionRepository definitions;
    private final MetricFormulaService formula;
    private final KpiService kpi;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public MetricDefinitionController(MetricDefinitionRepository definitions, MetricFormulaService formula,
                                      KpiService kpi, EventService eventService,
                                      AuthenticatedUser authenticatedUser, RbacService rbac) {
        this.definitions = definitions;
        this.formula = formula;
        this.kpi = kpi;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    /** The effective catalog for a workspace (its custom metrics + the default catalog it inherits). */
    @GetMapping
    public List<MetricDefinition> list(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        return kpi.catalog(workspaceId);
    }

    /** The seeded global default catalog (read-only templates). */
    @GetMapping("/defaults")
    public List<MetricDefinition> defaults() {
        return definitions.findByWorkspaceIdIsNullOrderByNameAsc();
    }

    @GetMapping("/{id}")
    public MetricDefinition get(@PathVariable String id) {
        MetricDefinition def = load(id);
        if (def.getWorkspaceId() != null) {
            rbac.require(authenticatedUser.id(), def.getWorkspaceId(), "view_items");
        }
        return def;
    }

    @PostMapping
    public MetricDefinition create(@Valid @RequestBody MetricDefinition def) {
        String userId = authenticatedUser.id();
        if (def.getWorkspaceId() == null || def.getWorkspaceId().isBlank()) {
            throw ApiException.badRequest("WORKSPACE_REQUIRED", "workspaceId is required.");
        }
        String workspaceId = def.getWorkspaceId();
        rbac.require(userId, workspaceId, "manage_metrics");
        formula.validate(def);
        requireUniqueKey(workspaceId, def.getMetricKey());
        MetricDefinition saved = definitions.save(formula.prepareNew(def, workspaceId, userId));
        eventService.record(saved.getId(), "METRIC_DEFINITION_CREATED", userId,
            Map.of("key", safe(saved.getMetricKey()), "workspaceId", safe(workspaceId)));
        return saved;
    }

    /** Clone a default-catalog metric into the workspace so it can be customized. */
    @PostMapping("/from-default/{defaultId}")
    public MetricDefinition cloneDefault(@PathVariable String defaultId, @RequestParam String workspaceId) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_metrics");
        MetricDefinition tpl = load(defaultId);
        if (tpl.getWorkspaceId() != null) {
            throw ApiException.badRequest("NOT_A_DEFAULT", defaultId + " is not a default-catalog metric.");
        }
        requireUniqueKey(workspaceId, tpl.getMetricKey());
        MetricDefinition copy = new MetricDefinition();
        copy.setMetricKey(tpl.getMetricKey());
        copy.setName(tpl.getName());
        copy.setDescription(tpl.getDescription());
        copy.setCategory(tpl.getCategory());
        copy.setAggregation(tpl.getAggregation());
        copy.setSource(tpl.getSource());
        copy.setUnit(tpl.getUnit());
        copy.setPercentile(tpl.getPercentile());
        copy.setHigherIsBetter(tpl.getHigherIsBetter());
        copy.setMinLayer(tpl.getMinLayer());
        MetricDefinition saved = definitions.save(formula.prepareNew(copy, workspaceId, userId));
        eventService.record(saved.getId(), "METRIC_DEFINITION_CREATED", userId,
            Map.of("key", safe(saved.getMetricKey()), "fromDefault", defaultId));
        return saved;
    }

    @PutMapping("/{id}")
    public MetricDefinition update(@PathVariable String id, @Valid @RequestBody MetricDefinition updated) {
        String userId = authenticatedUser.id();
        MetricDefinition existing = load(id);
        if (existing.getWorkspaceId() == null) {
            throw ApiException.badRequest("DEFAULT_IMMUTABLE",
                "Default-catalog metrics cannot be edited. Clone it into your workspace first.");
        }
        rbac.require(userId, existing.getWorkspaceId(), "manage_metrics");
        MetricDefinition merged = formula.applyUpdate(existing, updated);
        formula.validate(merged);
        MetricDefinition saved = definitions.save(merged);
        eventService.record(saved.getId(), "METRIC_DEFINITION_UPDATED", userId,
            Map.of("key", safe(saved.getMetricKey())));
        return saved;
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        String userId = authenticatedUser.id();
        MetricDefinition existing = load(id);
        if (existing.getWorkspaceId() == null) {
            throw ApiException.badRequest("DEFAULT_IMMUTABLE", "Default-catalog metrics cannot be deleted.");
        }
        rbac.require(userId, existing.getWorkspaceId(), "manage_metrics");
        definitions.deleteById(id);
        eventService.record(id, "METRIC_DEFINITION_DELETED", userId, Map.of("key", safe(existing.getMetricKey())));
        return ResponseEntity.noContent().build();
    }

    private void requireUniqueKey(String workspaceId, String key) {
        definitions.findByWorkspaceIdAndMetricKey(workspaceId, key).ifPresent(d -> {
            throw ApiException.conflict("A metric with key '" + key + "' already exists in this workspace.");
        });
    }

    private MetricDefinition load(String id) {
        return definitions.findById(id).orElseThrow(() -> ApiException.notFound("Metric definition", id));
    }

    private String safe(String s) { return s == null ? "" : s; }
}
