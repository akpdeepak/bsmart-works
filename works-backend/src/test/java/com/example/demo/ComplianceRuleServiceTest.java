package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("unit")
class ComplianceRuleServiceTest {

    private final ComplianceRuleService service = new ComplianceRuleService();

    @Test
    void normalizeSeverity_uppercasesKnownValue() {
        assertEquals("HIGH", service.normalizeSeverity("high"));
        assertEquals("CRITICAL", service.normalizeSeverity("  Critical "));
    }

    @Test
    void normalizeSeverity_unknownOrNullFallsBackToMedium() {
        assertEquals("MEDIUM", service.normalizeSeverity("bogus"));
        assertEquals("MEDIUM", service.normalizeSeverity(null));
    }

    @Test
    void normalizeNotifyTo_blankBecomesEmptyArray() {
        assertEquals("[]", service.normalizeNotifyTo(null));
        assertEquals("[]", service.normalizeNotifyTo("   "));
        assertEquals("[\"owner\"]", service.normalizeNotifyTo("[\"owner\"]"));
    }

    @Test
    void prepareNew_setsIdCreatorDefaultsAndStartsInactive() {
        ComplianceRule rule = new ComplianceRule();
        rule.setName("Stories need acceptance criteria");
        rule.setScopeBql("  type = Story  ");
        rule.setAssertionBql("status != In Progress");
        rule.setSeverity("high");

        ComplianceRule prepared = service.prepareNew(rule, "user-7");

        assertNotNull(prepared.getId());
        assertTrue(prepared.getId().startsWith("CR-"));
        assertEquals("user-7", prepared.getCreatedBy());
        assertEquals("type = Story", prepared.getScopeBql());   // trimmed
        assertEquals("HIGH", prepared.getSeverity());           // normalized
        assertEquals("[]", prepared.getNotifyTo());             // defaulted
        assertFalse(prepared.getActive());                      // test-before-activate
        assertFalse(prepared.getIsTemplate());
        assertNotNull(prepared.getCreatedAt());
        assertEquals(prepared.getCreatedAt(), prepared.getUpdatedAt());
    }

    @Test
    void prepareNew_honoursTemplateFlag() {
        ComplianceRule rule = new ComplianceRule();
        rule.setName("Orphan story");
        rule.setAssertionBql("parent != null");
        rule.setIsTemplate(true);

        assertTrue(service.prepareNew(rule, "user-7").getIsTemplate());
    }

    @Test
    void applyUpdate_copiesEditableFieldsAndBumpsUpdatedAt() {
        ComplianceRule existing = new ComplianceRule();
        existing.setCreatedBy("owner-1");
        existing.setName("old");
        existing.setUpdatedAt(OffsetDateTime.now().minusDays(1));

        ComplianceRule updated = new ComplianceRule();
        updated.setName("new name");
        updated.setDescription("desc");
        updated.setScopeBql("  status = Open ");
        updated.setSeverity("low");

        ComplianceRule result = service.applyUpdate(existing, updated);

        assertEquals("new name", result.getName());
        assertEquals("desc", result.getDescription());
        assertEquals("status = Open", result.getScopeBql());    // trimmed
        assertEquals("LOW", result.getSeverity());              // normalized
        assertEquals("owner-1", result.getCreatedBy());         // identity preserved
        assertTrue(result.getUpdatedAt().isAfter(OffsetDateTime.now().minusMinutes(1)));
    }
}
