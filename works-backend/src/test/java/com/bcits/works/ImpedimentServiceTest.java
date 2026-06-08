package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("unit")
class ImpedimentServiceTest {

    private final ImpedimentService service = new ImpedimentService(null, null, null);

    @Test
    void prepareNew_stampsIdWorkspaceDefaultsAndDates() {
        Impediment i = new Impediment();
        i.setTitle("CI runner offline");
        service.prepareNew(i, "WS-1", "USR-9");
        assertThat(i.getId()).startsWith("IMP-");
        assertThat(i.getWorkspaceId()).isEqualTo("WS-1");
        assertThat(i.getCreatedBy()).isEqualTo("USR-9");
        assertThat(i.getRaisedBy()).isEqualTo("USR-9");
        assertThat(i.getRaisedAt()).isNotNull();
        assertThat(i.getStatus()).isEqualTo("OPEN");
        assertThat(i.getSeverity()).isEqualTo("MEDIUM");
        assertThat(i.getCreatedAt()).isNotNull();
    }

    @Test
    void applyUpdate_resolvingStampsResolvedDate() {
        Impediment existing = new Impediment();
        existing.setStatus("OPEN");
        Impediment updated = new Impediment();
        updated.setTitle("t");
        updated.setStatus("RESOLVED");
        service.applyUpdate(existing, updated);
        assertThat(existing.getStatus()).isEqualTo("RESOLVED");
        assertThat(existing.getResolvedAt()).isEqualTo(LocalDate.now());
        assertThat(existing.getUpdatedAt()).isNotNull();
    }

    @Test
    void applyUpdate_nonStatusChangeLeavesResolvedNull() {
        Impediment existing = new Impediment();
        existing.setStatus("OPEN");
        Impediment updated = new Impediment();
        updated.setTitle("t");
        updated.setStatus("OPEN");
        service.applyUpdate(existing, updated);
        assertThat(existing.getResolvedAt()).isNull();
    }

    @Test
    void ageDays_countsFromRaisedToTodayOrResolved() {
        Impediment i = new Impediment();
        i.setRaisedAt(LocalDate.of(2026, 6, 1));
        assertThat(ImpedimentServiceAgeProbe.age(i, LocalDate.of(2026, 6, 6))).isEqualTo(5);
        i.setResolvedAt(LocalDate.of(2026, 6, 3));
        assertThat(ImpedimentServiceAgeProbe.age(i, LocalDate.of(2026, 6, 6))).isEqualTo(2);
    }

    /** Exposes the package-private static helper for assertion. */
    static final class ImpedimentServiceAgeProbe {
        static long age(Impediment i, LocalDate today) { return ImpedimentService.ageDays(i, today); }
    }
}
