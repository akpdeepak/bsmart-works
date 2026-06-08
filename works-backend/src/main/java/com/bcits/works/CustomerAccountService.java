package com.bcits.works;

import org.springframework.stereotype.Service;
import java.time.OffsetDateTime;
import java.util.Set;
import java.util.UUID;

/**
 * Pure field-level helpers for customer accounts — id generation, tier normalization, defaults
 * and update copying. No I/O, so it is unit-testable in isolation (mirrors
 * {@link ComplianceRuleService}). RBAC, persistence and events live in the controller.
 */
@Service
public class CustomerAccountService {

    static final Set<String> TIERS = Set.of("PLATINUM", "GOLD", "SILVER");
    static final String DEFAULT_TIER = "SILVER";

    /** Coerce a free-text tier to a known value; unknown/blank falls back to SILVER. */
    public String normalizeTier(String tier) {
        if (tier == null) {
            return DEFAULT_TIER;
        }
        String t = tier.trim().toUpperCase();
        return TIERS.contains(t) ? t : DEFAULT_TIER;
    }

    /** Normalize a subdomain to a DNS-safe label, or null when blank. */
    public String normalizeSubdomain(String subdomain) {
        if (subdomain == null || subdomain.isBlank()) {
            return null;
        }
        String s = subdomain.trim().toLowerCase().replaceAll("[^a-z0-9-]", "-").replaceAll("-+", "-");
        s = s.replaceAll("^-+", "").replaceAll("-+$", "");
        return s.isBlank() ? null : s;
    }

    /** Stamp a new account with id, creator, normalized defaults and timestamps. */
    public CustomerAccount prepareNew(CustomerAccount account, String creatorId) {
        account.setId("CA-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        account.setCreatedBy(creatorId);
        account.setTier(normalizeTier(account.getTier()));
        account.setSubdomain(normalizeSubdomain(account.getSubdomain()));
        account.setActive(account.getActive() == null || account.getActive());
        OffsetDateTime now = OffsetDateTime.now();
        account.setCreatedAt(now);
        account.setUpdatedAt(now);
        return account;
    }

    /** Copy editable fields from {@code updated} onto {@code existing} and bump updatedAt. */
    public CustomerAccount applyUpdate(CustomerAccount existing, CustomerAccount updated) {
        if (updated.getName() != null) {
            existing.setName(updated.getName());
        }
        if (updated.getTier() != null) {
            existing.setTier(normalizeTier(updated.getTier()));
        }
        if (updated.getPrimaryColor() != null) {
            existing.setPrimaryColor(updated.getPrimaryColor());
        }
        if (updated.getLogoUrl() != null) {
            existing.setLogoUrl(updated.getLogoUrl());
        }
        if (updated.getSubdomain() != null) {
            existing.setSubdomain(normalizeSubdomain(updated.getSubdomain()));
        }
        if (updated.getActive() != null) {
            existing.setActive(updated.getActive());
        }
        existing.setUpdatedAt(OffsetDateTime.now());
        return existing;
    }
}
