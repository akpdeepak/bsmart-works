package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for ExtensionExecutionService — declarative extension engine (B26).
 * ConfigService is mocked to inject workspace config documents; EventService is mocked
 * to verify audit trail entries.
 */
@Tag("unit")
class ExtensionExecutionServiceTest {

    private static final String WS = "WS-1";
    private static final String ACTOR = "USR-admin";

    private final ConfigService config = mock(ConfigService.class);
    private final EventService events = mock(EventService.class);
    private final ExtensionExecutionService svc = new ExtensionExecutionService(config, events);

    private static WorkItem item(String priority, String type, String status) {
        WorkItem w = new WorkItem();
        w.setId("WI-1");
        w.setPriority(priority);
        w.setType(type);
        w.setStatus(status);
        return w;
    }

    private void withExtension(String doc) {
        when(config.getLiveDocument(WS)).thenReturn(doc);
    }

    // ── SET_FIELD ──────────────────────────────────────────────────────────────

    @Test
    void setField_whenConditionMatches_mutatesItem() {
        withExtension("""
            {"extensions":[{
              "id":"ext-1","name":"Auto-assign","point":"work_item.before_create",
              "enabled":true,"conditionExpr":"priority=HIGH AND type=BUG",
              "action":{"type":"SET_FIELD","params":{"field":"assigneeId","value":"USR-lead"}}
            }]}""");
        WorkItem item = item("HIGH", "BUG", "TODO");

        ExtensionExecutionService.ExtensionResult result =
                svc.beforeWorkItemCreate(WS, item, ACTOR);

        assertThat(result.rejected()).isFalse();
        assertThat(result.executed()).isEqualTo(1);
        assertThat(item.getAssigneeId()).isEqualTo("USR-lead");
        verify(events).recordInWorkspace(eq(WS), eq("ext-1"), eq("EXTENSION_EXECUTED"), eq(ACTOR), any());
    }

    @Test
    void setField_whenConditionDoesNotMatch_skipsExtension() {
        withExtension("""
            {"extensions":[{
              "id":"ext-2","name":"Auto-assign","point":"work_item.before_create",
              "enabled":true,"conditionExpr":"priority=HIGH",
              "action":{"type":"SET_FIELD","params":{"field":"assigneeId","value":"USR-lead"}}
            }]}""");
        WorkItem item = item("LOW", "TASK", "TODO");

        ExtensionExecutionService.ExtensionResult result =
                svc.beforeWorkItemCreate(WS, item, ACTOR);

        assertThat(result.executed()).isZero();
        assertThat(result.skipped()).isEqualTo(1);
        assertThat(item.getAssigneeId()).isNull();
    }

    // ── REJECT ────────────────────────────────────────────────────────────────

    @Test
    void reject_whenConditionMatches_returnsRejectedResult() {
        withExtension("""
            {"extensions":[{
              "id":"ext-3","name":"Block duplicates","point":"work_item.before_create",
              "enabled":true,"conditionExpr":"type=SPIKE",
              "action":{"type":"REJECT","params":{"message":"SPIKE items require team approval."}}
            }]}""");
        WorkItem item = item("MEDIUM", "SPIKE", "TODO");

        ExtensionExecutionService.ExtensionResult result =
                svc.beforeWorkItemCreate(WS, item, ACTOR);

        assertThat(result.rejected()).isTrue();
        assertThat(result.rejectionMessage()).isEqualTo("SPIKE items require team approval.");
        verify(events).recordInWorkspace(eq(WS), eq("ext-3"), eq("EXTENSION_EXECUTED"),
                eq(ACTOR), any());
    }

    // ── EMIT_EVENT ────────────────────────────────────────────────────────────

    @Test
    void emitEvent_afterStatusChange_writesCustomEventToStore() {
        withExtension("""
            {"extensions":[{
              "id":"ext-4","name":"Notify on done","point":"work_item.after_status_change",
              "enabled":true,"conditionExpr":"status=DONE",
              "action":{"type":"EMIT_EVENT","params":{"eventType":"WORK_ITEM_COMPLETED"}}
            }]}""");
        WorkItem item = item("HIGH", "TASK", "DONE");

        svc.afterStatusChange(WS, item, "IN_PROGRESS", ACTOR);

        verify(events).recordInWorkspace(eq(WS), eq("WI-1"), eq("WORK_ITEM_COMPLETED"),
                eq(ACTOR), any());
    }

    // ── disabled extension ────────────────────────────────────────────────────

    @Test
    void disabled_extension_isSkipped() {
        withExtension("""
            {"extensions":[{
              "id":"ext-5","name":"Disabled","point":"work_item.before_create",
              "enabled":false,"conditionExpr":"",
              "action":{"type":"SET_FIELD","params":{"field":"priority","value":"LOW"}}
            }]}""");
        WorkItem item = item("HIGH", "BUG", "TODO");

        ExtensionExecutionService.ExtensionResult result =
                svc.beforeWorkItemCreate(WS, item, ACTOR);

        assertThat(result.skipped()).isEqualTo(1);
        assertThat(item.getPriority()).isEqualTo("HIGH");
    }

    // ── unknown action type ───────────────────────────────────────────────────

    @Test
    void unknownActionType_isSkippedAndAuditLogged() {
        withExtension("""
            {"extensions":[{
              "id":"ext-6","name":"Bad","point":"work_item.before_create",
              "enabled":true,"conditionExpr":"",
              "action":{"type":"EVAL_JS","params":{}}
            }]}""");
        WorkItem item = item("LOW", "TASK", "TODO");

        ExtensionExecutionService.ExtensionResult result =
                svc.beforeWorkItemCreate(WS, item, ACTOR);

        assertThat(result.skipped()).isEqualTo(1);
        verify(events).recordInWorkspace(eq(WS), eq("ext-6"), eq("EXTENSION_SKIPPED"),
                eq(ACTOR), any());
    }

    // ── null workspaceId ──────────────────────────────────────────────────────

    @Test
    void nullWorkspaceId_returnsPasSilently() {
        ExtensionExecutionService.ExtensionResult result =
                svc.beforeWorkItemCreate(null, item("LOW", "TASK", "TODO"), ACTOR);

        assertThat(result.rejected()).isFalse();
        assertThat(result.executed()).isZero();
        verify(config, never()).getLiveDocument(anyString());
    }

    // ── SET_FIELD mutable-field allow-list ────────────────────────────────────

    @Test
    void setField_structuralField_id_isIgnored() {
        withExtension("""
            {"extensions":[{
              "id":"ext-7","name":"Try to overwrite id","point":"work_item.before_create",
              "enabled":true,"conditionExpr":"",
              "action":{"type":"SET_FIELD","params":{"field":"id","value":"EVIL-ID"}}
            }]}""");
        WorkItem item = item("LOW", "TASK", "TODO");

        svc.beforeWorkItemCreate(WS, item, ACTOR);

        assertThat(item.getId()).isEqualTo("WI-1");  // unchanged
    }
}
