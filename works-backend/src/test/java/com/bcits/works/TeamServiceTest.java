package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("unit")
class TeamServiceTest {

    private final TeamService service = new TeamService();

    @Test
    void normalizeProjectIds_defaultsBlankToEmptyArray() {
        assertThat(service.normalizeProjectIds(null)).isEqualTo("[]");
        assertThat(service.normalizeProjectIds("")).isEqualTo("[]");
        assertThat(service.normalizeProjectIds("  ")).isEqualTo("[]");
        assertThat(service.normalizeProjectIds("[\"PRJ-1\"]")).isEqualTo("[\"PRJ-1\"]");
    }

    @Test
    void prepareNew_stampsIdDefaultsAndTimestamps() {
        Team t = new Team();
        t.setName("Web team");
        service.prepareNew(t);
        assertThat(t.getId()).startsWith("TEAM-");
        assertThat(t.getProjectIds()).isEqualTo("[]");
        assertThat(t.getCreatedAt()).isNotNull();
        assertThat(t.getUpdatedAt()).isNotNull();
    }

    @Test
    void prepareNew_preservesProvidedProjectIds() {
        Team t = new Team();
        t.setName("AMR team");
        t.setProjectIds("[\"PRJ-1\",\"PRJ-2\"]");
        service.prepareNew(t);
        assertThat(t.getProjectIds()).isEqualTo("[\"PRJ-1\",\"PRJ-2\"]");
    }

    @Test
    void applyUpdate_copiesEditableFieldsAndBumpsUpdatedAt() {
        Team existing = new Team();
        existing.setId("TEAM-X");
        existing.setName("Old");
        Team updated = new Team();
        updated.setName("New");
        updated.setDescription("desc");
        updated.setProjectIds("[\"PRJ-3\"]");
        service.applyUpdate(existing, updated);
        assertThat(existing.getName()).isEqualTo("New");
        assertThat(existing.getDescription()).isEqualTo("desc");
        assertThat(existing.getProjectIds()).isEqualTo("[\"PRJ-3\"]");
        assertThat(existing.getId()).isEqualTo("TEAM-X");
        assertThat(existing.getUpdatedAt()).isNotNull();
    }

    @Test
    void applyUpdate_blankProjectIdsBecomeEmptyArray() {
        Team existing = new Team();
        existing.setName("T");
        Team updated = new Team();
        updated.setName("T");
        updated.setProjectIds("");
        service.applyUpdate(existing, updated);
        assertThat(existing.getProjectIds()).isEqualTo("[]");
    }
}
