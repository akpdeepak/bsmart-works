package com.bcits.works;

import com.bcits.works.shared.ApiException;
import com.bcits.works.workitems.StatusCategoryResolver;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Board WIP limits — flow control for the board's three fixed status columns (RB-20 §5 honest
 * software: a limit a team sets is enforced server-side and shared, not a per-browser preference).
 * The caller (BoardController) applies RBAC — workspace membership to read, {@code manage_projects}
 * to write — and every access is workspace-scoped (RB-40 §1). A workspace with no row has no limits.
 */
@Service
public class BoardWipLimitService {

    private final BoardWipLimitRepository repo;
    private final JdbcTemplate jdbc;

    public BoardWipLimitService(BoardWipLimitRepository repo, JdbcTemplate jdbc) {
        this.repo = repo;
        this.jdbc = jdbc;
    }

    /** Current limits, or an empty (all-null) set when none are configured. */
    public BoardWipLimit get(String workspaceId) {
        return repo.findById(workspaceId).orElseGet(() -> {
            BoardWipLimit l = new BoardWipLimit();
            l.setWorkspaceId(workspaceId);
            return l;
        });
    }

    public BoardWipLimit set(String workspaceId, Integer todo, Integer inProgress, Integer done) {
        validate(todo);
        validate(inProgress);
        validate(done);
        BoardWipLimit l = get(workspaceId);
        l.setWorkspaceId(workspaceId);
        l.setTodoLimit(todo);
        l.setInProgressLimit(inProgress);
        l.setDoneLimit(done);
        l.setUpdatedAt(OffsetDateTime.now());
        return repo.save(l);
    }

    /**
     * Guard a status transition against the workspace's WIP limits.
     *
     * <p>Uses {@code WorkflowStatus.category} (TODO / IN_PROGRESS / DONE) so that custom status
     * names are handled correctly. Lateral moves within a column (both statuses share the same
     * category) are skipped — only cross-column entries are counted.
     *
     * <p>Throws {@code 409 WIP_LIMIT_EXCEEDED} when moving into a bounded, full column.
     * The count is workspace-scoped and excludes soft-deleted items (RB-40 §1).
     */
    public void enforceEntry(String workspaceId, String oldStatus, String newStatus) {
        BoardWipLimit limits = repo.findById(workspaceId).orElse(null);
        if (limits == null) return;

        String oldCat = categoryFor(oldStatus);
        String newCat = categoryFor(newStatus);

        // Lateral move within the same column is not a column entry — skip
        if (Objects.equals(oldCat, newCat)) return;

        Integer limit = columnLimit(limits, newCat);
        if (limit == null) return; // column is unbounded

        long current = countByCategory(workspaceId, newCat);
        if (current >= limit) {
            throw new ApiException(HttpStatus.CONFLICT, "WIP_LIMIT_EXCEEDED",
                String.format("Column is full (%d/%d). Adjust the WIP limit or move an item first.",
                    current, limit));
        }
    }

    // ── private helpers ────────────────────────────────────────────────────────

    private String categoryFor(String statusName) {
        if (statusName == null) return StatusCategoryResolver.TODO;
        // Use RowMapper form to avoid JdbcTemplate overload ambiguity at the call site.
        List<String> rows = jdbc.query(
            "SELECT category FROM workflow_status WHERE LOWER(name) = LOWER(?) LIMIT 1",
            (rs, i) -> rs.getString("category"),
            statusName);
        return rows.isEmpty() ? StatusCategoryResolver.from(Map.of()).apply(statusName) : rows.get(0);
    }

    private static Integer columnLimit(BoardWipLimit limits, String category) {
        return switch (category) {
            case StatusCategoryResolver.TODO -> limits.getTodoLimit();
            case StatusCategoryResolver.IN_PROGRESS -> limits.getInProgressLimit();
            case StatusCategoryResolver.DONE -> limits.getDoneLimit();
            default            -> null;
        };
    }

    private long countByCategory(String workspaceId, String category) {
        List<Long> rows = jdbc.query(
            "SELECT COUNT(*) FROM work_items wi " +
            "JOIN projects p ON wi.project_id = p.id " +
            "WHERE p.workspace_id = ? AND wi.deleted_at IS NULL " +
            "AND EXISTS (" +
            "  SELECT 1 FROM workflow_status ws " +
            "  WHERE LOWER(ws.name) = LOWER(wi.status) AND ws.category = ?" +
            ")",
            (rs, i) -> rs.getLong(1),
            workspaceId, category);
        return rows.isEmpty() ? 0L : rows.get(0);
    }

    private void validate(Integer limit) {
        if (limit != null && limit < 0) {
            throw ApiException.badRequest("INVALID_WIP_LIMIT", "WIP limits must be zero or greater.");
        }
    }
}
