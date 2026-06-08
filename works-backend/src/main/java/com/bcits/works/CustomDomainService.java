package com.bcits.works;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Business logic for custom domain management (B14).
 *
 * <p>DNS / SSL provisioning is deferred to production infrastructure. The {@link #verify} method
 * is intentionally stubbed — it logs a notice and transitions the domain to VERIFIED immediately
 * so the API is fully exercisable before real DNS is pointed. Once production DNS is wired, the
 * stub is replaced with an actual DNS TXT-record lookup (no data-model changes required).
 *
 * <p>Authorization (RBAC) is enforced by {@link CustomDomainController} before any service call —
 * the service trusts that the caller has been cleared (RB-10 §2). All reads are workspace-scoped
 * (RB-40 §1): the workspace ID is always an explicit query parameter, never inferred.
 */
@Service
public class CustomDomainService {

    private static final Logger log = LoggerFactory.getLogger(CustomDomainService.class);

    /**
     * Accepts labels (a-z, 0-9, hyphen) separated by dots; requires at least two labels
     * (e.g. {@code works.example.com}). Wildcards are rejected — they cannot be verified via
     * a single DNS TXT record and introduce ambiguous routing.
     */
    private static final Pattern DOMAIN_PATTERN =
        Pattern.compile("^(?!-)[a-zA-Z0-9-]{1,63}(?<!-)(\\.(?!-)[a-zA-Z0-9-]{1,63}(?<!-))+$");

    private final CustomDomainRepository repository;
    private final EventService eventService;

    public CustomDomainService(CustomDomainRepository repository, EventService eventService) {
        this.repository = repository;
        this.eventService = eventService;
    }

    // ── Queries (workspace-scoped) ────────────────────────────────────────────────────────

    /**
     * Returns all live custom domains for {@code workspaceId} (excludes soft-deleted rows).
     * Workspace-scoped by construction — only rows belonging to the given workspace are returned
     * (RB-40 §1).
     */
    public List<CustomDomain> list(String workspaceId) {
        return repository.findByWorkspaceIdAndDeletedAtIsNullOrderByCreatedAtDesc(workspaceId);
    }

    // ── Mutations ─────────────────────────────────────────────────────────────────────────

    /**
     * Registers a new custom domain for {@code workspaceId}.
     *
     * <p>Validation:
     * <ul>
     *   <li>Domain format must match {@link #DOMAIN_PATTERN} (no wildcards, valid TLD structure).</li>
     *   <li>Domain must not already be registered to any live record (across all workspaces —
     *       domain names are globally unique).</li>
     * </ul>
     *
     * <p>The new domain is created in status {@code PENDING}. The caller must subsequently invoke
     * {@link #verify} once DNS is pointed.
     *
     * @param workspaceId the workspace claiming this domain (RB-40 §1)
     * @param domain      the fully-qualified domain name (e.g. {@code app.example.com})
     * @param createdBy   the authenticated user ID performing the registration
     * @return the persisted {@link CustomDomain} in PENDING status
     * @throws ApiException {@code 400 INVALID_DOMAIN}   if the format is invalid
     * @throws ApiException {@code 400 DOMAIN_TAKEN}    if the domain is already registered
     */
    public CustomDomain register(String workspaceId, String domain, String createdBy) {
        validateDomainFormat(domain);

        // Reject duplicates before hitting the DB unique constraint (clearer error message)
        repository.findByDomainAndDeletedAtIsNull(domain.toLowerCase()).ifPresent(existing -> {
            throw ApiException.badRequest("DOMAIN_TAKEN",
                "Domain '" + domain + "' is already registered.");
        });

        OffsetDateTime now = OffsetDateTime.now();
        CustomDomain cd = new CustomDomain();
        cd.setId(UUID.randomUUID().toString());
        cd.setWorkspaceId(workspaceId);
        cd.setDomain(domain.toLowerCase());
        cd.setStatus("PENDING");
        cd.setSslStatus("PENDING");
        cd.setCreatedBy(createdBy);
        cd.setCreatedAt(now);
        cd.setUpdatedAt(now);

        CustomDomain saved = repository.save(cd);
        eventService.record(saved.getId(), "CUSTOM_DOMAIN_REGISTERED", createdBy,
            "{\"domain\":\"" + saved.getDomain() + "\",\"workspaceId\":\"" + workspaceId + "\"}");

        log.info("Custom domain registered: domain={} workspace={} by={}", domain, workspaceId, createdBy);
        return saved;
    }

    /**
     * Triggers DNS verification for a domain.
     *
     * <p><b>Stub implementation</b>: real DNS verification (looking up a workspace-specific TXT
     * record at {@code _bsmart-verify.<domain>}) is deferred to production. This stub transitions
     * the domain to {@code VERIFIED} immediately, so the full API is exercisable before production
     * DNS is configured. Replace the stub body with an actual DNS lookup when the DNS infrastructure
     * is wired.
     *
     * <p>Workspace isolation: {@code workspaceId} is asserted against the stored record — a caller
     * cannot verify a domain that belongs to a different workspace (RB-40 §1).
     *
     * @param domainId    ID of the {@link CustomDomain} to verify
     * @param workspaceId the caller's workspace (must match the domain's owner workspace)
     * @return the updated {@link CustomDomain} with status {@code VERIFIED}
     * @throws ApiException {@code 404} if the domain does not exist or belongs to another workspace
     */
    public CustomDomain verify(String domainId, String workspaceId) {
        CustomDomain cd = loadOwned(domainId, workspaceId);

        // ── Stub: real DNS TXT-record lookup goes here ─────────────────────────
        // When production DNS is pointed, replace this block with:
        //   String txtValue = "_bsmart-verify." + cd.getDomain();
        //   boolean found = DnsLookup.hasTxtRecord(txtValue, expectedToken(cd));
        //   if (!found) throw ApiException.badRequest("DNS_NOT_READY", "...");
        log.info("DNS verification would happen here for domain={} workspace={}", cd.getDomain(), workspaceId);
        // ── End stub ──────────────────────────────────────────────────────────

        OffsetDateTime now = OffsetDateTime.now();
        cd.setStatus("VERIFIED");
        cd.setVerifiedAt(now);
        cd.setUpdatedAt(now);

        CustomDomain saved = repository.save(cd);
        eventService.record(saved.getId(), "CUSTOM_DOMAIN_VERIFIED", workspaceId,
            "{\"domain\":\"" + saved.getDomain() + "\"}");

        return saved;
    }

    /**
     * Soft-deletes a custom domain.
     *
     * <p>Workspace isolation: the domain must belong to {@code workspaceId} (RB-40 §1).
     * After deletion the domain string is freed for re-registration (the unique index filters
     * on {@code deleted_at IS NULL}).
     *
     * @param domainId    ID of the domain to delete
     * @param workspaceId the caller's workspace (must match the domain's owner workspace)
     * @throws ApiException {@code 404} if not found or belongs to another workspace
     */
    public void delete(String domainId, String workspaceId) {
        CustomDomain cd = loadOwned(domainId, workspaceId);

        cd.setDeletedAt(OffsetDateTime.now());
        cd.setUpdatedAt(cd.getDeletedAt());
        repository.save(cd);

        eventService.record(domainId, "CUSTOM_DOMAIN_DELETED", workspaceId,
            "{\"domain\":\"" + cd.getDomain() + "\"}");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────────────────

    /**
     * Loads a domain by ID and asserts ownership. Returns a 404 for both "not found" and
     * "belongs to another workspace" so the caller cannot probe foreign domain IDs (RB-40 §1).
     */
    private CustomDomain loadOwned(String domainId, String workspaceId) {
        CustomDomain cd = repository.findById(domainId)
            .orElseThrow(() -> ApiException.notFound("Custom domain", domainId));
        if (!workspaceId.equals(cd.getWorkspaceId()) || cd.getDeletedAt() != null) {
            throw ApiException.notFound("Custom domain", domainId);
        }
        return cd;
    }

    /**
     * Validates that {@code domain} is a syntactically valid fully-qualified domain name and
     * does not contain a wildcard prefix.
     *
     * @throws ApiException {@code 400 INVALID_DOMAIN} if the format is invalid
     */
    private void validateDomainFormat(String domain) {
        if (domain == null || domain.isBlank()) {
            throw ApiException.badRequest("INVALID_DOMAIN", "Domain must not be blank.", "domain");
        }
        if (domain.startsWith("*")) {
            throw ApiException.badRequest("INVALID_DOMAIN",
                "Wildcard domains are not supported. Provide a specific FQDN.", "domain");
        }
        if (!DOMAIN_PATTERN.matcher(domain).matches()) {
            throw ApiException.badRequest("INVALID_DOMAIN",
                "'" + domain + "' is not a valid fully-qualified domain name.", "domain");
        }
    }
}
