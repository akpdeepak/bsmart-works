package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("unit")
class ComplianceEvaluationServiceTest {

    // reconcile() is pure — the I/O collaborators are unused, so nulls are safe here.
    private final ComplianceEvaluationService service =
        new ComplianceEvaluationService(null, null, null, null, null);

    private ComplianceEvaluationService.FailingItem item(String id) {
        return new ComplianceEvaluationService.FailingItem(id, "title " + id, "PROJ-1", null, "u1");
    }

    private ComplianceViolation active(String itemId) {
        ComplianceViolation v = new ComplianceViolation();
        v.setId("CV-" + itemId);
        v.setWorkItemId(itemId);
        v.setStatus("OPEN");
        return v;
    }

    @Test
    void reconcile_opensOnlyNewlyFailingItems() {
        var r = service.reconcile(
            List.of(item("W1"), item("W2")),
            List.of(active("W1")));            // W1 already active
        assertEquals(1, r.toOpen().size());
        assertEquals("W2", r.toOpen().get(0).id());
        assertTrue(r.toResolve().isEmpty());
    }

    @Test
    void reconcile_resolvesViolationsThatNoLongerFail() {
        var r = service.reconcile(
            List.of(item("W1")),               // only W1 still failing
            List.of(active("W1"), active("W3")));
        assertTrue(r.toOpen().isEmpty());      // W1 already active
        assertEquals(1, r.toResolve().size());
        assertEquals("W3", r.toResolve().get(0).getWorkItemId());
    }

    @Test
    void reconcile_allClear_resolvesEverything() {
        var r = service.reconcile(
            List.of(),
            List.of(active("W1"), active("W2")));
        assertTrue(r.toOpen().isEmpty());
        assertEquals(2, r.toResolve().size());
    }

    @Test
    void reconcile_firstDetection_opensAll() {
        var r = service.reconcile(
            List.of(item("W1"), item("W2")),
            List.of());
        assertEquals(2, r.toOpen().size());
        assertTrue(r.toResolve().isEmpty());
    }
}
