package com.bcits.works;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Component;

/**
 * Compiles BQL (bSmart Query Language) into a <b>parameterized</b> SQL {@code WHERE} fragment.
 *
 * <p>Pipeline: {@link BqlLexer} → recursive-descent parser → {@link BqlAst} → SQL emitter. This
 * replaced the original single-pass regex translator and adds grouping/precedence, {@code NOT},
 * {@code NOT IN}, {@code BETWEEN}, {@code IS [NOT] EMPTY}, the {@code ENDSWITH} string operator,
 * and relative-date functions — while keeping the {@link #compile(String, String)} contract the
 * eight downstream consumers (BQL endpoint, KPIs, widgets, automation, SLA, compliance) rely on.
 *
 * <p>Grammar (precedence low→high):
 * <pre>
 *   or        := and ( OR and )*
 *   and       := not ( AND not )*
 *   not       := NOT not | primary
 *   primary   := '(' or ')' | condition
 *   condition := field ( IN '(' values ')'
 *                       | NOT IN '(' values ')'
 *                       | BETWEEN value AND value
 *                       | IS [NOT] EMPTY
 *                       | op value )
 *   op        := = | != | &lt;&gt; | &gt;= | &lt;= | &gt; | &lt; | CONTAINS | STARTSWITH | ENDSWITH
 *   value     := function() | 'quoted' | bareword | number
 *   function  := currentUser | today | now | startOfWeek | endOfWeek
 *              | startOfMonth | endOfMonth | daysAgo | daysFromNow
 * </pre>
 *
 * <p>Every user value is emitted as a bind parameter ({@code ?}); field names resolve through the
 * closed {@link BqlFieldRegistry} allow-list. Nothing the user types is concatenated into SQL as
 * syntax — the injection guarantee (WRK-BUG-07 / TD-004) is preserved and tightened.
 */
@Component
public class BqlCompiler {

    /** Compiled output: a SQL fragment with {@code ?} placeholders plus the ordered bind params. */
    public record Compiled(String sql, List<Object> params) { }

    /**
     * Legacy two-arg entry point. Compiles with a <b>trusted</b> context (full field visibility) —
     * preserves behaviour for server-side consumers that compile system-authored BQL.
     */
    public Compiled compile(String query, String currentUserId) {
        return compileFor(query, BqlContext.trusted(currentUserId));
    }

    /**
     * Context-aware entry point used by the user-facing controller (field-level security applies).
     *
     * @param query raw BQL (may be empty)
     * @param ctx   who is asking + the field-level-security gate
     * @return parameterized WHERE fragment + ordered params; empty sql for an empty query
     * @throws BqlException on unparseable input or a forbidden/unknown field
     */
    public Compiled compileFor(String query, BqlContext ctx) {
        String q = query == null ? "" : query.trim();
        List<Object> params = new ArrayList<>();
        if (q.isEmpty()) {
            return new Compiled("", params);
        }
        List<BqlLexer.Token> tokens = new BqlLexer(q).tokenize();
        Parser parser = new Parser(tokens);
        BqlAst.Expr ast = parser.parse();
        String sql = new Emitter(ctx, params).emit(ast);
        return new Compiled(sql, params);
    }

    // ── Parser ──────────────────────────────────────────────────────────────────────

    private static final class Parser {
        private final List<BqlLexer.Token> tokens;
        private int pos;

        Parser(List<BqlLexer.Token> tokens) {
            this.tokens = tokens;
        }

        BqlAst.Expr parse() {
            BqlAst.Expr e = parseOr();
            if (peek().type() != BqlLexer.TokenType.EOF) {
                throw new BqlException("Unexpected token '" + peek().text() + "'", peek().pos());
            }
            return e;
        }

        private BqlAst.Expr parseOr() {
            BqlAst.Expr left = parseAnd();
            while (isKeyword("OR")) {
                next();
                left = new BqlAst.Or(left, parseAnd());
            }
            return left;
        }

        private BqlAst.Expr parseAnd() {
            BqlAst.Expr left = parseNot();
            while (isKeyword("AND")) {
                next();
                left = new BqlAst.And(left, parseNot());
            }
            return left;
        }

        private BqlAst.Expr parseNot() {
            if (isKeyword("NOT")) {
                next();
                return new BqlAst.Not(parseNot());
            }
            return parsePrimary();
        }

        private BqlAst.Expr parsePrimary() {
            if (peek().type() == BqlLexer.TokenType.LPAREN) {
                next();
                BqlAst.Expr inner = parseOr();
                expect(BqlLexer.TokenType.RPAREN, ")");
                return inner;
            }
            return parseCondition();
        }

