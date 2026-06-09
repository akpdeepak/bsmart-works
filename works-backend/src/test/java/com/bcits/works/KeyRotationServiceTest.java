package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Unit tests for KeyRotationService using LocalKmsProvider (no real KMS). */
@Tag("unit")
class KeyRotationServiceTest {

    private static PiiVaultEntry vaultEntry(String id, String workspaceId, String encValue) {
        PiiVaultEntry e = new PiiVaultEntry();
        e.setId(id);
        e.setWorkspaceId(workspaceId);
        e.setSubjectId("USR-1");
        e.setPiiType("EMAIL");
        e.setEncryptedValue(encValue);
        e.setCreatedAt(OffsetDateTime.now());
        e.setUpdatedAt(OffsetDateTime.now());
        return e;
    }

    @Test
    void rotate_updatesAllVaultEntriesAndWritesAuditEvent() {
        PiiVaultRepository piiRepo = mock(PiiVaultRepository.class);
        WorkspaceSecuritySettingsService secSvc = mock(WorkspaceSecuritySettingsService.class);
        SecurityAuditLogService auditLog = mock(SecurityAuditLogService.class);
        LocalKmsProvider kms = new LocalKmsProvider();

        WorkspaceSecuritySettings settings = new WorkspaceSecuritySettings();
        settings.setWorkspaceId("WS-1");
        settings.setByokKeyRef("old-key-ref");
        when(secSvc.get("WS-1")).thenReturn(settings);
        when(secSvc.update(anyString(), anyString(), any())).thenReturn(settings);

        List<PiiVaultEntry> entries = List.of(
            vaultEntry("E1", "WS-1", "encrypted-val-1"),
            vaultEntry("E2", "WS-1", "encrypted-val-2")
        );
        when(piiRepo.findByWorkspaceId("WS-1")).thenReturn(entries);
        when(piiRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(auditLog.record(anyString(), anyString(), anyString(), anyString(), anyString(), anyString()))
            .thenReturn(new AuditLogEntry());

        KeyRotationService service = new KeyRotationService(piiRepo, secSvc, auditLog, kms);
        KeyRotationService.RotationResult result = service.rotate("WS-1", "USR-admin");

        assertThat(result.workspaceId()).isEqualTo("WS-1");
        assertThat(result.reEncryptedCount()).isEqualTo(2);
        assertThat(result.kmsProvider()).isEqualTo("local-dev");
        assertThat(result.newKeyRef()).startsWith("local:WS-1:");
        assertThat(result.rotatedAt()).isNotNull();

        // Audit event written to the hash chain
        verify(auditLog).record(eq("WS-1"), eq("USR-admin"), eq("KEY_ROTATED"),
            eq("workspace"), eq("WS-1"), anyString());
        // Settings updated with new key ref
        verify(secSvc).update(eq("WS-1"), eq("USR-admin"), any());
        // Both entries re-encrypted
        verify(piiRepo, times(2)).save(any());
    }

    @Test
    void rotate_withNoVaultEntries_completesWithZeroReEncrypted() {
        PiiVaultRepository piiRepo = mock(PiiVaultRepository.class);
        WorkspaceSecuritySettingsService secSvc = mock(WorkspaceSecuritySettingsService.class);
        SecurityAuditLogService auditLog = mock(SecurityAuditLogService.class);

        WorkspaceSecuritySettings settings = new WorkspaceSecuritySettings();
        settings.setWorkspaceId("WS-2");
        when(secSvc.get("WS-2")).thenReturn(settings);
        when(secSvc.update(anyString(), anyString(), any())).thenReturn(settings);
        when(piiRepo.findByWorkspaceId("WS-2")).thenReturn(List.of());
        when(auditLog.record(anyString(), anyString(), anyString(), anyString(), anyString(), anyString()))
            .thenReturn(new AuditLogEntry());

        KeyRotationService.RotationResult result =
            new KeyRotationService(piiRepo, secSvc, auditLog, new LocalKmsProvider()).rotate("WS-2", "USR-admin");

        assertThat(result.reEncryptedCount()).isZero();
        verify(auditLog).record(eq("WS-2"), anyString(), eq("KEY_ROTATED"), anyString(), anyString(), anyString());
    }
}
