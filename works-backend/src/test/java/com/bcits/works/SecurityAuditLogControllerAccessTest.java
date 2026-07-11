package com.bcits.works;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.SecurityAuditLogService;
import com.bcits.works.security.SecurityAuditLogController;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** Unauthorized / cross-tenant access tests for the audit-log API (RB-40 §1). Every read requires
 *  {@code view_audit_log}, checked before anything is read. */
@Tag("unit")
class SecurityAuditLogControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";

    private final SecurityAuditLogService auditLog = mock(SecurityAuditLogService.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);
    private final SecurityAuditLogController controller =
            new SecurityAuditLogController(auditLog, authenticatedUser, rbac);

    SecurityAuditLogControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        doThrow(ApiException.forbidden("denied")).when(rbac)
                .require(eq(CALLER), eq(FOREIGN_WS), eq("view_audit_log"));
    }

    private void assertForbidden(Runnable call) {
        assertThatThrownBy(call::run)
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void allReads_denyNonMember() {
        assertForbidden(() -> controller.search(FOREIGN_WS, null, null, null, 0, 50));
        assertForbidden(() -> controller.verify(FOREIGN_WS));
        assertForbidden(() -> controller.export(FOREIGN_WS));
        verifyNoInteractions(auditLog);
    }

    @Test
    void doesNotTouchServiceBeforeCheck() {
        assertForbidden(() -> controller.search(FOREIGN_WS, "X", "Y", "q", 1, 10));
        // never reaches the service
        org.mockito.Mockito.verify(auditLog, org.mockito.Mockito.never())
                .search(anyString(), anyString(), anyString(), anyString(), anyInt(), anyInt());
    }
}
