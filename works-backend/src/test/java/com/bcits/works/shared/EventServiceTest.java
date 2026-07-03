package com.bcits.works.shared;

import com.bcits.works.RealtimeService;
import com.bcits.works.WebhookService;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Proves the event payload is valid JSON even when field values contain quotes
 * or backslashes — the pre-fix string-concatenation built malformed JSON.
 */
@Tag("unit")
class EventServiceTest {

    private final EventRepository repo = mock(EventRepository.class);
    private final RealtimeService realtime = mock(RealtimeService.class);
    private final WebhookService webhooks = mock(WebhookService.class);
    private final EventService service = new EventService(repo, realtime, webhooks);
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void recordDiff_escapesQuotesAndBackslashesIntoValidJson() throws Exception {
        service.recordDiff("WRK-1", "WORK_ITEM_UPDATED", "USR-1",
                "title", "fix \"CSRF\" bug", "path C:\\refresh");

        ArgumentCaptor<AppEvent> captor = ArgumentCaptor.forClass(AppEvent.class);
        verify(repo).save(captor.capture());

        JsonNode node = mapper.readTree(captor.getValue().getPayload()); // throws if malformed
        assertThat(node.get("field").asText()).isEqualTo("title");
        assertThat(node.get("from").asText()).isEqualTo("fix \"CSRF\" bug");
        assertThat(node.get("to").asText()).isEqualTo("path C:\\refresh");
    }

    @Test
    void recordDiff_handlesNullValuesAsEmptyStrings() throws Exception {
        service.recordDiff("WRK-1", "ASSIGNED", "USR-1", "assignee", null, "Rahul");

        ArgumentCaptor<AppEvent> captor = ArgumentCaptor.forClass(AppEvent.class);
        verify(repo).save(captor.capture());

        JsonNode node = mapper.readTree(captor.getValue().getPayload());
        assertThat(node.get("from").asText()).isEmpty();
        assertThat(node.get("to").asText()).isEqualTo("Rahul");
    }

    @Test
    void recordInWorkspace_stampsWorkspaceIdAndValidJson() throws Exception {
        service.recordInWorkspace("WS-001", "PROJ-1", "PROJECT_MEMBER_ADDED", "USR-1",
                Map.of("userId", "USR-2", "role", "MEMBER"));

        ArgumentCaptor<AppEvent> captor = ArgumentCaptor.forClass(AppEvent.class);
        verify(repo).save(captor.capture());

        AppEvent saved = captor.getValue();
        assertThat(saved.getWorkspaceId()).isEqualTo("WS-001");   // tenant dimension (RB-40 §1)
        assertThat(saved.getAggregateId()).isEqualTo("PROJ-1");   // aggregate differs from workspace
        assertThat(saved.getEventType()).isEqualTo("PROJECT_MEMBER_ADDED");
        JsonNode node = mapper.readTree(saved.getPayload());
        assertThat(node.get("userId").asText()).isEqualTo("USR-2");
        verify(webhooks).enqueue(org.mockito.ArgumentMatchers.eq("WS-001"),
                org.mockito.ArgumentMatchers.eq("PROJECT_MEMBER_ADDED"),
                org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void record_mapOverload_producesValidJson() throws Exception {
        service.record("WRK-2", "WORK_ITEM_CREATED", "USR-1",
                Map.of("title", "say \"hi\"", "type", "Bug"));

        ArgumentCaptor<AppEvent> captor = ArgumentCaptor.forClass(AppEvent.class);
        verify(repo).save(captor.capture());

        JsonNode node = mapper.readTree(captor.getValue().getPayload());
        assertThat(node.get("title").asText()).isEqualTo("say \"hi\"");
        assertThat(node.get("type").asText()).isEqualTo("Bug");
    }

    @Test
    void eventsFor_returnsAggregateTimelineNewestFirst() {
        AppEvent event = new AppEvent();
        event.setAggregateId("ART-1");
        when(repo.findByAggregateIdOrderByOccurredAtDesc("ART-1")).thenReturn(java.util.List.of(event));

        assertThat(service.eventsFor("ART-1")).containsExactly(event);
    }
}
