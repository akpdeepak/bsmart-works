package com.bcits.works;
import com.bcits.works.service.CustomerAccount;
import com.bcits.works.service.CustomerAccountService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("unit")
class CustomerAccountServiceTest {

    private final CustomerAccountService service = new CustomerAccountService();

    @Test
    void normalizeTier_knownUppercasedElseSilver() {
        assertEquals("PLATINUM", service.normalizeTier("platinum"));
        assertEquals("GOLD", service.normalizeTier("  Gold "));
        assertEquals("SILVER", service.normalizeTier("bronze"));
        assertEquals("SILVER", service.normalizeTier(null));
    }

    @Test
    void normalizeSubdomain_dnsSafeOrNull() {
        assertEquals("amr-utilities", service.normalizeSubdomain("AMR Utilities!"));
        assertEquals("amr", service.normalizeSubdomain("--amr--"));
        assertNull(service.normalizeSubdomain("   "));
        assertNull(service.normalizeSubdomain(null));
    }

    @Test
    void prepareNew_setsIdCreatorDefaults() {
        CustomerAccount a = new CustomerAccount();
        a.setName("AMR Utilities");
        a.setTier("platinum");
        a.setSubdomain("AMR");
        CustomerAccount prepared = service.prepareNew(a, "user-1");

        assertTrue(prepared.getId().startsWith("CA-"));
        assertEquals("user-1", prepared.getCreatedBy());
        assertEquals("PLATINUM", prepared.getTier());
        assertEquals("amr", prepared.getSubdomain());
        assertTrue(prepared.getActive());
        assertNotNull(prepared.getCreatedAt());
        assertEquals(prepared.getCreatedAt(), prepared.getUpdatedAt());
    }

    @Test
    void applyUpdate_copiesProvidedFieldsOnly() {
        CustomerAccount existing = new CustomerAccount();
        existing.setName("Old");
        existing.setTier("SILVER");
        existing.setCreatedBy("owner-1");

        CustomerAccount updated = new CustomerAccount();
        updated.setName("New name");
        updated.setTier("gold");

        CustomerAccount result = service.applyUpdate(existing, updated);
        assertEquals("New name", result.getName());
        assertEquals("GOLD", result.getTier());
        assertEquals("owner-1", result.getCreatedBy()); // preserved
        assertNotNull(result.getUpdatedAt());
    }
}
