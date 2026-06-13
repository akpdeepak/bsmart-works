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
                throw new BqlException("Unexpected token '" + peek().text() + "'");
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
                throw new BqlException("Expected a field but found '" + fieldTok.text() + "'");
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
            throw new BqlException("Expected an operator but found '" + t.text() + "'");
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
                throw new BqlException("Expected a value but found '" + t.text() + "'");
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
            return new BqlAst.Literal(t.text());
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
                throw new BqlException("Expected '" + what + "' but found '" + peek().text() + "'");
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

        private String comparison(BqlAst.Comparison c) {
            BqlField f = BqlFieldRegistry.resolve(c.field(), ctx);
            String col = f.column();
            return switch (c.op().toUpperCase(Locale.ROOT)) {
                case "CONTAINS" -> like(col, "%" + literal(c.value(), f) + "%");
                case "STARTSWITH" -> like(col, literal(c.value(), f) + "%");
                case "ENDSWITH" -> like(col, "%" + literal(c.value(), f));
                case "<>" -> col + " != " + valueSql(c.value(), f);
                default -> col + " " + c.op() + " " + valueSql(c.value(), f);
            };
        }

        private String like(String col, String pattern) {
            params.add(pattern);
            return col + " ILIKE ?";
        }

        private String inList(BqlAst.InList in) {
            BqlField f = BqlFieldRegistry.resolve(in.field(), ctx);
            StringBuilder sb = new StringBuilder(f.column()).append(in.negated() ? " NOT IN (" : " IN (");
            for (int i = 0; i < in.values().size(); i++) {
                if (i > 0) {
                    sb.append(", ");
                }
                sb.append(valueSql(in.values().get(i), f));
            }
            return sb.append(')').toString();
        }

        private String between(BqlAst.Between b) {
            BqlField f = BqlFieldRegistry.resolve(b.field(), ctx);
            return f.column() + " BETWEEN " + valueSql(b.low(), f) + " AND " + valueSql(b.high(), f);
        }

        private String isEmpty(BqlAst.IsEmpty is) {
            BqlField f = BqlFieldRegistry.resolve(is.field(), ctx);
            return f.column() + (is.negated() ? " IS NOT NULL" : " IS NULL");
        }

        /** Emits SQL for a value: a function becomes a SQL expression; a literal becomes {@code ?}. */
        private String valueSql(BqlAst.Value v, BqlField f) {
            if (v instanceof BqlAst.FunctionCall fn) {
                return functionSql(fn);
            }
            params.add(coerce(((BqlAst.Literal) v).raw(), f));
            return "?";
        }

        /** Resolves a literal/function to the raw string used inside an ILIKE pattern. */
        private String literal(BqlAst.Value v, BqlField f) {
            if (v instanceof BqlAst.FunctionCall) {
                throw new BqlException("Functions are not valid with text operators");
            }
            return ((BqlAst.Literal) v).raw();
        }

        private String functionSql(BqlAst.FunctionCall fn) {
            String name = fn.name().toLowerCase(Locale.ROOT);
            return switch (name) {
                case "currentuser" -> {
                    params.add(ctx == null ? null : ctx.currentUserId());
                    yield "?";
                }
                case "today" -> "CURRENT_DATE";
                case "now" -> "NOW()";
                case "startofweek" -> "date_trunc('week', CURRENT_DATE)";
                case "endofweek" -> "(date_trunc('week', CURRENT_DATE) + INTERVAL '6 days')";
                case "startofmonth" -> "date_trunc('month', CURRENT_DATE)";
                case "endofmonth" ->
                    "(date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')";
                case "daysago" -> {
                    params.add(intArg(fn));
                    yield "(CURRENT_DATE - (? * INTERVAL '1 day'))";
                }
                case "daysfromnow" -> {
                    params.add(intArg(fn));
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

        /** Coerce a literal by the field's declared type so numeric comparisons behave. */
        private Object coerce(String value, BqlField f) {
            if (f.type() == BqlField.BqlType.NUMBER) {
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
