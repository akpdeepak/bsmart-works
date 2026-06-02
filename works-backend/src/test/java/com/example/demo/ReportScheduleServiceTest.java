package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("unit")
class ReportScheduleServiceTest {

    private final ReportScheduleService service = new ReportScheduleService();
    private final OffsetDateTime base = OffsetDateTime.parse("2026-06-02T08:00:00Z");

    @Test
    void computeNextRun_byCadence_caseInsensitiveWithWeeklyDefault() {
        assertThat(service.computeNextRun("DAILY", base)).isEqualTo(base.plusDays(1));
        assertThat(service.computeNextRun("WEEKLY", base)).isEqualTo(base.plusWeeks(1));
        assertThat(service.computeNextRun("MONTHLY", base)).isEqualTo(base.plusMonths(1));
        assertThat(service.computeNextRun("daily", base)).isEqualTo(base.plusDays(1));
        assertThat(service.computeNextRun(null, base)).isEqualTo(base.plusWeeks(1));
        assertThat(service.computeNextRun("nonsense", base)).isEqualTo(base.plusWeeks(1));
    }

    @Test
    void isDue_trueOnlyWhenActiveAndNextRunReached() {
        ReportSchedule s = new ReportSchedule();
        s.setActive(true);
        s.setNextRunAt(base);
        assertThat(service.isDue(s, base)).isTrue();
        assertThat(service.isDue(s, base.plusSeconds(1))).isTrue();
        assertThat(service.isDue(s, base.minusSeconds(1))).isFalse();
        s.setActive(false);
        assertThat(service.isDue(s, base.plusDays(1))).isFalse();
        s.setActive(true);
        s.setNextRunAt(null);
        assertThat(service.isDue(s, base)).isFalse();
        assertThat(service.isDue(null, base)).isFalse();
    }

    @Test
    void prepareNew_stampsIdOwnerDefaultsAndFirstRun() {
        ReportSchedule s = new ReportSchedule();
        s.setReportId("RPT-1");
        service.prepareNew(s, "USR-1");
        assertThat(s.getId()).startsWith("RSCH-");
        assertThat(s.getOwnerId()).isEqualTo("USR-1");
        assertThat(s.getCadence()).isEqualTo("WEEKLY");
        assertThat(s.getChannel()).isEqualTo("IN_APP");
        assertThat(s.getActive()).isTrue();
        assertThat(s.getLastRunAt()).isNull();
        assertThat(s.getNextRunAt()).isNotNull();
        assertThat(s.getCreatedAt()).isNotNull();
    }

    @Test
    void prepareNew_preservesProvidedCadenceChannelActive() {
        ReportSchedule s = new ReportSchedule();
        s.setReportId("RPT-1");
        s.setCadence("DAILY");
        s.setChannel("BOTH");
        s.setActive(false);
        service.prepareNew(s, "USR-2");
        assertThat(s.getCadence()).isEqualTo("DAILY");
        assertThat(s.getChannel()).isEqualTo("BOTH");
        assertThat(s.getActive()).isFalse();
    }

    @Test
    void applyUpdate_changingCadenceReschedulesAndCopiesFields() {
        ReportSchedule existing = new ReportSchedule();
        existing.setReportId("RPT-1");
        existing.setCadence("WEEKLY");
        existing.setNextRunAt(base);

        ReportSchedule updated = new ReportSchedule();
        updated.setCadence("DAILY");
        updated.setChannel("EMAIL");
        updated.setRecipients("USR-2,USR-3");
        updated.setActive(false);

        service.applyUpdate(existing, updated);

        assertThat(existing.getCadence()).isEqualTo("DAILY");
        assertThat(existing.getChannel()).isEqualTo("EMAIL");
        assertThat(existing.getRecipients()).isEqualTo("USR-2,USR-3");
        assertThat(existing.getActive()).isFalse();
        assertThat(existing.getNextRunAt()).isNotEqualTo(base);
    }
}
