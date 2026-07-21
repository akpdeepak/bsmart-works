package com.bcits.works.sla;

import org.springframework.stereotype.Service;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Pure logic for customer SLA tiers (iteration 9, Cap M): id/defaults, tier normalization and
 * update copying. No I/O — unit-testable in isolation.
 */
@Service
public class CustomerSlaTierService {

    public String normalizeTier(String tier) {
        return tier == null ? null : tier.trim().toUpperCase();
    }

    /** Response/resolution minutes must be positive to define a usable target. */
    public boolean hasValidTargets(CustomerSlaTier tier) {
        return tier.getResponseMinutes() != null && tier.getResponseMinutes() > 0
                && tier.getResolutionMinutes() != null && tier.getResolutionMinutes() > 0;
    }

    public CustomerSlaTier prepareNew(CustomerSlaTier tier) {
        tier.setId("SLT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        tier.setTier(normalizeTier(tier.getTier()));
        tier.setActive(tier.getActive() == null || tier.getActive());
        tier.setUpdatedAt(OffsetDateTime.now());
        return tier;
    }

    public CustomerSlaTier applyUpdate(CustomerSlaTier existing, CustomerSlaTier updated) {
        if (updated.getResponseMinutes() != null) {
            existing.setResponseMinutes(updated.getResponseMinutes());
        }
        if (updated.getResolutionMinutes() != null) {
            existing.setResolutionMinutes(updated.getResolutionMinutes());
        }
        if (updated.getActive() != null) {
            existing.setActive(updated.getActive());
        }
        existing.setUpdatedAt(OffsetDateTime.now());
        return existing;
    }
}
