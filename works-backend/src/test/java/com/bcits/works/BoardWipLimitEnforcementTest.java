package com.bcits.works;

import com.bcits.works.shared.ApiException;
import com.bcits.works.projects.BoardWipLimit;
import com.bcits.works.projects.BoardWipLimitRepository;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link BoardWipLimitService#enforceEntry}.
 *
 * <p>Covers the mandatory scenario categories from RB-05 Stage 3: happy path, edge, limit-exceeded,
 * lateral rename (same-category skip), and the workspace-scoping invariant (RB-40 §1).
 *
 * <p>DB queries are mocked — a separate integration test (Testcontainers) will own the real SQL
 * round-trip. This layer proves the decision logic and the 409 shape.
 */
@Tag("unit")
class BoardWipLimitEnforcementTest {

    private static final String WS = "ws-1";

    private final BoardWipLimitRepository repo = mock(BoardWipLimitRepository.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final BoardWipLimitService service = new BoardWipLimitService(repo, jdbc);

    // ── helpers ────────────────────────────────────────────────────────────────

    /** Stub the category lookup for a single status name (uses RowMapper form to avoid overload ambiguity). */
    @SuppressWarnings("unchecked")
    private void stubCategory(String statusName, String category) {
        when(jdbc.query(
            contains("workflow_status"),
            any(RowMapper.class),
            eq(statusName))
        ).thenReturn(List.of(category));
    }

    /** Stub the count of items currently in a category across WS (uses RowMapper form). */
    @SuppressWarnings("unchecked")
    private void stubCount(long count) {
        when(jdbc.query(
            contains("SELECT COUNT(*)"),
            any(RowMapper.class),
            eq(WS), anyString())
        ).thenReturn(List.of(count));
    }

    private BoardWipLimit limits(Integer todo, Integer inProgress, Integer done) {
        BoardWipLimit l = new BoardWipLimit();
        l.setWorkspaceId(WS);
        l.setTodoLimit(todo);
        l.setInProgressLimit(inProgress);
        l.setDoneLimit(done);
        return l;
    }

    // ── no limits configured ───────────────────────────────────────────────────

    @Test
    void enforceEntry_noLimitsRow_passesThrough() {
        when(repo.findById(WS)).thenReturn(Optional.empty());

        assertThatCode(() -> service.enforceEntry(WS, "To Do", "In Progress"))
            .doesNotThrowAnyException();
        verify(jdbc, never()).query(anyString(), any(RowMapper.class), any());
    }

    // ── lateral rename (same category) ────────────────────────────────────────

    @Test
    @SuppressWarnings("unchecked")
    void enforceEntry_lateralRenameWithinColumn_passesThrough() {
        when(repo.findById(WS)).thenReturn(Optional.of(limits(null, 3, null)));
        stubCategory("In Progress", "IN_PROGRESS");
        stubCategory("In Review", "IN_PROGRESS");

        assertThatCode(() -> service.enforceEntry(WS, "In Progress", "In Review"))
            .doesNotThrowAnyException();
        // no count query for a lateral move
        verify(jdbc, never()).query(contains("SELECT COUNT(*)"), any(RowMapper.class),
            anyString(), anyString());
    }

    // ── happy path: under limit ────────────────────────────────────────────────

    @Test
    void enforceEntry_underLimit_passesThrough() {
        when(repo.findById(WS)).thenReturn(Optional.of(limits(null, 5, null)));
        stubCategory("To Do", "TODO");
        stubCategory("In Progress", "IN_PROGRESS");
        stubCount(4); // 4 already; limit is 5

        assertThatCode(() -> service.enforceEntry(WS, "To Do", "In Progress"))
            .doesNotThrowAnyException();
    }

    @Test
    void enforceEntry_zeroInColumn_passesThrough() {
        when(repo.findById(WS)).thenReturn(Optional.of(limits(null, 2, null)));
        stubCategory("To Do", "TODO");
        stubCategory("In Progress", "IN_PROGRESS");
        stubCount(0);

        assertThatCode(() -> service.enforceEntry(WS, "To Do", "In Progress"))
            .doesNotThrowAnyException();
    }

    // ── limit exceeded ─────────────────────────────────────────────────────────

    @Test
    void enforceEntry_atLimit_throwsWipLimitExceeded() {
        when(repo.findById(WS)).thenReturn(Optional.of(limits(null, 3, null)));
        stubCategory("To Do", "TODO");
        stubCategory("In Progress", "IN_PROGRESS");
        stubCount(3); // at limit

        assertThatThrownBy(() -> service.enforceEntry(WS, "To Do", "In Progress"))
            .isInstanceOf(ApiException.class)
            .satisfies(ex -> {
                ApiException e = (ApiException) ex;
                assertThat(e.getStatus()).isEqualTo(HttpStatus.CONFLICT);
                assertThat(e.getCode()).isEqualTo("WIP_LIMIT_EXCEEDED");
                assertThat(e.getMessage()).contains("3/3");
            });
    }

    @Test
    void enforceEntry_overLimit_throwsWipLimitExceeded() {
        when(repo.findById(WS)).thenReturn(Optional.of(limits(null, 2, null)));
        stubCategory("To Do", "TODO");
        stubCategory("In Progress", "IN_PROGRESS");
        stubCount(5); // above limit (data inconsistency edge case)

        assertThatThrownBy(() -> service.enforceEntry(WS, "To Do", "In Progress"))
            .isInstanceOf(ApiException.class)
            .satisfies(ex -> assertThat(((ApiException) ex).getCode()).isEqualTo("WIP_LIMIT_EXCEEDED"));
    }

    // ── null column limit (unbounded) ──────────────────────────────────────────

    @Test
    @SuppressWarnings("unchecked")
    void enforceEntry_columnLimitNull_passesThrough() {
        when(repo.findById(WS)).thenReturn(Optional.of(limits(null, null, null)));
        stubCategory("To Do", "TODO");
        stubCategory("In Progress", "IN_PROGRESS");

        assertThatCode(() -> service.enforceEntry(WS, "To Do", "In Progress"))
            .doesNotThrowAnyException();
        verify(jdbc, never()).query(contains("SELECT COUNT(*)"), any(RowMapper.class),
            anyString(), anyString());
    }

    // ── done column ────────────────────────────────────────────────────────────

    @Test
    void enforceEntry_doneColumnFull_throwsWipLimitExceeded() {
        when(repo.findById(WS)).thenReturn(Optional.of(limits(null, null, 10)));
        stubCategory("In Progress", "IN_PROGRESS");
        stubCategory("Done", "DONE");
        stubCount(10);

        assertThatThrownBy(() -> service.enforceEntry(WS, "In Progress", "Done"))
            .isInstanceOf(ApiException.class)
            .satisfies(ex -> {
                ApiException e = (ApiException) ex;
                assertThat(e.getCode()).isEqualTo("WIP_LIMIT_EXCEEDED");
                assertThat(e.getMessage()).contains("10/10");
            });
    }

    // ── workspace scoping (RB-40 §1) ──────────────────────────────────────────

    @Test
    @SuppressWarnings("unchecked")
    void enforceEntry_countQueryUsesCallerWorkspace() {
        when(repo.findById(WS)).thenReturn(Optional.of(limits(null, 1, null)));
        stubCategory("To Do", "TODO");
        stubCategory("In Progress", "IN_PROGRESS");
        stubCount(0);

        service.enforceEntry(WS, "To Do", "In Progress");

        // Count query must be issued with WS — not a foreign tenant's id.
        verify(jdbc).query(
            contains("SELECT COUNT(*)"),
            any(RowMapper.class),
            eq(WS),
            eq("IN_PROGRESS"));
    }
}
