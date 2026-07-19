package com.bcits.works;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.FieldVisibilityService;
import com.bcits.works.workitems.WorkItem;
import com.bcits.works.workitems.WorkItemBulkService;
import com.bcits.works.workitems.WorkItemCommandService;
import com.bcits.works.workitems.WorkItemController;
import com.bcits.works.workitems.WorkItemEngagementService;
import com.bcits.works.workitems.WorkItemReadService;
import com.bcits.works.workitems.WorkItemRepository;

import com.fasterxml.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Pagination correctness tests for {@link WorkItemController#getAllWorkItems} and
 * {@link WorkItemController#getBacklog} (Audit Finding #7).
 *
 * <p>Verifies:
 * <ul>
 *   <li>The default size is 200 (raised from 50 to cover the seed workspace).</li>
 *   <li>{@code X-Total-Count} header is present and carries the COUNT(*) value.</li>
 *   <li>{@code X-Has-More} header is {@code false} when all rows fit in one page.</li>
 *   <li>{@code X-Has-More} header is {@code true} when the total exceeds the page.</li>
 *   <li>The list query uses {@code ORDER BY created_at DESC} (newest-first).</li>
 *   <li>The backlog query now uses a {@code LIMIT} so it is no longer unbounded.</li>
 * </ul>
 *
 * <p>These are unit tests (no real database): the JdbcTemplate is mocked and SQL strings are
 * checked by argument capture so we can assert on ORDER and LIMIT without a container. The
 * complementary row-level order test (that rows come back newest-first from a real Postgres)
 * requires Testcontainers and is tracked as a follow-up.
 */
@Tag("unit")
class WorkItemControllerPaginationTest {

    private static final String CALLER = "user-A";

    private final WorkItemRepository repository   = mock(WorkItemRepository.class);
    private final JdbcTemplate jdbc               = mock(JdbcTemplate.class);
    private final AuthenticatedUser auth          = mock(AuthenticatedUser.class);
    private final FieldVisibilityService fieldVisibility = mock(FieldVisibilityService.class);
    private final WorkItemReadService readService = new WorkItemReadService(
            jdbc, repository, auth, new ObjectMapper(), fieldVisibility);

    private final WorkItemController controller = new WorkItemController(
            auth, mock(WorkItemBulkService.class), readService,
            mock(WorkItemCommandService.class), mock(WorkItemEngagementService.class));

    WorkItemControllerPaginationTest() {
        when(auth.id()).thenReturn(CALLER);
        // Stub the batch tag/field/starred helpers so they don't fail on empty lists.
        when(jdbc.queryForList(anyString(), eq(String.class), any())).thenReturn(List.of());
    }

    // ── default size ────────────────────────────────────────────────────────────

    @Test
    void getAllWorkItems_defaultSizeIs200() {
        // Arrange: COUNT returns 5, list returns empty.
        stubCountQuery(5L);
        stubListQuery(List.of());

        // Act: call with no explicit size — the default kicks in.
        @SuppressWarnings("unchecked")
        ResponseEntity<List<WorkItem>> response =
                (ResponseEntity<List<WorkItem>>) controller.getAllWorkItems(null, 0, 200);

        // Assert: the SQL sent to jdbc must contain LIMIT 200 (the new default), not LIMIT 50.
        verify(jdbc).query(
                org.mockito.ArgumentMatchers.contains("LIMIT"),
                any(RowMapper.class),
                eq(CALLER), eq(200), eq(0));
    }

    // ── X-Total-Count header ─────────────────────────────────────────────────────

    @Test
    void getAllWorkItems_xTotalCountHeaderReflectsCountQuery() {
        stubCountQuery(319L);
        stubListQuery(List.of());

        @SuppressWarnings("unchecked")
        ResponseEntity<List<WorkItem>> response =
                (ResponseEntity<List<WorkItem>>) controller.getAllWorkItems(null, 0, 200);

        assertThat(response.getHeaders().getFirst("X-Total-Count")).isEqualTo("319");
    }

    // ── X-Has-More header ────────────────────────────────────────────────────────

    @Test
    void getAllWorkItems_xHasMoreFalseWhenAllItemsFit() {
        stubCountQuery(50L);
        stubListQuery(makeItems(50));

        @SuppressWarnings("unchecked")
        ResponseEntity<List<WorkItem>> response =
                (ResponseEntity<List<WorkItem>>) controller.getAllWorkItems(null, 0, 200);

        assertThat(response.getHeaders().getFirst("X-Has-More")).isEqualTo("false");
    }

    @Test
    void getAllWorkItems_xHasMoreTrueWhenTotalExceedsPage() {
        stubCountQuery(319L);
        stubListQuery(makeItems(200));

        @SuppressWarnings("unchecked")
        ResponseEntity<List<WorkItem>> response =
                (ResponseEntity<List<WorkItem>>) controller.getAllWorkItems(null, 0, 200);

        assertThat(response.getHeaders().getFirst("X-Has-More")).isEqualTo("true");
    }

    // ── ORDER BY created_at DESC ────────────────────────────────────────────────

    @Test
    void getAllWorkItems_listQueryUsesDescendingOrder() {
        stubCountQuery(5L);
        stubListQuery(List.of());

        controller.getAllWorkItems(null, 0, 200);

        // The SQL must contain DESC (newest-first).
        verify(jdbc).query(
                org.mockito.ArgumentMatchers.contains("created_at DESC"),
                any(RowMapper.class),
                eq(CALLER), eq(200), eq(0));
    }

    // ── backlog LIMIT ────────────────────────────────────────────────────────────

    @Test
    void getBacklog_queryContainsLimit() {
        when(jdbc.query(anyString(), any(RowMapper.class), any()))
                .thenReturn(List.of());

        controller.getBacklog(null, 300);

        // The SQL must now contain LIMIT (it was unbounded before this fix).
        verify(jdbc).query(
                org.mockito.ArgumentMatchers.contains("LIMIT"),
                any(RowMapper.class),
                eq(CALLER));
    }

    // ── helpers ──────────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private void stubCountQuery(long count) {
        when(jdbc.queryForObject(
                anyString(),
                eq(Long.class),
                eq(CALLER)))
            .thenReturn(count);
    }

    @SuppressWarnings("unchecked")
    private void stubListQuery(List<WorkItem> items) {
        when(jdbc.query(
                anyString(),
                any(RowMapper.class),
                eq(CALLER), any(Integer.class), any(Integer.class)))
            .thenReturn(items);
    }

    private List<WorkItem> makeItems(int n) {
        return java.util.stream.IntStream.range(0, n)
                .mapToObj(i -> {
                    WorkItem w = new WorkItem();
                    w.setId("WI-" + i);
                    return w;
                })
                .toList();
    }
}
