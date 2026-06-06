package com.example.demo;

import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;

/**
 * Board WIP limits — flow control for the board's three fixed status columns (RB-20 §5 honest
 * software: a limit a team sets is enforced server-side and shared, not a per-browser preference).
 * The caller (BoardController) applies RBAC — workspace membership to read, {@code manage_projects}
 * to write — and every access is workspace-scoped (RB-40 §1). A workspace with no row has no limits.
 */
@Service
public class BoardWipLimitService {

    private final BoardWipLimitRepository repo;

    public BoardWipLimitService(BoardWipLimitRepository repo) {
        this.repo = repo;
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

    private void validate(Integer limit) {
        if (limit != null && limit < 0) {
            throw ApiException.badRequest("INVALID_WIP_LIMIT", "WIP limits must be zero or greater.");
        }
    }
}
