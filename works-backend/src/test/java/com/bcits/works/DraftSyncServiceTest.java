package com.bcits.works;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.springframework.jdbc.core.JdbcTemplate;

@Tag("unit")
class DraftSyncServiceTest {

    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final RbacService rbac = mock(RbacService.class);
    private final EventService events = mock(EventService.class);
    private final DraftSyncService service = new DraftSyncService(jdbc, rbac, events);

    @Test
    void resolveIsOptimisticConcurrency() {
        assertEquals("APPLIED", DraftSyncService.resolve(3, 3));
        assertEquals("CONFLICT", DraftSyncService.resolve(2, 3));
    }

    private Map<String, Object> row(int version) {
        return Map.of("version", version, "title", "Server title", "description", "d",
                "status", "Todo", "created_by", "USR-1", "assignee_id", "USR-1", "workspace_id", "WS-1");
    }

    @Test
    void appliesWhenVersionsMatch() {
        when(jdbc.queryForList(anyString(), eq("WRK-1"))).thenReturn(List.of(row(2)));
        when(rbac.canEdit(eq("USR-1"), eq("WS-1"), any(), any())).thenReturn(true);

        DraftSyncService.Draft draft = new DraftSyncService.Draft("WRK-1", 2, "New title", null, null);
        List<Map<String, Object>> out = service.syncWorkItemDrafts("USR-1", List.of(draft));

        assertEquals("APPLIED", out.get(0).get("result"));
        verify(jdbc).update(anyString(), eq("New title"), any(), any(), eq("WRK-1"), eq(2));
        verify(events).recordInWorkspace(eq("WS-1"), eq("WRK-1"), anyString(), eq("USR-1"), any());
    }

    @Test
    void conflictsWhenVersionsDiffer_andDoesNotWrite() {
        when(jdbc.queryForList(anyString(), eq("WRK-1"))).thenReturn(List.of(row(5)));
        when(rbac.canEdit(eq("USR-1"), eq("WS-1"), any(), any())).thenReturn(true);

        DraftSyncService.Draft draft = new DraftSyncService.Draft("WRK-1", 2, "New title", null, null);
        List<Map<String, Object>> out = service.syncWorkItemDrafts("USR-1", List.of(draft));

        assertEquals("CONFLICT", out.get(0).get("result"));
        @SuppressWarnings("unchecked")
        Map<String, Object> server = (Map<String, Object>) out.get(0).get("server");
        assertEquals("Server title", server.get("title"));
        verify(jdbc, never()).update(anyString(), eq("New title"), any(), any(), anyString(), any());
    }

    @Test
    void missingItemReported() {
        when(jdbc.queryForList(anyString(), eq("WRK-X"))).thenReturn(List.of());
        DraftSyncService.Draft draft = new DraftSyncService.Draft("WRK-X", 0, "t", null, null);
        List<Map<String, Object>> out = service.syncWorkItemDrafts("USR-1", List.of(draft));
        assertEquals("MISSING", out.get(0).get("result"));
    }

    @Test
    void forbiddenWhenCannotEdit() {
        when(jdbc.queryForList(anyString(), eq("WRK-1"))).thenReturn(List.of(row(2)));
        when(rbac.canEdit(eq("USR-2"), eq("WS-1"), any(), any())).thenReturn(false);
        DraftSyncService.Draft draft = new DraftSyncService.Draft("WRK-1", 2, "t", null, null);
        assertThrows(ApiException.class, () -> service.syncWorkItemDrafts("USR-2", List.of(draft)));
    }
}
