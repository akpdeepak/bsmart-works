package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("unit")
class SlaPolicyServiceTest {

    private final SlaPolicyService service = new SlaPolicyService();

    @Test
    void normalizeMetric_knownValuesAndFallback() {
        assertEquals("FIRST_RESPONSE", service.normalizeMetric("first response"));
        assertEquals("RESOLUTION", service.normalizeMetric("resolution"));
        assertEquals("RESOLUTION", service.normalizeMetric("bogus"));
        assertEquals("RESOLUTION", service.normalizeMetric(null));
    }

    @Test
    void normalizeAction_knownValuesAndFallback() {
        assertEquals("REASSIGN", service.normalizeAction("reassign"));
        assertEquals("NOTIFY", service.normalizeAction("whatever"));
        assertEquals("NOTIFY", service.normalizeAction(null));
    }

    @Test
    void normalizeThreshold_clampsToRange() {
        assertEquals(80, service.normalizeThreshold(null));
        assertEquals(1, service.normalizeThreshold(0));
        assertEquals(1, service.normalizeThreshold(-5));
        assertEquals(100, service.normalizeThreshold(250));
        assertEquals(75, service.normalizeThreshold(75));
    }

    @Test
    void parseStopStatuses_splitsAndTrims() {
        assertEquals(List.of("Done", "Resolved"), service.parseStopStatuses("Done, Resolved"));
        assertEquals(List.of("Done"), service.parseStopStatuses("Done"));
        assertTrue(service.parseStopStatuses(null).isEmpty());
        assertTrue(service.parseStopStatuses("  ,  ").isEmpty());
    }

    @Test
    void prepareNew_setsIdCreatorDefaultsAndStartsInactive() {
        SlaPolicy p = new SlaPolicy();
        p.setName("P0");
        p.setScopeBql("  priority = Highest  ");
        SlaPolicy prepared = service.prepareNew(p, "user-1");

        assertNotNull(prepared.getId());
        assertTrue(prepared.getId().startsWith("SLA-"));
        assertEquals("user-1", prepared.getCreatedBy());
        assertEquals("priority = Highest", prepared.getScopeBql()); // trimmed
        assertEquals("[]", prepared.getPauseStatuses());             // defaulted
        assertFalse(prepared.getActive());                          // test-before-activate
        assertFalse(prepared.getIsTemplate());
        assertEquals(prepared.getCreatedAt(), prepared.getUpdatedAt());
    }

    @Test
    void applyUpdate_copiesEditableFieldsAndBumpsUpdatedAt() {
        SlaPolicy existing = new SlaPolicy();
        existing.setCreatedBy("owner-1");
        existing.setName("old");
        SlaPolicy updated = new SlaPolicy();
        updated.setName("new");
        updated.setScopeBql("  type = Bug ");
        updated.setPauseStatuses("[\"Blocked\"]");

        SlaPolicy result = service.applyUpdate(existing, updated);

        assertEquals("new", result.getName());
        assertEquals("type = Bug", result.getScopeBql());
        assertEquals("[\"Blocked\"]", result.getPauseStatuses());
        assertEquals("owner-1", result.getCreatedBy()); // identity preserved
        assertNotNull(result.getUpdatedAt());
    }

    @Test
    void prepareTarget_normalizesMetricAndDefaults() {
        SlaTarget t = new SlaTarget();
        t.setName("Resolve");
        t.setMetric("custom");
        t.setTargetMinutes(0);            // invalid → defaulted
        t.setStopStatus("");              // blank → defaulted

        SlaTarget prepared = service.prepareTarget(t, "SLA-1", "WS-1");

        assertTrue(prepared.getId().startsWith("SLT-"));
        assertEquals("SLA-1", prepared.getPolicyId());
        assertEquals("WS-1", prepared.getWorkspaceId());
        assertEquals("CUSTOM", prepared.getMetric());
        assertEquals(60, prepared.getTargetMinutes());
        assertEquals("Done", prepared.getStopStatus());
    }

    @Test
    void prepareEscalation_normalizesActionThresholdAndNotify() {
        SlaEscalation e = new SlaEscalation();
        e.setAction("reassign");
        e.setThresholdPct(150);
        e.setNotifyTo(null);

        SlaEscalation prepared = service.prepareEscalation(e, "SLA-1", "WS-1");

        assertTrue(prepared.getId().startsWith("SLE-"));
        assertEquals("REASSIGN", prepared.getAction());
        assertEquals(100, prepared.getThresholdPct());
        assertEquals("[]", prepared.getNotifyTo());
    }

    @Test
    void totalConsumed_addsLiveElapsedOnlyWhileRunning() {
        SlaInstance running = new SlaInstance();
        running.setStatus("RUNNING");
        running.setConsumedSeconds(600L);
        assertEquals(900L, service.totalConsumed(running, 300L));

        SlaInstance paused = new SlaInstance();
        paused.setStatus("PAUSED");
        paused.setConsumedSeconds(600L);
        assertEquals(600L, service.totalConsumed(paused, 300L)); // frozen — live ignored
    }

    @Test
    void consumedPercent_isWholePercentOfTarget() {
        SlaInstance inst = new SlaInstance();
        inst.setTargetMinutes(60); // 3600s
        assertEquals(50, service.consumedPercent(inst, 1800L));
        assertEquals(100, service.consumedPercent(inst, 3600L));
        assertEquals(150, service.consumedPercent(inst, 5400L)); // breached past target
    }

    @Test
    void consumedPercent_zeroTargetIsHundred() {
        SlaInstance inst = new SlaInstance();
        inst.setTargetMinutes(0);
        assertEquals(100, service.consumedPercent(inst, 0L));
    }
}
