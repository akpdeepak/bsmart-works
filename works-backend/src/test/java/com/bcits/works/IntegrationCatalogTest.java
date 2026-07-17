package com.bcits.works;
import com.bcits.works.automation.IntegrationCatalog;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The integration provider registry (iteration 13, Cap Q / Cap A) — includes the tooling connectors
 * and the SSO/SCIM identity providers.
 */
@Tag("unit")
class IntegrationCatalogTest {

    @Test
    void providers_includeToolingAndIdentity() {
        assertThat(IntegrationCatalog.isProvider(IntegrationCatalog.SLACK)).isTrue();
        assertThat(IntegrationCatalog.isProvider(IntegrationCatalog.GITHUB)).isTrue();
        assertThat(IntegrationCatalog.isProvider(IntegrationCatalog.EMAIL)).isTrue();
        assertThat(IntegrationCatalog.isProvider(IntegrationCatalog.SAML)).isTrue();
        assertThat(IntegrationCatalog.isProvider(IntegrationCatalog.SCIM)).isTrue();
        assertThat(IntegrationCatalog.isProvider("nope")).isFalse();
    }

    @Test
    void requiredFields_areDeclaredPerProvider() {
        assertThat(IntegrationCatalog.requiredFields(IntegrationCatalog.SLACK)).contains("webhookUrl");
        assertThat(IntegrationCatalog.requiredFields(IntegrationCatalog.GITHUB)).contains("repo", "token");
        assertThat(IntegrationCatalog.requiredFields("unknown")).isEmpty();
    }

    @Test
    void emailProvider_supportsInbound() {
        assertThat(IntegrationCatalog.get(IntegrationCatalog.EMAIL).inbound()).isTrue();
    }
}
