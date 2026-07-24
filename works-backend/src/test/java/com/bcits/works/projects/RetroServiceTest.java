package com.bcits.works.projects;
import com.bcits.works.projects.api.Sprint;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("unit")
class RetroServiceTest {

    private final RetroService service = new RetroService(null, null, null, null, null);

    @Test
    void prepareNew_stampsDefaults() {
        RetroSession s = new RetroSession();
        s.setProjectId("PROJ-1");
        s.setTitle("Sprint 12 retro");
        s.setTemplate(null);
        s.setStatus(null);
        service.prepareNew(s, "WS-1", "USR-3");
        assertThat(s.getId()).startsWith("RET-");
        assertThat(s.getWorkspaceId()).isEqualTo("WS-1");
        assertThat(s.getFacilitatorId()).isEqualTo("USR-3");
        assertThat(s.getTemplate()).isEqualTo("START_STOP_CONTINUE");
        assertThat(s.getStatus()).isEqualTo("ACTIVE");
        assertThat(s.getCreatedAt()).isNotNull();
    }

    @Test
    void applyUpdate_copiesEditableFields() {
        RetroSession existing = new RetroSession();
        existing.setTitle("old");
        RetroSession updated = new RetroSession();
        updated.setTitle("new");
        updated.setTemplate("MAD_SAD_GLAD");
        updated.setStatus("COMPLETED");
        updated.setAnonymous(true);
        service.applyUpdate(existing, updated);
        assertThat(existing.getTitle()).isEqualTo("new");
        assertThat(existing.getTemplate()).isEqualTo("MAD_SAD_GLAD");
        assertThat(existing.getStatus()).isEqualTo("COMPLETED");
        assertThat(existing.isAnonymous()).isTrue();
        assertThat(existing.getUpdatedAt()).isNotNull();
    }
}
