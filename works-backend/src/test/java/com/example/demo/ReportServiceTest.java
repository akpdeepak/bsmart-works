package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("unit")
class ReportServiceTest {

    private final ReportService service = new ReportService();

    @Test
    void normalizeSections_defaultsBlankToEmptyArray() {
        assertThat(service.normalizeSections(null)).isEqualTo("[]");
        assertThat(service.normalizeSections("")).isEqualTo("[]");
        assertThat(service.normalizeSections("   ")).isEqualTo("[]");
        assertThat(service.normalizeSections("[{\"type\":\"kpi\"}]")).isEqualTo("[{\"type\":\"kpi\"}]");
    }

    @Test
    void prepareNew_stampsIdOwnerDefaultsAndTimestamps() {
        Report r = new Report();
        r.setName("Sprint status");
        service.prepareNew(r, "USR-1");
        assertThat(r.getId()).startsWith("RPT-");
        assertThat(r.getOwnerId()).isEqualTo("USR-1");
        assertThat(r.getSections()).isEqualTo("[]");
        assertThat(r.getIsTemplate()).isFalse();
        assertThat(r.getCreatedAt()).isNotNull();
        assertThat(r.getUpdatedAt()).isNotNull();
    }

    @Test
    void prepareNew_preservesProvidedSectionsAndTemplateFlag() {
        Report r = new Report();
        r.setName("Tpl");
        r.setSections("[{\"type\":\"chart\"}]");
        r.setIsTemplate(true);
        service.prepareNew(r, "USR-2");
        assertThat(r.getSections()).isEqualTo("[{\"type\":\"chart\"}]");
        assertThat(r.getIsTemplate()).isTrue();
    }

    @Test
    void applyUpdate_copiesEditableFieldsAndBumpsUpdatedAt() {
        Report existing = new Report();
        existing.setId("RPT-X");
        existing.setOwnerId("USR-1");
        existing.setName("Old");
        existing.setCreatedAt(OffsetDateTime.now().minusDays(1));

        Report updated = new Report();
        updated.setName("New");
        updated.setDescription("desc");
        updated.setSections("[{\"type\":\"table\"}]");
        updated.setProjectId("PRJ-1");

        service.applyUpdate(existing, updated);

        assertThat(existing.getName()).isEqualTo("New");
        assertThat(existing.getDescription()).isEqualTo("desc");
        assertThat(existing.getSections()).isEqualTo("[{\"type\":\"table\"}]");
        assertThat(existing.getProjectId()).isEqualTo("PRJ-1");
        assertThat(existing.getId()).isEqualTo("RPT-X");       // identity unchanged
        assertThat(existing.getOwnerId()).isEqualTo("USR-1");  // owner unchanged
        assertThat(existing.getUpdatedAt()).isNotNull();
    }

    @Test
    void applyUpdate_blankSectionsBecomeEmptyArray() {
        Report existing = new Report();
        existing.setName("R");
        Report updated = new Report();
        updated.setName("R");
        updated.setSections("");
        service.applyUpdate(existing, updated);
        assertThat(existing.getSections()).isEqualTo("[]");
    }
}
