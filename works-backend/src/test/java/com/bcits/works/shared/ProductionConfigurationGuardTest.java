package com.bcits.works.shared;


import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Tag("unit")
class ProductionConfigurationGuardTest {

    private static final String STRONG_SECRET =
            "prod-secret-with-more-than-32-bytes-value";

    @Test
    void localProfileAllowsDevSecretForFrictionlessDevelopment() {
        assertThatCode(() -> ProductionConfigurationGuard.validate(
                new String[] {"local"}, ProductionConfigurationGuard.DEV_JWT_SECRET, true))
                .doesNotThrowAnyException();
    }

    @Test
    void productionProfileRejectsMissingOrDevJwtSecret() {
        assertThatThrownBy(() -> ProductionConfigurationGuard.validate(
                new String[] {"prod"}, "", false))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("BSMART_JWT_SECRET");

        assertThatThrownBy(() -> ProductionConfigurationGuard.validate(
                new String[] {"staging"}, ProductionConfigurationGuard.DEV_JWT_SECRET, false))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("BSMART_JWT_SECRET");
    }

    @Test
    void productionProfileRejectsDevVerificationTokenExposure() {
        assertThatThrownBy(() -> ProductionConfigurationGuard.validate(
                new String[] {"production"}, STRONG_SECRET, true))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("verification tokens");
    }

    @Test
    void productionProfileAcceptsStrongSecretWithNoDevTokenExposure() {
        assertThatCode(() -> ProductionConfigurationGuard.validate(
                new String[] {"prod"}, STRONG_SECRET, false))
                .doesNotThrowAnyException();
    }

    @Test
    void protectedProfileDetectionIncludesStageAndStaging() {
        assertThat(ProductionConfigurationGuard.isProtectedProfile(new String[] {"stage"})).isTrue();
        assertThat(ProductionConfigurationGuard.isProtectedProfile(new String[] {"staging"})).isTrue();
        assertThat(ProductionConfigurationGuard.isProtectedProfile(new String[] {"dev"})).isFalse();
    }
}
