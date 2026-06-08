package com.bcits.works;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import javax.naming.directory.Attributes;
import javax.naming.directory.DirContext;
import javax.naming.directory.InitialDirContext;
import java.util.Hashtable;
import java.util.List;

/**
 * B14: Scheduled DNS verification for custom domains. Runs every 15 minutes (configurable via
 * {@code custom.domain.verify.cron}). For each PENDING domain, performs a DNS TXT record lookup
 * at {@code _bsmart-verify.<domain>} and compares the value against the stored
 * {@code verification_token}. On match: transitions to VERIFIED. On miss: stays PENDING and logs.
 *
 * <p>This is the production DNS seam that replaces the stub in
 * {@link CustomDomainService#verify(String, String)}. The API-triggered verify endpoint remains
 * (admins can trigger manually); this job handles automatic background verification once DNS
 * is pointed.
 *
 * <p>Workspace isolation: all operations are scoped to the owning workspace_id stored on
 * each {@link CustomDomain} row — the job never crosses tenants (RB-40 §1).
 */
@Component
public class CustomDomainVerificationJob {

    private static final Logger log = LoggerFactory.getLogger(CustomDomainVerificationJob.class);

    /** Expected DNS TXT record name prefix. */
    private static final String DNS_PREFIX = "_bsmart-verify.";

    private final CustomDomainRepository repository;
    private final EventService events;

    public CustomDomainVerificationJob(CustomDomainRepository repository, EventService events) {
        this.repository = repository;
        this.events = events;
    }

    /**
     * Runs every 15 minutes (configurable). Verifies all PENDING domains across all workspaces.
     * Each domain is attempted independently — a single failure does not abort the batch.
     */
    @Scheduled(cron = "${custom.domain.verify.cron:0 */15 * * * *}")
    public void verifyPendingDomains() {
        List<CustomDomain> pending = repository.findByStatus("PENDING");
        if (pending.isEmpty()) {
            return;
        }
        log.info("[CUSTOM-DOMAIN] Verifying {} pending domain(s)", pending.size());

        int verified = 0;
        int failed = 0;
        for (CustomDomain cd : pending) {
            try {
                if (checkDnsTxt(cd.getDomain(), cd.getVerificationToken())) {
                    markVerified(cd);
                    verified++;
                } else {
                    log.debug("[CUSTOM-DOMAIN] DNS TXT record not ready for domain={}", cd.getDomain());
                }
            } catch (Exception e) {
                // DNS timeout / NXDOMAIN / SERVFAIL are expected during DNS propagation delay.
                log.debug("[CUSTOM-DOMAIN] DNS lookup error for domain={}: {}", cd.getDomain(), e.getMessage());
                failed++;
            }
        }
        if (verified > 0 || failed > 0) {
            log.info("[CUSTOM-DOMAIN] Batch complete: verified={} dns-miss/error={}", verified, failed);
        }
    }

    // ── internals ─────────────────────────────────────────────────────────────

    /**
     * Returns {@code true} if a DNS TXT record for {@code _bsmart-verify.<domain>} exists and
     * contains the expected {@code token}. Uses the JNDI DNS SPI (no additional dependency).
     */
    boolean checkDnsTxt(String domain, String token) throws Exception {
        if (token == null || token.isBlank()) {
            return false;
        }
        String lookupName = DNS_PREFIX + domain;
        Hashtable<String, String> env = new Hashtable<>();
        env.put("java.naming.factory.initial", "com.sun.jndi.dns.DnsContextFactory");
        env.put("java.naming.provider.url", "dns:");
        DirContext ctx = new InitialDirContext(env);
        try {
            Attributes attrs = ctx.getAttributes(lookupName, new String[]{"TXT"});
            javax.naming.directory.Attribute txt = attrs.get("TXT");
            if (txt == null) {
                return false;
            }
            // Each TXT record may wrap its value in quotes; strip them for comparison.
            for (int i = 0; i < txt.size(); i++) {
                String value = txt.get(i).toString().replace("\"", "").trim();
                if (token.equals(value)) {
                    return true;
                }
            }
        } finally {
            ctx.close();
        }
        return false;
    }

    private void markVerified(CustomDomain cd) {
        cd.setStatus("VERIFIED");
        cd.setVerifiedAt(java.time.OffsetDateTime.now());
        cd.setUpdatedAt(cd.getVerifiedAt());
        repository.save(cd);
        events.record(cd.getId(), "CUSTOM_DOMAIN_VERIFIED", cd.getWorkspaceId(),
            "{\"domain\":\"" + cd.getDomain() + "\",\"auto\":true}");
        log.info("[CUSTOM-DOMAIN] Verified domain={} workspace={}", cd.getDomain(), cd.getWorkspaceId());
    }
}
