package com.bcits.works;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link CustomDomainService} (B14).
 *
 * <p>Scenarios covered:
 * <ul>
 *   <li>Happy path — valid domain registers successfully.</li>
 *   <li>Wildcard domain rejection.</li>
 *   <li>Invalid format rejection (multiple cases).</li>
 *   <li>Duplicate domain rejection (domain already registered).</li>
 *   <li>Workspace isolation — delete rejects a domain owned by a different workspace.</li>
 *   <li>Verify sets status to VERIFIED.</li>
 *   <li>List returns workspace-scoped results.</li>
 * </ul>
 */
@Tag("unit")
class CustomDomainServiceTest {

    private CustomDomainRepository repository;
    private EventService eventService;
    private CustomDomainService service;

    @BeforeEach
    void setUp() {
        repository = mock(CustomDomainRepository.class);
        eventService = mock(EventService.class);
        service = new CustomDomainService(repository, eventService);
    }

    // ── Registration — happy path ─────────────────────────────────────────────────────────

    @Test
    void register_validDomain_succeeds() {
        when(repository.findByDomainAndDeletedAtIsNull("works.example.com")).thenReturn(Optional.empty());
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CustomDomain result = service.register("WS-1", "works.example.com", "USR-1");

        assertNotNull(result.getId(), "id must be generated");
        assertEquals("WS-1", result.getWorkspaceId());
        assertEquals("works.example.com", result.getDomain());
        assertEquals("PENDING", result.getStatus());
        assertEquals("PENDING", result.getSslStatus());
        assertEquals("USR-1", result.getCreatedBy());
        assertNotNull(result.getCreatedAt());

        verify(eventService).record(anyString(), eq("CUSTOM_DOMAIN_REGISTERED"), eq("USR-1"), anyString());
    }

    @Test
    void register_subdomainWithMultipleLabels_succeeds() {
        when(repository.findByDomainAndDeletedAtIsNull("portal.works.example.com")).thenReturn(Optional.empty());
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CustomDomain result = service.register("WS-1", "portal.works.example.com", "USR-1");
        assertEquals("portal.works.example.com", result.getDomain());
    }

    @Test
    void register_uppercaseDomain_storedLowercase() {
        when(repository.findByDomainAndDeletedAtIsNull("works.example.com")).thenReturn(Optional.empty());
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CustomDomain result = service.register("WS-1", "WORKS.EXAMPLE.COM", "USR-1");
        assertEquals("works.example.com", result.getDomain(), "domain must be lowercased on store");
    }

    // ── Registration — validation failures ──────────────────────────────────────────────

    @Test
    void register_wildcardDomain_throwsInvalidDomain() {
        ApiException ex = assertThrows(ApiException.class,
            () -> service.register("WS-1", "*.example.com", "USR-1"));
        assertEquals("INVALID_DOMAIN", ex.getCode());
        assertTrue(ex.getMessage().contains("Wildcard"), "message should mention wildcard");
    }

    @Test
    void register_singleLabel_throwsInvalidDomain() {
        // A bare TLD (single label) is not a valid FQDN
        ApiException ex = assertThrows(ApiException.class,
            () -> service.register("WS-1", "localhost", "USR-1"));
        assertEquals("INVALID_DOMAIN", ex.getCode());
    }

    @Test
    void register_blankDomain_throwsInvalidDomain() {
        ApiException ex = assertThrows(ApiException.class,
            () -> service.register("WS-1", "   ", "USR-1"));
        assertEquals("INVALID_DOMAIN", ex.getCode());
    }

    @Test
    void register_nullDomain_throwsInvalidDomain() {
        ApiException ex = assertThrows(ApiException.class,
            () -> service.register("WS-1", null, "USR-1"));
        assertEquals("INVALID_DOMAIN", ex.getCode());
    }

    @Test
    void register_domainWithInvalidChars_throwsInvalidDomain() {
        ApiException ex = assertThrows(ApiException.class,
            () -> service.register("WS-1", "has spaces.com", "USR-1"));
        assertEquals("INVALID_DOMAIN", ex.getCode());
    }

    // ── Registration — duplicate rejection ──────────────────────────────────────────────

