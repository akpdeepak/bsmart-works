package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Unit tests for the watcher fan-out logic (no DB). */
@Tag("unit")
class WatcherServiceTest {

    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final NotificationRepository notifications = mock(NotificationRepository.class);
    private final WatcherService service = new WatcherService(jdbc, notifications);

    @Test
    void watch_insertsIdempotently() {
        service.watch("WI-1", "u1");
        verify(jdbc).update(contains("ON CONFLICT DO NOTHING"), eq("WI-1"), eq("u1"));
    }

    @Test
    void watch_ignoresNulls() {
        service.watch(null, "u1");
        service.watch("WI-1", null);
        verify(jdbc, never()).update(anyString(), any(), any());
    }

    @Test
    void unwatch_deletesTheRow() {
        service.unwatch("WI-1", "u1");
        verify(jdbc).update(contains("DELETE FROM work_item_watchers"), eq("WI-1"), eq("u1"));
    }

    @Test
    void notifyWatchers_fansOutToEveryWatcherExceptExcluded() {
        when(jdbc.queryForList(anyString(), eq(String.class), eq("WI-1")))
                .thenReturn(List.of("u1", "u2", "actor"));

        service.notifyWatchers("WI-1", "Alice updated WI-1", Set.of("actor"));

        ArgumentCaptor<Notification> cap = ArgumentCaptor.forClass(Notification.class);
        verify(notifications, times(2)).save(cap.capture());
        assertThat(cap.getAllValues()).extracting(Notification::getUserId).containsExactlyInAnyOrder("u1", "u2");
        assertThat(cap.getAllValues()).allSatisfy(n -> {
            assertThat(n.getType()).isEqualTo("WATCH");
            assertThat(n.getLink()).isEqualTo("/items/WI-1");
            assertThat(n.isRead()).isFalse();
            assertThat(n.getMessage()).isEqualTo("Alice updated WI-1");
        });
    }

    @Test
    void notifyWatchers_noWatchers_savesNothing() {
        when(jdbc.queryForList(anyString(), eq(String.class), eq("WI-1"))).thenReturn(List.of());
        service.notifyWatchers("WI-1", "msg", Set.of());
        verify(notifications, never()).save(any());
    }
}
