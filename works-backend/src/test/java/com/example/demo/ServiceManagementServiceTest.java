package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link ServiceManagementService} — the pure field-level helpers for iteration 9:
 * id generation, defaults/normalization, update copying, server-side form validation, and CSAT
 * aggregation math. No DB. Mirrors {@link SlaPolicyServiceTest}.
 */
@Tag("unit")
class ServiceManagementServiceTest {

    private final ServiceManagementService service = new ServiceManagementService();

    // ── Customer organizations ───────────────────────────────────────────────────

    @Test
    void prepareOrganization_stampsIdCreator_normalizesTierAndSubdomain() {
        CustomerOrganization org = new CustomerOrganization();
        org.setName("Acme Power");
        org.setTier("  platinum ");
        org.setSubdomain("  ACME ");

        CustomerOrganization out = service.prepareOrganization(org, "USR-1");

        assertThat(out.getId()).startsWith("CORG-");
        assertThat(out.getCreatedBy()).isEqualTo("USR-1");
        assertThat(out.getTier()).isEqualTo("PLATINUM");
        assertThat(out.getSubdomain()).isEqualTo("acme");
        assertThat(out.getActive()).isTrue();
        assertThat(out.getCreatedAt()).isNotNull();
    }

    @Test
    void prepareOrganization_unknownTierFallsBackToSilver() {
        CustomerOrganization org = new CustomerOrganization();
        org.setName("X");
        org.setTier("BRONZE");
        assertThat(service.prepareOrganization(org, "USR-1").getTier()).isEqualTo("SILVER");
    }

    @Test
    void applyOrganizationUpdate_copiesEditableFields_andBumpsUpdatedAt() {
        CustomerOrganization existing = new CustomerOrganization();
        existing.setName("Old");
        existing.setTier("SILVER");

        CustomerOrganization updated = new CustomerOrganization();
        updated.setName("New");
        updated.setTier("gold");
        updated.setPrimaryColor("#0B2F5C");

        CustomerOrganization out = service.applyOrganizationUpdate(existing, updated);

        assertThat(out.getName()).isEqualTo("New");
        assertThat(out.getTier()).isEqualTo("GOLD");
        assertThat(out.getPrimaryColor()).isEqualTo("#0B2F5C");
        assertThat(out.getUpdatedAt()).isNotNull();
    }

    // ── Request types ────────────────────────────────────────────────────────────

    @Test
    void prepareRequestType_normalizesCategoryAndDefaults() {
        RequestType type = new RequestType();
        type.setName("New connection");
        type.setCategory("  service_request ");
        type.setFormSchema(null);
        type.setSortOrder(null);

        RequestType out = service.prepareRequestType(type, "USR-1");

        assertThat(out.getId()).startsWith("RQT-");
        assertThat(out.getCategory()).isEqualTo("SERVICE_REQUEST");
        assertThat(out.getFormSchema()).isEqualTo("[]");
        assertThat(out.getActive()).isTrue();
        assertThat(out.getSortOrder()).isZero();
    }

    @Test
    void prepareRequestType_unknownCategoryFallsBack() {
        RequestType type = new RequestType();
        type.setName("X");
        type.setCategory("QUESTION");
        assertThat(service.prepareRequestType(type, "USR-1").getCategory()).isEqualTo("SERVICE_REQUEST");
    }

    // ── Customer requests ────────────────────────────────────────────────────────

    @Test
    void prepareRequest_stampsScopeAndForcesUnassignedOpen() {
        CustomerRequest req = new CustomerRequest();
        req.setSubject("Outage");
        req.setPriority(" high ");
        req.setAssigneeId("USR-SNEAKY");   // a portal submission must never set its own assignee
        req.setStatus("RESOLVED");          // nor its own status

        CustomerRequest out = service.prepareRequest(req, "CORG-1", "WS-1", "CACC-1");

        assertThat(out.getId()).startsWith("REQ-");
        assertThat(out.getOrganizationId()).isEqualTo("CORG-1");
        assertThat(out.getWorkspaceId()).isEqualTo("WS-1");
        assertThat(out.getSubmittedBy()).isEqualTo("CACC-1");
        assertThat(out.getStatus()).isEqualTo("OPEN");
        assertThat(out.getPriority()).isEqualTo("HIGH");
        assertThat(out.getAssigneeId()).isNull();
        assertThat(out.getFormData()).isEqualTo("{}");
    }

    @Test
    void prepareRequest_unknownPriorityFallsBackToMedium() {
        CustomerRequest req = new CustomerRequest();
        req.setSubject("X");
        req.setPriority("URGENT");
        assertThat(service.prepareRequest(req, "CORG-1", "WS-1", "CACC-1").getPriority()).isEqualTo("MEDIUM");
    }

    // ── Form validation ──────────────────────────────────────────────────────────

    @Test
    void missingRequiredFields_flagsBlankAndAbsentRequiredFields() {
        String schema = "[{\"key\":\"meter\",\"label\":\"Meter number\",\"required\":true},"
                + "{\"key\":\"notes\",\"label\":\"Notes\",\"required\":false}]";
        String data = "{\"notes\":\"some text\"}";   // meter absent

        List<String> missing = service.missingRequiredFields(schema, data);

        assertThat(missing).containsExactly("Meter number");
    }

    @Test
    void missingRequiredFields_passesWhenAllRequiredProvided() {
        String schema = "[{\"key\":\"meter\",\"label\":\"Meter number\",\"required\":true}]";
        String data = "{\"meter\":\"MTR-9\"}";
        assertThat(service.missingRequiredFields(schema, data)).isEmpty();
    }

    @Test
    void missingRequiredFields_blankStringCountsAsMissing() {
        String schema = "[{\"key\":\"meter\",\"label\":\"Meter number\",\"required\":true}]";
        String data = "{\"meter\":\"   \"}";
        assertThat(service.missingRequiredFields(schema, data)).containsExactly("Meter number");
    }

    @Test
    void missingRequiredFields_malformedSchema_isTreatedAsNoRequirements() {
        assertThat(service.missingRequiredFields("not json", "{}")).isEmpty();
        assertThat(service.missingRequiredFields("{}", "{}")).isEmpty();   // object, not array
    }

    // ── CSAT aggregation ─────────────────────────────────────────────────────────

    @Test
    @SuppressWarnings("unchecked")
    void aggregateCsat_computesAverageCountDistribution() {
        Map<String, Object> out = service.aggregateCsat(Arrays.asList(5, 5, 4, 3, null, 0, 9));

        assertThat(out.get("count")).isEqualTo(4L);                    // null/0/9 ignored
        assertThat(out.get("average")).isEqualTo(4.3);                 // (5+5+4+3)/4 = 4.25 → 4.3 rounded
        Map<String, Long> dist = (Map<String, Long>) out.get("distribution");
        assertThat(dist.get("5")).isEqualTo(2L);
        assertThat(dist.get("4")).isEqualTo(1L);
        assertThat(dist.get("3")).isEqualTo(1L);
        assertThat(dist.get("1")).isZero();
        assertThat(dist).containsKeys("1", "2", "3", "4", "5");
    }

    @Test
    void aggregateCsat_emptyIsZeroAverageZeroCount() {
        Map<String, Object> out = service.aggregateCsat(List.of());
        assertThat(out.get("count")).isEqualTo(0L);
        assertThat(out.get("average")).isEqualTo(0.0);
    }
}
