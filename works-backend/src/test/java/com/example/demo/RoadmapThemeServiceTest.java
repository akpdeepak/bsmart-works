package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("unit")
class RoadmapThemeServiceTest {

    private final RoadmapThemeService service = new RoadmapThemeService(null, null, null);

    @Test
    void prepareNew_stampsDefaults() {
        RoadmapTheme t = new RoadmapTheme();
        t.setName("Mobile-first portal");
        t.setStatus(null);
        service.prepareNew(t, "USR-5");
        assertThat(t.getId()).startsWith("THM-");
        assertThat(t.getCreatedBy()).isEqualTo("USR-5");
        assertThat(t.getStatus()).isEqualTo("PLANNED");
        assertThat(t.getCreatedAt()).isNotNull();
    }

    @Test
    void applyUpdate_copiesEditableFields() {
        RoadmapTheme existing = new RoadmapTheme();
        existing.setName("old");
        RoadmapTheme updated = new RoadmapTheme();
        updated.setName("new");
        updated.setStatus("IN_PROGRESS");
        updated.setQuarter("2026-Q3");
        updated.setDisplayOrder(3);
        service.applyUpdate(existing, updated);
        assertThat(existing.getName()).isEqualTo("new");
        assertThat(existing.getStatus()).isEqualTo("IN_PROGRESS");
        assertThat(existing.getQuarter()).isEqualTo("2026-Q3");
        assertThat(existing.getDisplayOrder()).isEqualTo(3);
        assertThat(existing.getUpdatedAt()).isNotNull();
    }
}
