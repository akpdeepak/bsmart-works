package com.bcits.works;

import com.bcits.works.shared.ApiException;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Tag("unit")
class CeremonyServiceTest {

    private final CeremonyService service = new CeremonyService(null, null, null, null);

    @Test
    void prepareSession_stampsDefaults() {
        CeremonySession s = new CeremonySession();
        s.setProjectId("PROJ-1");
        s.setCeremonyType("PLANNING");
        service.prepareSession(s, "WS-1", "USR-7");
        assertThat(s.getId()).startsWith("CER-");
        assertThat(s.getWorkspaceId()).isEqualTo("WS-1");
        assertThat(s.getFacilitatorId()).isEqualTo("USR-7");
        assertThat(s.getStatus()).isEqualTo("SCHEDULED");
        assertThat(s.getCreatedAt()).isNotNull();
    }

    @Test
    void prepareSession_rejectsUnknownCeremonyType() {
        CeremonySession s = new CeremonySession();
        s.setProjectId("PROJ-1");
        s.setCeremonyType("TOWNHALL");
        assertThatThrownBy(() -> service.prepareSession(s, "WS-1", "USR-7"))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void markAbsentees_flipsOnlyExpectedRows() {
        List<CeremonyAttendee> rows = List.of(
                attendee("A", "JOINED"), attendee("B", "EXPECTED"),
                attendee("C", "EXCUSED"), attendee("D", "EXPECTED"));
        int absent = CeremonyService.markAbsentees(rows);
        assertThat(absent).isEqualTo(2);
        assertThat(rows.get(0).getStatus()).isEqualTo("JOINED");
        assertThat(rows.get(1).getStatus()).isEqualTo("ABSENT");
        assertThat(rows.get(2).getStatus()).isEqualTo("EXCUSED");
        assertThat(rows.get(3).getStatus()).isEqualTo("ABSENT");
    }

    @Test
    void summarize_countsByStatus() {
        Map<String, Long> counts = CeremonyService.summarize(List.of(
                attendee("A", "JOINED"), attendee("B", "JOINED"),
                attendee("C", "EXPECTED"), attendee("D", "EXCUSED")));
        assertThat(counts.get("joined")).isEqualTo(2);
        assertThat(counts.get("expected")).isEqualTo(1);
        assertThat(counts.get("excused")).isEqualTo(1);
        assertThat(counts.get("absent")).isZero();
    }

    private static CeremonyAttendee attendee(String userId, String status) {
        CeremonyAttendee a = new CeremonyAttendee();
        a.setUserId(userId);
        a.setStatus(status);
        return a;
    }
}
