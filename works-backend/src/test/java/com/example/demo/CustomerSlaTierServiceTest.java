package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@Tag("unit")
class CustomerSlaTierServiceTest {

    private final CustomerSlaTierService service = new CustomerSlaTierService();

    private CustomerSlaTier tier(Integer response, Integer resolution) {
        CustomerSlaTier t = new CustomerSlaTier();
        t.setTier("platinum");
        t.setResponseMinutes(response);
        t.setResolutionMinutes(resolution);
        return t;
    }

    @Test
    void hasValidTargets_requiresPositiveMinutes() {
        assertTrue(service.hasValidTargets(tier(15, 30)));
        assertFalse(service.hasValidTargets(tier(0, 30)));
        assertFalse(service.hasValidTargets(tier(15, null)));
        assertFalse(service.hasValidTargets(tier(null, null)));
    }

    @Test
    void prepareNew_setsIdNormalizesTier() {
        CustomerSlaTier prepared = service.prepareNew(tier(15, 30));
        assertTrue(prepared.getId().startsWith("SLT-"));
        assertEquals("PLATINUM", prepared.getTier());
        assertTrue(prepared.getActive());
        assertNotNull(prepared.getUpdatedAt());
    }

    @Test
    void applyUpdate_copiesMinutesAndBumpsTimestamp() {
        CustomerSlaTier existing = tier(15, 30);
        existing.setId("SLT-1");
        CustomerSlaTier updated = new CustomerSlaTier();
        updated.setResolutionMinutes(45);

        CustomerSlaTier result = service.applyUpdate(existing, updated);
        assertEquals(45, result.getResolutionMinutes());
        assertEquals(15, result.getResponseMinutes()); // untouched
        assertNotNull(result.getUpdatedAt());
    }
}
