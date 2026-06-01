package com.example.demo;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/**
 * Proves the event payload is valid JSON even when field values contain quotes
 * or backslashes — the pre-fix string-concatenation built malformed JSON.
 */
class EventServiceTest {

    private final EventRepository repo = mock(EventRepository.class);
    private final EventService service = new EventService(repo);
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
    void record_mapOverload_producesValidJson() throws Exception {
        service.record("WRK-2", "WORK_ITEM_CREATED", "USR-1",
                Map.of("title", "say \"hi\"", "type", "Bug"));

        ArgumentCaptor<AppEvent> captor = ArgumentCaptor.forClass(AppEvent.class);
        verify(repo).save(captor.capture());

        JsonNode node = mapper.readTree(captor.getValue().getPayload());
        assertThat(node.get("title").asText()).isEqualTo("say \"hi\"");
        assertThat(node.get("type").asText()).isEqualTo("Bug");
    }
}
