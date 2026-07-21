package com.bcits.works;
import com.bcits.works.security.PentestEngagement;
import com.bcits.works.security.PentestService;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;
import com.bcits.works.security.ComplianceEvidenceService;
import com.bcits.works.security.CompliancePrivacyController;
import com.bcits.works.security.DataPrivacyService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Unauthorized / cross-tenant access tests for the compliance + data-privacy API (RB-40 §1). Reads
 * require {@code view_audit_log}; the privileged actions — data export, erasure, evidence
 * generation, pen-test edits — require {@code manage_security}, checked before any work happens.
 */
@Tag("unit")
class CompliancePrivacyControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";

    private final DataPrivacyService privacy = mock(DataPrivacyService.class);
    private final ComplianceEvidenceService evidence = mock(ComplianceEvidenceService.class);
    private final PentestService pentests = mock(PentestService.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);
    private final CompliancePrivacyController controller = new CompliancePrivacyController(
            privacy, evidence, pentests, authenticatedUser, rbac);

    CompliancePrivacyControllerAccessTest() {
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
        assertForbidden(() -> controller.dataRequests(FOREIGN_WS));
        assertForbidden(() -> controller.evidence(FOREIGN_WS));
        assertForbidden(() -> controller.pentests(FOREIGN_WS));
        verifyNoInteractions(privacy, evidence, pentests);
    }

    @Test
    void dataExportAndErasure_requireManageSecurity() {
        deny("manage_security");
        assertForbidden(() -> controller.export(FOREIGN_WS, "USR-X"));
        assertForbidden(() -> controller.erase(FOREIGN_WS, "USR-X"));
        verify(privacy, never()).export(anyString(), anyString(), anyString());
        verify(privacy, never()).erase(anyString(), anyString(), anyString());
    }

    @Test
    void evidenceGeneration_requiresManageSecurity() {
        deny("manage_security");
        assertForbidden(() -> controller.generate(FOREIGN_WS, "SOC2_TYPE2", null, null));
        assertForbidden(() -> controller.download(FOREIGN_WS, "EVB-1"));
        verify(evidence, never()).generate(anyString(), anyString(), anyString(), any(), any());
        verify(evidence, never()).markDownloaded(anyString(), anyString(), anyString());
    }

    @Test
    void pentestWrites_requireManageSecurity() {
        deny("manage_security");
        assertForbidden(() -> controller.createPentest(FOREIGN_WS, new PentestEngagement()));
        assertForbidden(() -> controller.updatePentest(FOREIGN_WS, "PEN-1", new PentestEngagement()));
        verify(pentests, never()).create(anyString(), anyString(), any());
        verify(pentests, never()).update(anyString(), anyString(), anyString(), any());
    }
}
