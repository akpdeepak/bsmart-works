package com.bcits.works;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * The closed allow-list of BQL fields on {@code work_items}. Replaces the former open-default
 * pass-through in {@code BqlCompiler.field()} (RB-40 §1: field access must be an allow-list, not a
 * denylist). Aliases are matched case-insensitively; both the friendly alias ({@code assignee}) and
 * the raw column ({@code assignee_id}) resolve to the same field.
 *
 * <p>Fields flagged {@link BqlField#sensitive()} are only queryable by users who pass the
 * sensitivity gate (see {@link BqlContext}); for everyone else, referencing one is rejected at
 * compile time — the predicate never reaches SQL.
 */
public final class BqlFieldRegistry {

    private static final Map<String, BqlField> BY_ALIAS = new LinkedHashMap<>();

    private static void register(BqlField f, String... extraAliases) {
        BY_ALIAS.put(f.alias().toLowerCase(Locale.ROOT), f);
        BY_ALIAS.put(f.column().toLowerCase(Locale.ROOT), f);
        for (String a : extraAliases) {
            BY_ALIAS.put(a.toLowerCase(Locale.ROOT), f);
        }
    }

    static {
        register(BqlField.of("id", "id", BqlField.BqlType.ID));
        register(BqlField.of("title", "title", BqlField.BqlType.TEXT));
        register(BqlField.of("description", "description", BqlField.BqlType.TEXT));
        register(BqlField.of("status", "status", BqlField.BqlType.ENUM));
        register(BqlField.of("type", "type", BqlField.BqlType.ENUM));
        register(BqlField.of("priority", "priority", BqlField.BqlType.ENUM));
        register(BqlField.of("severity", "severity", BqlField.BqlType.ENUM));
        register(BqlField.of("assignee", "assignee_id", BqlField.BqlType.ID), "assigneeid");
        register(BqlField.of("reporter", "created_by", BqlField.BqlType.ID), "createdby");
        register(BqlField.of("project", "project_id", BqlField.BqlType.ID), "projectid");
        register(BqlField.of("sprint", "sprint_id", BqlField.BqlType.ID), "sprintid");
        register(BqlField.of("parent", "parent_id", BqlField.BqlType.ID), "parentid");
        register(BqlField.of("storyPoints", "story_points", BqlField.BqlType.NUMBER), "points", "storypoints");
        register(BqlField.of("dueDate", "due_date", BqlField.BqlType.DATE), "duedate");
        register(BqlField.of("createdAt", "created_at", BqlField.BqlType.DATE), "createdat");
        register(BqlField.of("updatedAt", "updated_at", BqlField.BqlType.DATE), "updatedat");
        register(BqlField.of("statusChangedAt", "status_changed_at", BqlField.BqlType.DATE), "statuschangedat");
        register(BqlField.of("environment", "environment", BqlField.BqlType.TEXT));
        register(BqlField.of("effortEstimate", "effort_estimate", BqlField.BqlType.TEXT), "effortestimate");
        // Long-text detail fields — queryable (e.g. CONTAINS, or != '' emptiness checks used by
        // compliance rules). Kept TEXT so only text-appropriate operators bind sensibly.
        register(BqlField.of("acceptanceCriteria", "acceptance_criteria", BqlField.BqlType.TEXT), "acceptancecriteria");
        register(BqlField.of("stepsToReproduce", "steps_to_reproduce", BqlField.BqlType.TEXT), "stepstoreproduce");
        register(BqlField.of("definitionOfDone", "definition_of_done", BqlField.BqlType.TEXT), "definitionofdone");
        register(BqlField.of("expectedResult", "expected_result", BqlField.BqlType.TEXT), "expectedresult");
        register(BqlField.of("actualResult", "actual_result", BqlField.BqlType.TEXT), "actualresult");
        // Sensitive: business value is leadership-facing; gated by the sensitivity check.
        register(BqlField.sensitive("businessValue", "business_value", BqlField.BqlType.NUMBER), "businessvalue");
    }

    private BqlFieldRegistry() { }

    /**
     * Resolves a field alias, enforcing the allow-list and the sensitivity gate.
     *
     * @throws BqlException if the field is unknown, or sensitive and the context fails the gate
     */
    public static BqlField resolve(String alias, BqlContext ctx) {
        BqlField f = BY_ALIAS.get(alias.toLowerCase(Locale.ROOT));
        if (f == null) {
            throw new BqlException("Unknown field: " + alias);
        }
        if (f.sensitive() && (ctx == null || !ctx.canSeeSensitive())) {
            throw new BqlException("Field not permitted: " + alias);
        }
        return f;
    }

    /** All non-sensitive fields plus the sensitive ones the context may see — for the schema endpoint. */
    public static List<BqlField> visibleFields(BqlContext ctx) {
        boolean sensitive = ctx != null && ctx.canSeeSensitive();
        return BY_ALIAS.values().stream()
            .distinct()
            .filter(f -> sensitive || !f.sensitive())
            .toList();
    }
}
