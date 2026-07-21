package com.bcits.works;
import com.bcits.works.sla.CustomerSlaTier;
import com.bcits.works.service.ServiceRequest;
import com.bcits.works.service.ServiceRequestService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("unit")
class ServiceRequestServiceTest {

    private final ServiceRequestService service = new ServiceRequestService();

    private ServiceRequest req() {
        ServiceRequest r = new ServiceRequest();
        r.setSubject("AMR mesh outage");
        r.setPriority(null); // the portal sets priority from the request body (null when not chosen)
        return r;
    }

    private CustomerSlaTier tier(String name, int response, int resolution) {
        CustomerSlaTier t = new CustomerSlaTier();
        t.setTier(name);
        t.setResponseMinutes(response);
        t.setResolutionMinutes(resolution);
        return t;
    }

    private RequestType type() {
        RequestType t = new RequestType();
        t.setId("RT-INC");
        t.setTypeKey("INCIDENT");
        t.setDefaultPriority("HIGH");
        return t;
    }

    // ── normalization ──────────────────────────────────────────────────────────────
    @Test
    void normalizePriority_knownUppercasedElseMedium() {
        assertEquals("CRITICAL", service.normalizePriority("critical"));
        assertEquals("MEDIUM", service.normalizePriority("bogus"));
        assertEquals("MEDIUM", service.normalizePriority(null));
    }

    @Test
    void normalizeStatus_unknownFallsBackToNew() {
        assertEquals("OPEN", service.normalizeStatus("open"));
        assertEquals("NEW", service.normalizeStatus("nonsense"));
        assertEquals("NEW", service.normalizeStatus(null));
    }

    // ── prepareNew ────────────────────────────────────────────────────────────────
    @Test
    void prepareNew_stampsIdTypeDefaultsAndSlaDeadline() {
        ServiceRequest prepared = service.prepareNew(req(), type(), tier("PLATINUM", 15, 30));

        assertTrue(prepared.getId().startsWith("SR-"));
        assertEquals("INCIDENT", prepared.getTypeKey());
        assertEquals("RT-INC", prepared.getRequestTypeId());
        assertEquals("HIGH", prepared.getPriority());        // defaulted from the type
        assertEquals("NEW", prepared.getStatus());
        assertEquals("{}", prepared.getFormData());
        assertEquals("PLATINUM", prepared.getSlaTier());
        assertEquals(30, prepared.getSlaResolutionMinutes());
        assertNotNull(prepared.getSlaDueAt());
        // due ≈ now + 30m
        long mins = java.time.temporal.ChronoUnit.MINUTES.between(prepared.getCreatedAt(), prepared.getSlaDueAt());
        assertEquals(30, mins);
    }

    @Test
    void prepareNew_withoutTierLeavesNoSla() {
        ServiceRequest prepared = service.prepareNew(req(), type(), null);
        assertNull(prepared.getSlaDueAt());
        assertNull(prepared.getSlaTier());
    }

    @Test
    void prepareNew_keepsExplicitPriorityOverTypeDefault() {
        ServiceRequest r = req();
        r.setPriority("low");
        assertEquals("LOW", service.prepareNew(r, type(), null).getPriority());
    }

    // ── transitions ──────────────────────────────────────────────────────────────
    @Test
    void canTransition_enforcesLifecycle() {
        assertTrue(service.canTransition("NEW", "OPEN"));
        assertTrue(service.canTransition("RESOLVED", "CLOSED"));
        assertFalse(service.canTransition("NEW", "CLOSED"));
        assertFalse(service.canTransition("CLOSED", "RESOLVED"));
        assertFalse(service.canTransition(null, "OPEN"));
    }

    @Test
    void applyTransition_newToOpenStampsFirstResponse() {
        ServiceRequest r = req();
        r.setStatus("NEW");
        service.applyTransition(r, "OPEN", "agent-1");
        assertEquals("OPEN", r.getStatus());
        assertNotNull(r.getFirstRespondedAt());
    }

