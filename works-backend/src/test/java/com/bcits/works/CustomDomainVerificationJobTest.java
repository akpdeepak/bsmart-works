package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/** Unit tests for CustomDomainVerificationJob. DNS lookups are replaced with a test subclass. */
@Tag("unit")
class CustomDomainVerificationJobTest {

    // ── Subclass that overrides the DNS lookup so no network is needed ────────────
    static class TestableJob extends CustomDomainVerificationJob {
        private final boolean dnsMatch;
        private final boolean throwException;

        TestableJob(CustomDomainRepository repo, EventService events, boolean dnsMatch, boolean throwException) {
            super(repo, events);
            this.dnsMatch = dnsMatch;
            this.throwException = throwException;
        }

        @Override
        boolean checkDnsTxt(String domain, String token) throws Exception {
            if (throwException) throw new Exception("DNS timeout");
            return dnsMatch;
        }
    }

    private static CustomDomain pendingDomain(String id, String domain, String token) {
        CustomDomain cd = new CustomDomain();
        cd.setId(id);
        cd.setWorkspaceId("WS-1");
        cd.setDomain(domain);
        cd.setStatus("PENDING");
        cd.setVerificationToken(token);
        cd.setCreatedAt(java.time.OffsetDateTime.now());
        cd.setUpdatedAt(java.time.OffsetDateTime.now());
        return cd;
    }

    @Test
    void verify_whenDnsMatchFound_transitionsDomainToVerified() {
        CustomDomainRepository repo = mock(CustomDomainRepository.class);
        EventService events = mock(EventService.class);
        CustomDomain domain = pendingDomain("D1", "app.example.com", "abc123");
        when(repo.findByStatus("PENDING")).thenReturn(List.of(domain));
        ArgumentCaptor<CustomDomain> saved = ArgumentCaptor.forClass(CustomDomain.class);

        new TestableJob(repo, events, true, false).verifyPendingDomains();

        verify(repo).save(saved.capture());
        assertThat(saved.getValue().getStatus()).isEqualTo("VERIFIED");
        assertThat(saved.getValue().getVerifiedAt()).isNotNull();
        verify(events).record(eq("D1"), eq("CUSTOM_DOMAIN_VERIFIED"), anyString(), anyString());
    }

    @Test
    void verify_whenDnsMiss_doesNotTransition() {
        CustomDomainRepository repo = mock(CustomDomainRepository.class);
        EventService events = mock(EventService.class);
        when(repo.findByStatus("PENDING")).thenReturn(List.of(pendingDomain("D2", "wait.example.com", "tok")));

        new TestableJob(repo, events, false, false).verifyPendingDomains();

        verify(repo, never()).save(any());
        verifyNoInteractions(events);
    }

    @Test
    void verify_whenDnsThrows_continuesWithOtherDomains() {
        CustomDomainRepository repo = mock(CustomDomainRepository.class);
        EventService events = mock(EventService.class);
        when(repo.findByStatus("PENDING")).thenReturn(List.of(pendingDomain("D3", "fail.example.com", "tok")));

        // Should not throw even when DNS lookup fails
        new TestableJob(repo, events, false, true).verifyPendingDomains();

        verify(repo, never()).save(any());
    }

    @Test
    void verify_whenNoPendingDomains_doesNothing() {
        CustomDomainRepository repo = mock(CustomDomainRepository.class);
        when(repo.findByStatus("PENDING")).thenReturn(List.of());

        new TestableJob(repo, mock(EventService.class), true, false).verifyPendingDomains();

        verify(repo, never()).save(any());
    }
}
