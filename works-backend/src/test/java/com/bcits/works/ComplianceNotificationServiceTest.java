package com.bcits.works;
import com.bcits.works.security.ComplianceNotificationService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("unit")
class ComplianceNotificationServiceTest {

    // parseTargets() is pure — collaborators are unused, so nulls are safe.
    private final ComplianceNotificationService service =
        new ComplianceNotificationService(null, null, null);

    @Test
    void parseTargets_readsObjectForm() {
        List<ComplianceNotificationService.Target> targets = service.parseTargets(
            "[{\"type\":\"ITEM_OWNER\"},{\"type\":\"USER\",\"value\":\"USR-7\"},{\"type\":\"EMAIL\",\"value\":\"a@b.com\"}]");
        assertEquals(3, targets.size());
        assertEquals("ITEM_OWNER", targets.get(0).type());
        assertEquals("USR-7", targets.get(1).value());
        assertEquals("a@b.com", targets.get(2).value());
    }

    @Test
    void parseTargets_readsStringShorthand() {
        List<ComplianceNotificationService.Target> targets = service.parseTargets("[\"PROJECT_ADMIN\"]");
        assertEquals(1, targets.size());
        assertEquals("PROJECT_ADMIN", targets.get(0).type());
    }

    @Test
    void parseTargets_nullBlankOrMalformedIsEmpty() {
        assertTrue(service.parseTargets(null).isEmpty());
        assertTrue(service.parseTargets("   ").isEmpty());
        assertTrue(service.parseTargets("not json").isEmpty());
        assertTrue(service.parseTargets("[]").isEmpty());
    }
}