    @Test
    void applyTransition_toResolvedStampsResolvedAt() {
        ServiceRequest r = req();
        r.setStatus("IN_PROGRESS");
        service.applyTransition(r, "RESOLVED", "agent-1");
        assertEquals("RESOLVED", r.getStatus());
        assertNotNull(r.getResolvedAt());
    }

    @Test
    void applyTransition_reopenClearsResolvedAndClosed() {
        ServiceRequest r = req();
        r.setStatus("RESOLVED");
        r.setResolvedAt(OffsetDateTime.now());
        service.applyTransition(r, "OPEN", "agent-1");
        assertEquals("OPEN", r.getStatus());
        assertNull(r.getResolvedAt());
    }

    @Test
    void applyTransition_illegalThrows() {
        ServiceRequest r = req();
        r.setStatus("NEW");
        assertThrows(IllegalStateException.class, () -> service.applyTransition(r, "CLOSED", "agent-1"));
    }

    @Test
    void applyTransition_sameStatusIsNoOp() {
        ServiceRequest r = req();
        r.setStatus("OPEN");
        ServiceRequest result = service.applyTransition(r, "OPEN", "agent-1");
        assertEquals("OPEN", result.getStatus());
    }

    @Test
    void assign_picksUpFromQueueAndOpensNewRequest() {
        ServiceRequest r = req();
        r.setStatus("NEW");
        service.assign(r, "agent-7");
        assertEquals("agent-7", r.getAssigneeId());
        assertEquals("OPEN", r.getStatus());
        assertNotNull(r.getFirstRespondedAt());
    }

    // ── SLA computation ────────────────────────────────────────────────────────────
    @Test
    void computeSla_noDeadlineIsNone() {
        assertEquals("NONE", service.computeSla(req(), OffsetDateTime.now()).state());
    }

    @Test
    void computeSla_openWithPlentyOfTimeIsOnTrack() {
        OffsetDateTime now = OffsetDateTime.now();
        ServiceRequest r = req();
        r.setStatus("OPEN");
        r.setSlaResolutionMinutes(120);
        r.setSlaDueAt(now.plusMinutes(100));
        assertEquals("ON_TRACK", service.computeSla(r, now).state());
    }

    @Test
    void computeSla_openInsideLastQuarterIsAtRisk() {
        OffsetDateTime now = OffsetDateTime.now();
        ServiceRequest r = req();
        r.setStatus("OPEN");
        r.setSlaResolutionMinutes(120);
        r.setSlaDueAt(now.plusMinutes(20)); // 20 <= 120/4 = 30
        ServiceRequestService.SlaSnapshot s = service.computeSla(r, now);
        assertEquals("AT_RISK", s.state());
        assertFalse(s.breached());
    }

    @Test
    void computeSla_openPastDeadlineIsBreached() {
        OffsetDateTime now = OffsetDateTime.now();
        ServiceRequest r = req();
        r.setStatus("OPEN");
        r.setSlaResolutionMinutes(120);
        r.setSlaDueAt(now.minusMinutes(5));
        ServiceRequestService.SlaSnapshot s = service.computeSla(r, now);
        assertEquals("BREACHED", s.state());
        assertTrue(s.breached());
        assertTrue(s.minutesRemaining() < 0);
    }

    @Test
    void computeSla_resolvedBeforeDeadlineIsMet() {
        OffsetDateTime now = OffsetDateTime.now();
        ServiceRequest r = req();
        r.setStatus("RESOLVED");
        r.setSlaDueAt(now.plusMinutes(30));
        r.setResolvedAt(now); // resolved 30m before the deadline
        assertEquals("MET", service.computeSla(r, now.plusHours(2)).state());
    }

    @Test
    void computeSla_resolvedAfterDeadlineIsBreached() {
        OffsetDateTime now = OffsetDateTime.now();
        ServiceRequest r = req();
        r.setStatus("RESOLVED");
        r.setSlaDueAt(now.minusMinutes(10));
        r.setResolvedAt(now); // resolved 10m after the deadline
        assertEquals("BREACHED", service.computeSla(r, now.plusHours(2)).state());
    }
}