    @Test
    void register_duplicateDomain_throwsDomainTaken() {
        CustomDomain existing = new CustomDomain();
        existing.setId("CD-EXISTING");
        existing.setWorkspaceId("WS-OTHER");
        existing.setDomain("taken.example.com");
        when(repository.findByDomainAndDeletedAtIsNull("taken.example.com"))
            .thenReturn(Optional.of(existing));

        ApiException ex = assertThrows(ApiException.class,
            () -> service.register("WS-1", "taken.example.com", "USR-1"));
        assertEquals("DOMAIN_TAKEN", ex.getCode());
    }

    // ── Verify ───────────────────────────────────────────────────────────────────────────

    @Test
    void verify_ownedDomain_setsStatusVerified() {
        CustomDomain cd = pendingDomain("CD-1", "WS-1");
        when(repository.findById("CD-1")).thenReturn(Optional.of(cd));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CustomDomain result = service.verify("CD-1", "WS-1");

        assertEquals("VERIFIED", result.getStatus());
        assertNotNull(result.getVerifiedAt(), "verifiedAt must be set");
        verify(eventService).record(eq("CD-1"), eq("CUSTOM_DOMAIN_VERIFIED"), eq("WS-1"), anyString());
    }

    @Test
    void verify_domainOwnedByDifferentWorkspace_throwsNotFound() {
        CustomDomain cd = pendingDomain("CD-1", "WS-OTHER");
        when(repository.findById("CD-1")).thenReturn(Optional.of(cd));

        // WS-1 cannot verify a domain that belongs to WS-OTHER (cross-tenant isolation, RB-40 §1)
        ApiException ex = assertThrows(ApiException.class, () -> service.verify("CD-1", "WS-1"));
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatus());
    }

    // ── Delete — workspace isolation ─────────────────────────────────────────────────────

    @Test
    void delete_ownedDomain_softDeletesSuccessfully() {
        CustomDomain cd = pendingDomain("CD-1", "WS-1");
        when(repository.findById("CD-1")).thenReturn(Optional.of(cd));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.delete("CD-1", "WS-1");

        assertNotNull(cd.getDeletedAt(), "deletedAt must be set");
        verify(eventService).record(eq("CD-1"), eq("CUSTOM_DOMAIN_DELETED"), eq("WS-1"), anyString());
    }

    @Test
    void delete_domainOwnedByDifferentWorkspace_throwsNotFound() {
        CustomDomain cd = pendingDomain("CD-1", "WS-OTHER");
        when(repository.findById("CD-1")).thenReturn(Optional.of(cd));

        // Workspace isolation: a caller in WS-1 cannot delete WS-OTHER's domain (RB-40 §1)
        ApiException ex = assertThrows(ApiException.class, () -> service.delete("CD-1", "WS-1"));
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatus());

        // Confirm the domain was NOT soft-deleted
        assertNull(cd.getDeletedAt(), "domain from another workspace must not be deleted");
        verify(repository, never()).save(any());
    }

    @Test
    void delete_nonExistentDomain_throwsNotFound() {
        when(repository.findById("DOES-NOT-EXIST")).thenReturn(Optional.empty());

        ApiException ex = assertThrows(ApiException.class,
            () -> service.delete("DOES-NOT-EXIST", "WS-1"));
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatus());
    }

    // ── List ─────────────────────────────────────────────────────────────────────────────

    @Test
    void list_returnsWorkspaceScopedDomains() {
        CustomDomain cd = pendingDomain("CD-1", "WS-1");
        when(repository.findByWorkspaceIdAndDeletedAtIsNullOrderByCreatedAtDesc("WS-1"))
            .thenReturn(List.of(cd));

        List<CustomDomain> result = service.list("WS-1");

        assertEquals(1, result.size());
        assertEquals("CD-1", result.get(0).getId());
        verify(repository).findByWorkspaceIdAndDeletedAtIsNullOrderByCreatedAtDesc("WS-1");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────────────────

    private CustomDomain pendingDomain(String id, String workspaceId) {
        CustomDomain cd = new CustomDomain();
        cd.setId(id);
        cd.setWorkspaceId(workspaceId);
        cd.setDomain("test.example.com");
        cd.setStatus("PENDING");
        cd.setSslStatus("PENDING");
        cd.setCreatedBy("USR-1");
        cd.setCreatedAt(OffsetDateTime.now());
        cd.setUpdatedAt(OffsetDateTime.now());
        return cd;
    }
}
