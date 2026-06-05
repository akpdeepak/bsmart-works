package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@Tag("unit")
class RequestTypeServiceTest {

    private final RequestTypeService service = new RequestTypeService();

    @Test
    void normalizeKey_uppersnakesOrCustom() {
        assertEquals("INCIDENT", service.normalizeKey("incident"));
        assertEquals("NEW_USER_ACCESS", service.normalizeKey("New user access"));
        assertEquals("CUSTOM", service.normalizeKey(null));
        assertEquals("CUSTOM", service.normalizeKey("  "));
    }

    @Test
    void normalizePriority_knownElseMedium() {
        assertEquals("HIGH", service.normalizePriority("high"));
        assertEquals("MEDIUM", service.normalizePriority("weird"));
    }

    @Test
    void normalizeFormSchema_blankBecomesEmptyArray() {
        assertEquals("[]", service.normalizeFormSchema(null));
        assertEquals("[]", service.normalizeFormSchema("  "));
        assertEquals("[{\"key\":\"x\"}]", service.normalizeFormSchema("[{\"key\":\"x\"}]"));
    }

    @Test
    void prepareNew_setsIdDefaultsAndNeverSystem() {
        RequestType t = new RequestType();
        t.setName("Report an incident");
        t.setTypeKey("incident");
        t.setDefaultPriority("high");
        t.setIsSystem(true); // must be forced false on this path

        RequestType prepared = service.prepareNew(t, "user-1");
        assertTrue(prepared.getId().startsWith("RT-"));
        assertEquals("INCIDENT", prepared.getTypeKey());
        assertEquals("HIGH", prepared.getDefaultPriority());
        assertEquals("[]", prepared.getFormSchema());
        assertFalse(prepared.getIsSystem());
        assertTrue(prepared.getActive());
        assertEquals(0, prepared.getSortOrder());
    }

    @Test
    void applyUpdate_copiesProvidedFields() {
        RequestType existing = new RequestType();
        existing.setName("old");
        existing.setFormSchema("[]");

        RequestType updated = new RequestType();
        updated.setName("Service request");
        updated.setFormSchema("[{\"key\":\"service\"}]");
        updated.setDefaultPriority("low");

        RequestType result = service.applyUpdate(existing, updated);
        assertEquals("Service request", result.getName());
        assertEquals("[{\"key\":\"service\"}]", result.getFormSchema());
        assertEquals("LOW", result.getDefaultPriority());
        assertNotNull(result.getUpdatedAt());
    }
}
