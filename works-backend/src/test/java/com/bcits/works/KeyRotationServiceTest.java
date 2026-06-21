package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Unit tests for KeyRotationService (per-subject DEK re-wrap) using LocalKmsProvider (no real KMS). */
@Tag("unit")
class KeyRotationServiceTest {

    private final LocalKmsProvider kms = new LocalKmsProvider();

    private SubjectDataKey activeKey(String id, String workspaceId, String subjectId) {
        byte[] dek = new byte[32];
        new SecureRandom().nextBytes(dek);
        KmsProvider.WrappedKey w = kms.wrapDataKey(workspaceId, dek);
        SubjectDataKey k = new SubjectDataKey();
        k.setId(id);
        k.setWorkspaceId(workspaceId);
        k.setSubjectId(subjectId);
        k.setWrappedDek(w.wrapped());
        k.setKeyRef(w.kekRef());
        k.setKeyState(SubjectDataKey.STATE_ACTIVE);
        k.setCreatedAt(OffsetDateTime.now());
        k.setUpdatedAt(OffsetDateTime.now());
        return k;
    }

    @Test
    void rotate_reWrapsAllActiveSubjectKeysAndWritesAuditEvent() {
        SubjectDataKeyRepository keys = mock(SubjectDataKeyRepository.class);
        WorkspaceSecuritySettingsService secSvc = mock(WorkspaceSecuritySettingsService.class);
        SecurityAuditLogService auditLog = mock(SecurityAuditLogService.class);

        WorkspaceSecuritySettings settings = new WorkspaceSecuritySettings();
        settings.setWorkspaceId("WS-1");
        when(secSvc.get("WS-1")).thenReturn(settings);
        when(secSvc.update(anyString(), anyString(), any())).thenReturn(settings);

        SubjectDataKey k1 = activeKey("sdk-1", "WS-1", "subj-1");
        SubjectDataKey k2 = activeKey("sdk-2", "WS-1", "subj-2");
        String oldRef = k1.getKeyRef();
        when(keys.findByWorkspaceId("WS-1")).thenReturn(List.of(k1, k2));
        when(keys.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(auditLog.record(anyString(), anyString(), anyString(), anyString(), anyString(), anyString()))
            .thenReturn(new AuditLogEntry());

        KeyRotationService service = new KeyRotationService(keys, secSvc, auditLog, kms);
        KeyRotationService.RotationResult result = service.rotate("WS-1", "USR-admin");

        assertThat(result.workspaceId()).isEqualTo("WS-1");
        assertThat(result.reWrappedCount()).isEqualTo(2);
        assertThat(result.kmsProvider()).isEqualTo("local-dev");
        assertThat(result.newKeyRef()).isNotEqualTo(oldRef);
        assertThat(result.rotatedAt()).isNotNull();
        // Each DEK was re-wrapped under the new KEK (its keyRef advanced to the rotated reference).
        assertThat(k1.getKeyRef()).isEqualTo(result.newKeyRef());
        assertThat(k2.getKeyRef()).isEqualTo(result.newKeyRef());

        verify(auditLog).record(eq("WS-1"), eq("USR-admin"), eq("KEY_ROTATED"),
            eq("workspace"), eq("WS-1"), anyString());
        verify(secSvc).update(eq("WS-1"), eq("USR-admin"), any());
        verify(keys, times(2)).save(any());
    }

    @Test
    void rotate_skipsShreddedSubjectsAndCompletes() {
        SubjectDataKeyRepository keys = mock(SubjectDataKeyRepository.class);
        WorkspaceSecuritySettingsService secSvc = mock(WorkspaceSecuritySettingsService.class);
        SecurityAuditLogService auditLog = mock(SecurityAuditLogService.class);

        WorkspaceSecuritySettings settings = new WorkspaceSecuritySettings();
        settings.setWorkspaceId("WS-2");
        when(secSvc.get("WS-2")).thenReturn(settings);
        when(secSvc.update(anyString(), anyString(), any())).thenReturn(settings);

        SubjectDataKey shredded = new SubjectDataKey();
        shredded.setId("sdk-x");
        shredded.setWorkspaceId("WS-2");
        shredded.setSubjectId("subj-x");
        shredded.setKeyState(SubjectDataKey.STATE_SHREDDED);
        shredded.setWrappedDek(null);
        shredded.setCreatedAt(OffsetDateTime.now());
        shredded.setUpdatedAt(OffsetDateTime.now());
        when(keys.findByWorkspaceId("WS-2")).thenReturn(List.of(shredded));
        when(auditLog.record(anyString(), anyString(), anyString(), anyString(), anyString(), anyString()))
            .thenReturn(new AuditLogEntry());

        KeyRotationService.RotationResult result =
            new KeyRotationService(keys, secSvc, auditLog, kms).rotate("WS-2", "USR-admin");

        assertThat(result.reWrappedCount()).isZero();
        verify(keys, never()).save(any());
        verify(auditLog).record(eq("WS-2"), anyString(), eq("KEY_ROTATED"), anyString(), anyString(), anyString());
    }
}
