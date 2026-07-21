package com.bcits.works;

import com.bcits.works.shared.ApiException;
import com.bcits.works.security.ComplianceViolation;
import com.bcits.works.security.ComplianceViolationService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("unit")
class ComplianceViolationServiceTest {

    private final ComplianceViolationService service = new ComplianceViolationService();

    private ComplianceViolation open() {
        ComplianceViolation v = new ComplianceViolation();
        v.setId("CV-1");
        v.setStatus("OPEN");
        v.setDetectedAt(OffsetDateTime.now().minusHours(5));
        return v;
    }

    @Test
    void acknowledge_setsStatusAndActor() {
        ComplianceViolation v = service.acknowledge(open(), "user-9");
        assertEquals("ACKNOWLEDGED", v.getStatus());
        assertEquals("user-9", v.getAcknowledgedBy());
        assertNotNull(v.getAcknowledgedAt());
    }

    @Test
    void resolve_marksManualResolution() {
        ComplianceViolation v = service.resolve(open(), "user-9", "fixed it");
        assertEquals("RESOLVED", v.getStatus());
        assertEquals("MANUAL", v.getResolution());
        assertEquals("user-9", v.getResolvedBy());
        assertEquals("fixed it", v.getNote());
    }

    @Test
    void wontFix_marksWontFix() {
        ComplianceViolation v = service.wontFix(open(), "user-9", "accepted deviation");
        assertEquals("WONT_FIX", v.getStatus());
        assertEquals("WONT_FIX", v.getResolution());
    }

    @Test
    void terminalViolation_cannotTransitionAgain() {
        ComplianceViolation resolved = service.resolve(open(), "user-9", null);
        assertFalse(service.isOpen(resolved));
        assertThrows(ApiException.class, () -> service.acknowledge(resolved, "user-9"));
        assertThrows(ApiException.class, () -> service.resolve(resolved, "user-9", null));
    }

    @Test
    void escalationDue_onlyForAgedOpenUnescalated() {
        OffsetDateTime now = OffsetDateTime.now();
        ComplianceViolation v = open(); // detected 5h ago, OPEN, not escalated
        assertTrue(service.isEscalationDue(v, 4, now));      // 4h window elapsed
        assertFalse(service.isEscalationDue(v, 8, now));     // 8h window not yet elapsed
        assertFalse(service.isEscalationDue(v, null, now));  // no policy
        assertFalse(service.isEscalationDue(v, 0, now));     // zero/!positive window

        v.setEscalated(true);
        assertFalse(service.isEscalationDue(v, 4, now));     // already escalated

        ComplianceViolation acked = open();
        acked.setStatus("ACKNOWLEDGED");
        assertFalse(service.isEscalationDue(acked, 1, now)); // acknowledged stops the clock
    }
}
