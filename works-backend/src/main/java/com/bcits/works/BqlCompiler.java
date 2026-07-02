package com.bcits.works;

import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * Compiles BQL (bSmart Query Language) into a <b>parameterized</b> SQL {@code WHERE} fragment.
 *
 * <p>Pipeline: {@link BqlLexer} → {@link BqlParser} (recursive-descent) → {@link BqlAst} →
 * {@link BqlSqlEmitter}. This replaced the original single-pass regex translator and adds
 * grouping/precedence, {@code NOT}, {@code NOT IN}, {@code BETWEEN}, {@code IS [NOT] EMPTY}, the
 * {@code ENDSWITH} string operator, and relative-date functions — while keeping the
 * {@link #compile(String, String)} contract the eight downstream consumers (BQL endpoint, KPIs,
 * widgets, automation, SLA, compliance) rely on. The parser and emitter were extracted to their own
 * files (Phase 2 / W2 god-class split); this class is the thin, stable public facade.
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
        BqlParser parser = new BqlParser(tokens);
        BqlAst.Expr ast = parser.parse();
        String sql = new BqlSqlEmitter(ctx, params).emit(ast);
        return new Compiled(sql, params);
    }
}
