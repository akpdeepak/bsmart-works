package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The privacy guarantees are the whole point of iteration 12, so they get the most exhaustive tests:
 * a manager can never reach an individual, personal data is private unless voluntarily shared, and
 * thin aggregates are suppressed to protect anonymity.
 */
@Tag("unit")
class KpiPrivacyServiceTest {

    private final KpiPrivacyService privacy = new KpiPrivacyService();

    @Test
    void normalizeLayer_fallsBackToPersonal_theSafestLayer() {
        assertThat(privacy.normalizeLayer("team")).isEqualTo("TEAM");
        assertThat(privacy.normalizeLayer(null)).isEqualTo("PERSONAL");
        assertThat(privacy.normalizeLayer("garbage")).isEqualTo("PERSONAL");
    }

    @Test
    void requiredPermission_layersToTheRightPermission() {
        assertThat(privacy.requiredPermission("PERSONAL")).isNull();
        assertThat(privacy.requiredPermission("TEAM")).isEqualTo("view_team_metrics");
        assertThat(privacy.requiredPermission("PROJECT")).isEqualTo("view_team_metrics");
        assertThat(privacy.requiredPermission("MANAGER")).isEqualTo("view_team_metrics");
        assertThat(privacy.requiredPermission("ORG")).isEqualTo("view_org_metrics");
    }

    @Test
    void assertNoIndividualScope_blocksManagerDrillIntoIndividual() {
        // The headline guarantee: an individual identifier on any aggregated layer is a hard 403.
        for (String layer : List.of("TEAM", "PROJECT", "MANAGER", "ORG")) {
            assertThatThrownBy(() -> privacy.assertNoIndividualScope(layer, "USR-victim"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("privacy");
        }
    }

    @Test
    void assertNoIndividualScope_allowsAggregatedWithoutIndividual_andPersonalWithIndividual() {
        privacy.assertNoIndividualScope("TEAM", null);   // no individual → fine
        privacy.assertNoIndividualScope("TEAM", "");      // blank → fine
        privacy.assertNoIndividualScope("PERSONAL", "USR-1"); // personal layer may name a person
    }

    @Test
    void canViewPersonal_ownerSeesSelf() {
        assertThat(privacy.canViewPersonal("USR-1", "USR-1", List.of(), OffsetDateTime.now())).isTrue();
    }

    @Test
    void canViewPersonal_nonOwnerBlockedWithoutShare() {
        assertThat(privacy.canViewPersonal("USR-2", "USR-1", List.of(), OffsetDateTime.now())).isFalse();
    }

    @Test
    void canViewPersonal_nonOwnerAllowedWithActiveShare() {
        MetricShare share = share("USR-1", "USR-2", null);
        assertThat(privacy.canViewPersonal("USR-2", "USR-1", List.of(share), OffsetDateTime.now())).isTrue();
    }

    @Test
    void canViewPersonal_expiredShareDoesNotGrantAccess() {
        MetricShare share = share("USR-1", "USR-2", OffsetDateTime.now().minusDays(1));
        assertThat(privacy.canViewPersonal("USR-2", "USR-1", List.of(share), OffsetDateTime.now())).isFalse();
    }

    @Test
    void canViewPersonal_shareForDifferentOwnerDoesNotLeak() {
        // A share from USR-3 must not let USR-2 read USR-1's metrics.
        MetricShare share = share("USR-3", "USR-2", null);
        assertThat(privacy.canViewPersonal("USR-2", "USR-1", List.of(share), OffsetDateTime.now())).isFalse();
    }

    @Test
    void mustSuppress_hidesThinAggregatesButNeverPersonal() {
        assertThat(privacy.mustSuppress("TEAM", 2, 3)).isTrue();   // below the floor → suppressed
        assertThat(privacy.mustSuppress("TEAM", 3, 3)).isFalse();  // at the floor → published
        assertThat(privacy.mustSuppress("ORG", 1, 3)).isTrue();
        assertThat(privacy.mustSuppress("PERSONAL", 1, 3)).isFalse(); // your own data is never suppressed
    }

    @Test
    void effectiveMinAggregationSize_usesPolicyOrDefault() {
        assertThat(privacy.effectiveMinAggregationSize(null))
            .isEqualTo(KpiPrivacyService.DEFAULT_MIN_AGGREGATION_SIZE);
        WorkspaceKpiSettings strict = new WorkspaceKpiSettings();
        strict.setMinAggregationSize(5);
        assertThat(privacy.effectiveMinAggregationSize(strict)).isEqualTo(5);
    }

    private MetricShare share(String owner, String recipient, OffsetDateTime expiresAt) {
        MetricShare s = new MetricShare();
        s.setOwnerId(owner);
        s.setSharedWithId(recipient);
        s.setExpiresAt(expiresAt);
        return s;
    }
}
