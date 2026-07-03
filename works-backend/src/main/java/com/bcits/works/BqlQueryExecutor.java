package com.bcits.works;

import com.bcits.works.shared.BqlContext;

import com.bcits.works.shared.BqlCompiler;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Centralises <b>workspace-scoped</b> execution of compiled BQL against {@code work_items}
 * (RB-40 §1, advances #243). BQL compiles to a parameterized SQL {@code WHERE} fragment
 * ({@link BqlCompiler}); historically every caller wrapped that fragment in its own scoped
 * {@code COUNT(*)} query and re-typed the tenant predicate by hand. This service owns the wrapping
 * and the predicate so the tenant scope lives in <b>one</b> place, not three.
 *
 * <p>{@code work_items} has no {@code workspace_id} column, so tenant scope is applied through
 * {@code projects} — the unified idiom used everywhere a raw COUNT touches {@code work_items}
 * (RB-40 §1). All user values arrive as bind parameters from the compiler; nothing the caller
 * supplies is concatenated into SQL as syntax.
 *
 * <p>A {@link BqlException} (compile failure) propagates to the caller so each surface can choose its
 * own deterministic fallback (RB-40 §2). Runtime / DB errors are not swallowed.
 */
@Service
public class BqlQueryExecutor {

    /** Tenant predicate over {@code work_items} — copied verbatim from the former hand-typed callers. */
    private static final String WORKSPACE_SCOPE =
        "project_id IN (SELECT id FROM projects WHERE workspace_id = ?)";

    private final BqlCompiler bqlCompiler;
    private final JdbcTemplate jdbc;

    public BqlQueryExecutor(BqlCompiler bqlCompiler, JdbcTemplate jdbc) {
        this.bqlCompiler = bqlCompiler;
        this.jdbc = jdbc;
    }

    /**
     * Workspace-scoped {@code COUNT(*)} of live {@code work_items} matching {@code bql}. An empty/blank
     * query counts every live item in the workspace (no extra predicate). The workspace predicate is
     * always applied — a query can never escape its tenant (RB-40 §1).
     *
     * @param workspaceId tenant whose items are counted
     * @param bql         the BQL formula (may be empty)
     * @param ctx         field-security context the formula compiles under (field-level security)
     * @return the matching live work-item count for this workspace
     * @throws BqlException if {@code bql} cannot be compiled
     */
    public long countScoped(String workspaceId, String bql, BqlContext ctx) {
        BqlCompiler.Compiled compiled = bqlCompiler.compileFor(bql, ctx);
        String countSql = "SELECT COUNT(*) FROM work_items WHERE deleted_at IS NULL"
            + " AND " + WORKSPACE_SCOPE
            + (compiled.sql().isBlank() ? "" : " AND (" + compiled.sql() + ")");
        List<Object> params = new ArrayList<>();
        params.add(workspaceId);
        params.addAll(compiled.params());
        Long count = jdbc.queryForObject(countSql, Long.class, params.toArray());
        return count == null ? 0L : count;
    }

    /**
     * Whether a single work item matches {@code bql}. Compiles the formula under a trusted context
     * (system-authored automation conditions) and runs a {@code COUNT(*)} scoped to the one item id —
     * matching the semantics the automation engine relied on. An empty/blank query matches the item.
     *
     * @param workItemId the item to test
     * @param bql        the BQL condition (may be empty)
     * @return {@code true} if the item satisfies the condition
     * @throws BqlException if {@code bql} cannot be compiled
     */
    public boolean matchesItem(String workItemId, String bql) {
        BqlCompiler.Compiled compiled = bqlCompiler.compileFor(bql, BqlContext.trusted(null));
        if (compiled.sql().isBlank()) {
            return true;
        }
        String sql = "SELECT COUNT(*) FROM work_items WHERE id = ? AND deleted_at IS NULL"
            + " AND (" + compiled.sql() + ")";
        List<Object> params = new ArrayList<>();
        params.add(workItemId);
        params.addAll(compiled.params());
        Long count = jdbc.queryForObject(sql, Long.class, params.toArray());
        return count != null && count > 0;
    }
}
