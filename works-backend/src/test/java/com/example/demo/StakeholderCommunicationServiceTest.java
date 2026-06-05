package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("unit")
class StakeholderCommunicationServiceTest {

    private final StakeholderCommunicationService service =
            new StakeholderCommunicationService(null, null, null);

    @Test
    void prepareNew_stampsIdDefaultsAndDates() {
        StakeholderCommunication c = new StakeholderCommunication();
        c.setSubject("Release 2.0 is live");
        c.setChannel(null);
        c.setStatus(null);
        c.setStakeholderIds(null);
        service.prepareNew(c, "USR-9");
        assertThat(c.getId()).startsWith("STK-");
        assertThat(c.getCreatedBy()).isEqualTo("USR-9");
        assertThat(c.getChannel()).isEqualTo("EMAIL");
        assertThat(c.getStatus()).isEqualTo("DRAFT");
        assertThat(c.getStakeholderIds()).isEqualTo("[]");
        assertThat(c.getCreatedAt()).isNotNull();
        assertThat(c.getUpdatedAt()).isNotNull();
    }

    @Test
    void applyUpdate_copiesEditableFieldsAndDefaultsStakeholderIds() {
        StakeholderCommunication existing = new StakeholderCommunication();
        existing.setSubject("old");
        existing.setStatus("DRAFT");

        StakeholderCommunication updated = new StakeholderCommunication();
        updated.setSubject("new subject");
        updated.setBody("body text");
        updated.setChannel("PORTAL");
        updated.setRelatedReleaseId("REL-1");
        updated.setStakeholderIds(null);

        service.applyUpdate(existing, updated);
        assertThat(existing.getSubject()).isEqualTo("new subject");
        assertThat(existing.getBody()).isEqualTo("body text");
        assertThat(existing.getChannel()).isEqualTo("PORTAL");
        assertThat(existing.getRelatedReleaseId()).isEqualTo("REL-1");
        assertThat(existing.getStakeholderIds()).isEqualTo("[]");
        assertThat(existing.getStatus()).isEqualTo("DRAFT");
        assertThat(existing.getUpdatedAt()).isNotNull();
    }
}