        private BqlAst.Expr parseCondition() {
            BqlLexer.Token fieldTok = next();
            if (fieldTok.type() != BqlLexer.TokenType.WORD) {
                throw new BqlException("Expected a field but found '" + fieldTok.text() + "'", fieldTok.pos());
            }
            String field = fieldTok.text();

            // field NOT IN (...)
            if (isKeyword("NOT") && isKeywordAt(pos + 1, "IN")) {
                next();
                next();
                return new BqlAst.InList(field, parseValueList(), true);
            }
            if (isKeyword("IN")) {
                next();
                return new BqlAst.InList(field, parseValueList(), false);
            }
            if (isKeyword("BETWEEN")) {
                next();
                BqlAst.Value low = parseValue();
                if (!isKeyword("AND")) {
                    throw new BqlException("BETWEEN requires 'AND' between the two bounds");
                }
                next();
                BqlAst.Value high = parseValue();
                return new BqlAst.Between(field, low, high);
            }
            if (isKeyword("IS")) {
                next();
                boolean negated = false;
                if (isKeyword("NOT")) {
                    next();
                    negated = true;
                }
                if (!isKeyword("EMPTY")) {
                    throw new BqlException("Expected EMPTY after IS [NOT]");
                }
                next();
                return new BqlAst.IsEmpty(field, negated);
            }
            String op = parseOperator();
            return new BqlAst.Comparison(field, op, parseValue());
        }

        private String parseOperator() {
            BqlLexer.Token t = peek();
            if (t.type() == BqlLexer.TokenType.OP) {
                next();
                return t.text();
            }
            if (t.type() == BqlLexer.TokenType.WORD) {
                String up = t.text().toUpperCase(Locale.ROOT);
                if (up.equals("CONTAINS") || up.equals("STARTSWITH") || up.equals("ENDSWITH")) {
                    next();
                    return up;
                }
            }
            throw new BqlException("Expected an operator but found '" + t.text() + "'", t.pos());
        }

        private List<BqlAst.Value> parseValueList() {
            expect(BqlLexer.TokenType.LPAREN, "(");
            List<BqlAst.Value> values = new ArrayList<>();
            values.add(parseValue());
            while (peek().type() == BqlLexer.TokenType.COMMA) {
                next();
                values.add(parseValue());
            }
            expect(BqlLexer.TokenType.RPAREN, ")");
            return values;
        }

        private BqlAst.Value parseValue() {
            BqlLexer.Token t = next();
            if (t.type() == BqlLexer.TokenType.STRING) {
                return new BqlAst.Literal(t.text());
            }
            if (t.type() != BqlLexer.TokenType.WORD) {
                throw new BqlException("Expected a value but found '" + t.text() + "'", t.pos());
            }
            // function call: WORD immediately followed by '('
            if (peek().type() == BqlLexer.TokenType.LPAREN) {
                next();
                List<String> args = new ArrayList<>();
                if (peek().type() != BqlLexer.TokenType.RPAREN) {
                    args.add(next().text());
                    while (peek().type() == BqlLexer.TokenType.COMMA) {
                        next();
                        args.add(next().text());
                    }
                }
                expect(BqlLexer.TokenType.RPAREN, ")");
                return new BqlAst.FunctionCall(t.text(), args);
            }
            // Bare value — may span multiple words (e.g. `status = In Progress`), mirroring a
            // quoted value without the quotes. Consume following words until a reserved keyword,
            // operator, comma, paren, or end — so connectors and the next condition still parse.
            StringBuilder sb = new StringBuilder(t.text());
            while (peek().type() == BqlLexer.TokenType.WORD && !isReserved(peek().text())) {
                sb.append(' ').append(next().text());
            }
            return new BqlAst.Literal(sb.toString());
        }

        private static final java.util.Set<String> RESERVED = java.util.Set.of(
            "AND", "OR", "NOT", "IN", "BETWEEN", "IS", "EMPTY", "CONTAINS", "STARTSWITH", "ENDSWITH");

        private boolean isReserved(String word) {
            return RESERVED.contains(word.toUpperCase(Locale.ROOT));
        }

        // token helpers
        private BqlLexer.Token peek() {
            return tokens.get(pos);
        }

        private BqlLexer.Token next() {
            return tokens.get(pos++);
        }

        private void expect(BqlLexer.TokenType type, String what) {
            if (peek().type() != type) {
                throw new BqlException("Expected '" + what + "' but found '" + peek().text() + "'", peek().pos());
            }
            next();
        }

        private boolean isKeyword(String kw) {
            return isKeywordAt(pos, kw);
        }

        private boolean isKeywordAt(int index, String kw) {
            if (index >= tokens.size()) {
                return false;
            }
            BqlLexer.Token t = tokens.get(index);
            return t.type() == BqlLexer.TokenType.WORD && t.text().equalsIgnoreCase(kw);
        }
    }

    // ── Emitter ─────────────────────────────────────────────────────────────────────

    private static final class Emitter {
        private final BqlContext ctx;
        private final List<Object> params;

        Emitter(BqlContext ctx, List<Object> params) {
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
            };
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

        private String comparison(BqlAst.Comparison c) {
            String op = c.op().toUpperCase(Locale.ROOT);
            // Virtual full-text field: `text ~ "..."` / `text CONTAINS ...` searches title + description.
            if ("text".equalsIgnoreCase(c.field()) && (op.equals("~") || op.equals("CONTAINS"))) {
                String pattern = "%" + literal(c.value()) + "%";
                params.add(pattern);
                params.add(pattern);
                return "(title ILIKE ? OR description ILIKE ?)";
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

        private String inList(BqlAst.InList in) {
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
}
