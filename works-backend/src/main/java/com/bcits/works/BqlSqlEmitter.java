package com.bcits.works;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Emits a parameterized SQL {@code WHERE} fragment from a {@link BqlAst}. Extracted verbatim from
 * {@link BqlCompiler} (Phase 2 / W2 god-class split); behaviour is unchanged. Package-private — the
 * only entry point is {@link BqlCompiler#compileFor}.
 *
 * <p><b>Injection guarantee (WRK-BUG-07 / TD-004), preserved:</b> every user value is emitted as a
 * bind parameter ({@code ?}); field names resolve through the closed {@link BqlFieldRegistry}
 * allow-list under the caller's field-security {@link BqlContext}. Nothing the user types is
 * concatenated into SQL as syntax. Membership subqueries ({@code history}/{@code labels}/custom
 * fields) rely on the outer {@code work_items} query already being workspace-scoped (RB-40 §1).
 */
final class BqlSqlEmitter {
    private final BqlContext ctx;
    private final List<Object> params;

    BqlSqlEmitter(BqlContext ctx, List<Object> params) {
        this.ctx = ctx;
        this.params = params;
    }

    /** A resolved field: a built-in {@code work_items} column, or a custom field's value store. */
    private record Resolved(String column, BqlField.BqlType type, boolean custom, String fieldDefId) { }

    String emit(BqlAst.Expr e) {
        return switch (e) {
            case BqlAst.And a -> "(" + emit(a.left()) + " AND " + emit(a.right()) + ")";
            case BqlAst.Or o -> "(" + emit(o.left()) + " OR " + emit(o.right()) + ")";
            case BqlAst.Not n -> "NOT (" + emit(n.inner()) + ")";
            case BqlAst.Comparison c -> comparison(c);
            case BqlAst.InList in -> inList(in);
            case BqlAst.Between b -> between(b);
            case BqlAst.IsEmpty is -> isEmpty(is);
            case BqlAst.History h -> history(h);
        };
    }

    /** Event-store field_name for each history-tracked BQL alias (mirrors EventService.recordDiff). */
    private static final java.util.Map<String, String> HISTORY_FIELDS = java.util.Map.of(
        "status", "status", "assignee", "assignee", "priority", "priority", "type", "type",
        "title", "title", "duedate", "dueDate", "storypoints", "storyPoints", "parent", "parentId");

    /**
     * {@code WAS}/{@code CHANGED} compile to a membership subquery over the append-only event log.
     * The outer {@code id IN (...)} is already workspace-scoped (work_items are), so the subquery
     * needs no extra tenant predicate. History values match the recorded display value.
     */
    private String history(BqlAst.History h) {
        String eventField = HISTORY_FIELDS.get(h.field().toLowerCase(Locale.ROOT));
        if (eventField == null) {
            throw new BqlException("Field is not history-tracked: " + h.field());
        }
        StringBuilder sub = new StringBuilder("field_name = ?");
        params.add(eventField);
        if (!h.changed()) {
            sub.append(" AND (new_value = ? OR old_value = ?)");
            String v = ((BqlAst.Literal) h.was()).raw();
            params.add(v);
            params.add(v);
        } else {
            if (h.from() != null) {
                sub.append(" AND old_value = ?");
                params.add(((BqlAst.Literal) h.from()).raw());
            }
            if (h.to() != null) {
                sub.append(" AND new_value = ?");
                params.add(((BqlAst.Literal) h.to()).raw());
            }
            if (h.whenOp() != null) {
                String when = whenSql(h.when());
                sub.append("ON".equals(h.whenOp())
                    ? " AND occurred_at::date = " + when
                    : " AND occurred_at " + h.whenOp() + " " + when);
            }
        }
        return "id IN (SELECT aggregate_id FROM events WHERE " + sub + ")";
    }

    /** A date bound for CHANGED AFTER/BEFORE/ON — a function expression or a {@code ?::date} literal. */
    private String whenSql(BqlAst.Value v) {
        if (v instanceof BqlAst.FunctionCall fn) {
            return functionSql(fn, params);
        }
        params.add(((BqlAst.Literal) v).raw());
        return "?::date";
    }

    /**
     * Resolve a field alias to a built-in column or a custom field. Custom fields are checked
     * first so a workspace can shadow nothing built-in; an unknown alias still throws.
     */
    private Resolved resolve(String alias) {
        BqlContext.CustomField cf = ctx == null ? null : ctx.customField(alias);
        if (cf != null) {
            String col = switch (cf.type()) {
                case NUMBER -> "value_number";
                case DATE -> "value_date";
                default -> "value_text";
            };
            return new Resolved(col, cf.type(), true, cf.fieldDefId());
        }
        BqlField f = BqlFieldRegistry.resolve(alias, ctx); // throws on unknown/forbidden
        return new Resolved(f.column(), f.type(), false, null);
    }

    /**
     * Assemble the final predicate. A built-in field uses the fragment directly; a custom field
     * wraps it in an EXISTS-style membership subquery against the value store, with the
     * {@code field_def_id} bound before the value params (correct order).
     */
    private String wrap(Resolved r, String fragment, List<Object> valueParams, boolean outerNegated) {
        if (!r.custom()) {
            params.addAll(valueParams);
            return fragment;
        }
        params.add(r.fieldDefId());
        params.addAll(valueParams);
        return (outerNegated ? "id NOT IN" : "id IN")
            + " (SELECT work_item_id FROM work_item_field_value WHERE field_def_id = ? AND "
            + fragment + ")";
    }

    /** Virtual collection field backed by the {@code tags} table — see {@link #labelsComparison}. */
    private static final String LABELS_FIELD = "labels";

    private static boolean isLabels(String field) {
        return LABELS_FIELD.equalsIgnoreCase(field);
    }

    private String comparison(BqlAst.Comparison c) {
        String op = c.op().toUpperCase(Locale.ROOT);
        // Virtual full-text field: `text ~ "..."` / `text CONTAINS ...` searches title + description.
        if ("text".equalsIgnoreCase(c.field()) && (op.equals("~") || op.equals("CONTAINS"))) {
            String pattern = "%" + literal(c.value()) + "%";
            params.add(pattern);
            params.add(pattern);
            return "(title ILIKE ? OR description ILIKE ?)";
        }
        if (isLabels(c.field())) {
            return labelsComparison(c, op);
        }
        Resolved r = resolve(c.field());
        validateOp(r.type(), op);
        List<Object> local = new ArrayList<>();
        String frag = switch (op) {
            // `~` is a fuzzy "contains" on any text field (JQL-style); CONTAINS is its synonym.
            case "CONTAINS", "~" -> like(r.column(), "%" + literal(c.value()) + "%", local);
            case "STARTSWITH" -> like(r.column(), literal(c.value()) + "%", local);
            case "ENDSWITH" -> like(r.column(), "%" + literal(c.value()), local);
            case "<>" -> r.column() + " != " + valueSql(c.value(), r.type(), local);
            default -> r.column() + " " + c.op() + " " + valueSql(c.value(), r.type(), local);
        };
        return wrap(r, frag, local, false);
    }

    private String like(String col, String pattern, List<Object> local) {
        local.add(pattern);
        return col + " ILIKE ?";
    }

    /**
     * {@code labels} is a one-to-many collection (the {@code tags} table), not a column — so
     * every operator compiles to a membership subquery: a work item matches when it has (or, for
     * {@code !=}, lacks) a tag satisfying the inner predicate. The outer {@code id IN (...)} only
     * ever matches {@code work_items} rows the surrounding query already workspace-scoped, so the
     * subquery needs no extra tenant predicate (same guarantee as history/custom fields).
     */
    private String labelsComparison(BqlAst.Comparison c, String op) {
        List<Object> local = new ArrayList<>();
        boolean negated = "!=".equals(op) || "<>".equals(op);
        String inner = switch (op) {
            case "=", "!=", "<>" -> {
                local.add(literal(c.value()));
                yield "tag = ?";
            }
            case "CONTAINS", "~" -> {
                local.add("%" + literal(c.value()) + "%");
                yield "tag ILIKE ?";
            }
            case "STARTSWITH" -> {
                local.add(literal(c.value()) + "%");
                yield "tag ILIKE ?";
            }
            case "ENDSWITH" -> {
                local.add("%" + literal(c.value()));
                yield "tag ILIKE ?";
            }
            default -> throw new BqlException("Operator " + op + " is not valid for labels");
        };
        return labelsMembership(inner, local, negated);
    }

    /** Wrap a {@code tags}-table predicate as a work-item membership test. */
    private String labelsMembership(String inner, List<Object> local, boolean negated) {
        params.addAll(local);
        return (negated ? "id NOT IN" : "id IN")
            + " (SELECT work_item_id FROM tags WHERE " + inner + ")";
    }

    private String inList(BqlAst.InList in) {
        if (isLabels(in.field())) {
            List<Object> local = new ArrayList<>();
            StringBuilder inner = new StringBuilder("tag IN (");
            for (int i = 0; i < in.values().size(); i++) {
                if (i > 0) {
                    inner.append(", ");
                }
                inner.append('?');
                local.add(literal(in.values().get(i)));
            }
            inner.append(')');
            return labelsMembership(inner.toString(), local, in.negated());
        }
        Resolved r = resolve(in.field());
        List<Object> local = new ArrayList<>();
        // Built-in encodes its own NOT; custom keeps a positive inner list and flips membership.
        StringBuilder sb = new StringBuilder(r.column())
            .append((!r.custom() && in.negated()) ? " NOT IN (" : " IN (");
        for (int i = 0; i < in.values().size(); i++) {
            if (i > 0) {
                sb.append(", ");
            }
            sb.append(valueSql(in.values().get(i), r.type(), local));
        }
        sb.append(')');
        return wrap(r, sb.toString(), local, in.negated());
    }

    private String between(BqlAst.Between b) {
        Resolved r = resolve(b.field());
        validateOp(r.type(), "BETWEEN");
        List<Object> local = new ArrayList<>();
        String frag = r.column() + " BETWEEN " + valueSql(b.low(), r.type(), local)
            + " AND " + valueSql(b.high(), r.type(), local);
        return wrap(r, frag, local, false);
    }

    private String isEmpty(BqlAst.IsEmpty is) {
        if (isLabels(is.field())) {
            // IS EMPTY => the work item has no tags at all; IS NOT EMPTY => it has at least one.
            return (is.negated() ? "id IN" : "id NOT IN")
                + " (SELECT work_item_id FROM tags)";
        }
        Resolved r = resolve(is.field());
        if (!r.custom()) {
            return r.column() + (is.negated() ? " IS NOT NULL" : " IS NULL");
        }
        // Custom: emptiness is presence of a non-null value row. IS EMPTY => no such row.
        return wrap(r, r.column() + " IS NOT NULL", new ArrayList<>(), !is.negated());
    }

    /** Reject operator/field-type pairings that cannot behave (RB-10 §6 typed fields). */
    private void validateOp(BqlField.BqlType type, String op) {
        boolean relational = op.equals(">") || op.equals("<") || op.equals(">=")
            || op.equals("<=") || op.equals("BETWEEN");
        boolean textual = op.equals("CONTAINS") || op.equals("STARTSWITH")
            || op.equals("ENDSWITH") || op.equals("~");
        boolean numericOrDate = type == BqlField.BqlType.NUMBER || type == BqlField.BqlType.DATE;
        if (relational && !numericOrDate) {
            throw new BqlException("Operator " + op + " is not valid for a "
                + type.name().toLowerCase(Locale.ROOT) + " field");
        }
        if (textual && numericOrDate) {
            throw new BqlException("Operator " + op + " is not valid for a "
                + type.name().toLowerCase(Locale.ROOT) + " field");
        }
    }

    /** Emits SQL for a value into {@code local}: a function becomes SQL; a literal becomes {@code ?}. */
    private String valueSql(BqlAst.Value v, BqlField.BqlType type, List<Object> local) {
        if (v instanceof BqlAst.FunctionCall fn) {
            return functionSql(fn, local);
        }
        local.add(coerce(((BqlAst.Literal) v).raw(), type));
        // Bind a date literal as a typed parameter so `col >= ?::date` compares correctly
        // (a JDBC string param against a DATE column would otherwise be a type mismatch).
        return type == BqlField.BqlType.DATE ? "?::date" : "?";
    }

    /** Resolves a literal to the raw string used inside an ILIKE pattern (functions are invalid here). */
    private String literal(BqlAst.Value v) {
        if (v instanceof BqlAst.FunctionCall) {
            throw new BqlException("Functions are not valid with text operators");
        }
        return ((BqlAst.Literal) v).raw();
    }

    private String functionSql(BqlAst.FunctionCall fn, List<Object> local) {
        String name = fn.name().toLowerCase(Locale.ROOT);
        return switch (name) {
            case "currentuser" -> {
                local.add(ctx == null ? null : ctx.currentUserId());
                yield "?";
            }
            case "today" -> "CURRENT_DATE";
            case "now" -> "NOW()";
            case "startofweek" -> "date_trunc('week', CURRENT_DATE)";
            case "endofweek" -> "(date_trunc('week', CURRENT_DATE) + INTERVAL '6 days')";
            case "startofmonth" -> "date_trunc('month', CURRENT_DATE)";
            case "endofmonth" ->
                "(date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')";
            case "startofquarter" -> "date_trunc('quarter', CURRENT_DATE)";
            case "endofquarter" ->
                "(date_trunc('quarter', CURRENT_DATE) + INTERVAL '3 months' - INTERVAL '1 day')";
            case "startofyear" -> "date_trunc('year', CURRENT_DATE)";
            case "endofyear" ->
                "(date_trunc('year', CURRENT_DATE) + INTERVAL '1 year' - INTERVAL '1 day')";
            case "startofday" -> "date_trunc('day', NOW())";
            case "endofday" ->
                "(date_trunc('day', NOW()) + INTERVAL '1 day' - INTERVAL '1 second')";
            case "daysago" -> {
                local.add(intArg(fn));
                yield "(CURRENT_DATE - (? * INTERVAL '1 day'))";
            }
            case "daysfromnow" -> {
                local.add(intArg(fn));
                yield "(CURRENT_DATE + (? * INTERVAL '1 day'))";
            }
            default -> throw new BqlException("Unknown function: " + fn.name() + "()");
        };
    }

    private long intArg(BqlAst.FunctionCall fn) {
        if (fn.args().size() != 1) {
            throw new BqlException(fn.name() + "() expects exactly one numeric argument");
        }
        try {
            return Long.parseLong(fn.args().get(0).trim());
        } catch (NumberFormatException e) {
            throw new BqlException(fn.name() + "() argument must be a whole number");
        }
    }

    /** Coerce a literal by the declared type so numeric comparisons behave. */
    private Object coerce(String value, BqlField.BqlType type) {
        if (type == BqlField.BqlType.NUMBER) {
            try {
                if (value.matches("-?\\d+")) {
                    return Long.parseLong(value);
                }
                if (value.matches("-?\\d+\\.\\d+")) {
                    return Double.parseDouble(value);
                }
            } catch (NumberFormatException ignored) {
                // fall through to text binding
            }
        }
        return value;
    }
}
