package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** Unit tests for OAuthCallbackController — provider-scope mapping and constant assertions. */
@Tag("unit")
class OAuthCallbackControllerTest {

    @Test
    void providerScopes_containsExpectedScopesForAllThreeProviders() {
        assertThat(OAuthCallbackController.PROVIDER_SCOPES).containsKeys("SLACK", "GITHUB", "GITLAB");
        assertThat(OAuthCallbackController.PROVIDER_SCOPES.get("SLACK")).contains("channels:read");
        assertThat(OAuthCallbackController.PROVIDER_SCOPES.get("GITHUB")).contains("repo");
        assertThat(OAuthCallbackController.PROVIDER_SCOPES.get("GITLAB")).contains("read_api");
    }

    @Test
    void providerScopes_followsLeastPrivilege_noAdminScopes() {
        OAuthCallbackController.PROVIDER_SCOPES.values().forEach(scopes -> {
            assertThat(scopes).doesNotContain("admin");
            assertThat(scopes).doesNotContain("delete");
        });
    }
}
