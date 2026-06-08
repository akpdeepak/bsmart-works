package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("unit")
class StandupServiceTest {

    private final StandupService service = new StandupService(null, null, null, null);

    @Test
    void prepareSession_stampsDefaults() {
        StandupSession s = new StandupSession();
        s.setProjectId("PROJ-1");
        service.prepareSession(s, "WS-1", "USR-7");
        assertThat(s.getId()).startsWith("STD-");
        assertThat(s.getWorkspaceId()).isEqualTo("WS-1");
        assertThat(s.getFacilitatorId()).isEqualTo("USR-7");
        assertThat(s.getSessionDate()).isNotNull();
        assertThat(s.getStatus()).isEqualTo("IN_PROGRESS");
    }

    @Test
    void nextMember_walksDisplayOrderThenReturnsNullAtEnd() {
        List<StandupEntry> ordered = List.of(entry("A", 0), entry("B", 1), entry("C", 2));
        assertThat(StandupService.nextMember(ordered, "A")).isEqualTo("B");
        assertThat(StandupService.nextMember(ordered, "B")).isEqualTo("C");
        assertThat(StandupService.nextMember(ordered, "C")).isNull();
    }

    @Test
    void nextMember_unknownCursorStartsFromFirst() {
        List<StandupEntry> ordered = List.of(entry("A", 0), entry("B", 1));
        assertThat(StandupService.nextMember(ordered, null)).isEqualTo("A");
    }

    private static StandupEntry entry(String member, int order) {
        StandupEntry e = new StandupEntry();
        e.setMemberId(member);
        e.setDisplayOrder(order);
        return e;
    }
}
