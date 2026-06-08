package com.bcits.works;

import com.bcits.works.dto.AnomalySignalRequest;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Unauthorized / cross-tenant access tests for the security admin API (RB-05 Stage 3, RB-40 §1).
 * Reads require {@code view_audit_log}; writes require {@code manage_security}; nothing is read or
 * written before the RBAC check passes.
 */
@Tag("unit")
class SecurityAdminControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";

    private final WorkspaceSecuritySettingsService settings = mock(WorkspaceSecuritySettingsService.class);
    private final ConditionalAccessService conditionalAccess = mock(ConditionalAccessService.class);
    private final AnomalyDetectionService anomalies = mock(AnomalyDetectionService.class);
    private final AuditStreamService streams = mock(AuditStreamService.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);
    private final SecurityAdminController controller = new SecurityAdminController(
            settings, conditionalAccess, anomalies, streams, authenticatedUser, rbac);

    SecurityAdminControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
    }

    private void deny(String permission) {
        doThrow(ApiException.forbidden("denied")).when(rbac).require(eq(CALLER), eq(FOREIGN_WS), eq(permission));
    }

    private void assertForbidden(Runnable call) {
        assertThatThrownBy(call::run)
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void reads_requireViewAuditLog() {
        deny("view_audit_log");
        assertForbidden(() -> controller.settings(FOREIGN_WS));
        assertForbidden(() -> controller.policies(FOREIGN_WS));
        assertForbidden(() -> controller.anomalies(FOREIGN_WS, null));
        assertForbidden(() -> controller.streams(FOREIGN_WS));
        assertForbidden(() -> controller.evaluate(FOREIGN_WS, "ADMIN", "1.2.3.4", "IN", false));
        verifyNoInteractions(settings, conditionalAccess, anomalies, streams);
    }

    @Test
    void updateSettings_requiresManageSecurity() {
        deny("manage_security");
        assertForbidden(() -> controller.updateSettings(FOREIGN_WS, new WorkspaceSecuritySettings()));
        verify(settings, never()).update(anyString(), anyString(), any());
    }

    @Test
    void conditionalAccessWrites_requireManageSecurity() {
        deny("manage_security");
        assertForbidden(() -> controller.createPolicy(FOREIGN_WS, new ConditionalAccessPolicy()));
        assertForbidden(() -> controller.updatePolicy(FOREIGN_WS, "CAP-1", new ConditionalAccessPolicy()));
        assertForbidden(() -> controller.deletePolicy(FOREIGN_WS, "CAP-1"));
        verify(conditionalAccess, never()).create(anyString(), anyString(), any());
        verify(conditionalAccess, never()).update(anyString(), anyString(), anyString(), any());
        verify(conditionalAccess, never()).delete(anyString(), anyString(), anyString());
    }

    @Test
    void anomalyWrites_requireManageSecurity() {
        deny("manage_security");
        AnomalySignalRequest sig = new AnomalySignalRequest("u", "IN", null, 3, 0, 0, false, null, false);
        assertForbidden(() -> controller.analyze(FOREIGN_WS, sig));
        assertForbidden(() -> controller.resolveAnomaly(FOREIGN_WS, "ANM-1", false));
        verify(anomalies, never()).analyze(anyString(), any());
        verify(anomalies, never()).resolve(anyString(), anyString(), anyString(), anyBoolean());
    }

    @Test
    void streamWrites_requireManageSecurity() {
        deny("manage_security");
        assertForbidden(() -> controller.createStream(FOREIGN_WS, new AuditLogStreamConfig()));
        assertForbidden(() -> controller.deleteStream(FOREIGN_WS, "SIEM-1"));
        assertForbidden(() -> controller.drainStream(FOREIGN_WS, "SIEM-1"));
        verify(streams, never()).create(anyString(), anyString(), any());
        verify(streams, never()).delete(anyString(), anyString(), anyString());
        verify(streams, never()).drain(anyString(), anyString());
    }
}
