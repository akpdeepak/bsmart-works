package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static com.example.demo.AiPolicyResolver.Mode;
import static com.example.demo.AiPolicyResolver.Toggle;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link AiPolicyResolver} — the AI scope hierarchy (iteration 10, Cap Z; RB-40 §2).
 * Proves most-restrictive-wins across workspace → capability → user → in-context. Pure; no DB.
 */
@Tag("unit")
class AiPolicyResolverTest {

    private final AiPolicyResolver resolver = new AiPolicyResolver();

    @Test
    void contextOptOut_alwaysWins_evenWhenEverythingElseIsOn() {
        assertThat(resolver.isEnabled(Mode.ENABLED, Toggle.ON, Toggle.ON, true)).isFalse();
    }

    @Test
    void workspaceDisabled_isOffEverywhereDownstream() {
        assertThat(resolver.isEnabled(Mode.DISABLED, Toggle.ON, Toggle.ON, false)).isFalse();
    }

    @Test
    void capabilityOff_turnsItOff_regardlessOfUser() {
        assertThat(resolver.isEnabled(Mode.ENABLED, Toggle.OFF, Toggle.ON, false)).isFalse();
    }

    @Test
    void userOff_turnsItOffForThatUser() {
        assertThat(resolver.isEnabled(Mode.ENABLED, Toggle.INHERIT, Toggle.OFF, false)).isFalse();
    }

    @Test
    void enabled_withInherits_isOnByDefault() {
        assertThat(resolver.isEnabled(Mode.ENABLED, Toggle.INHERIT, Toggle.INHERIT, false)).isTrue();
    }

    @Test
    void optIn_requiresExplicitUserOptIn() {
        assertThat(resolver.isEnabled(Mode.OPT_IN, Toggle.INHERIT, Toggle.INHERIT, false)).isFalse();
        assertThat(resolver.isEnabled(Mode.OPT_IN, Toggle.ON, Toggle.INHERIT, false)).isFalse();
        assertThat(resolver.isEnabled(Mode.OPT_IN, Toggle.INHERIT, Toggle.ON, false)).isTrue();
    }

    @Test
    void nullsReadAsConservativeDefaults() {
        // null mode → OPT_IN, null toggles → INHERIT → off until opt-in
        assertThat(resolver.isEnabled(null, null, null, false)).isFalse();
    }

    @Test
    void parseMode_isCaseInsensitive_andDefaultsToOptIn() {
        assertThat(resolver.parseMode("enabled")).isEqualTo(Mode.ENABLED);
        assertThat(resolver.parseMode("  DISABLED ")).isEqualTo(Mode.DISABLED);
        assertThat(resolver.parseMode("nonsense")).isEqualTo(Mode.OPT_IN);
        assertThat(resolver.parseMode(null)).isEqualTo(Mode.OPT_IN);
    }

    @Test
    void toggleOf_mapsNullableBooleanToTriState() {
        assertThat(resolver.toggleOf(null)).isEqualTo(Toggle.INHERIT);
        assertThat(resolver.toggleOf(Boolean.TRUE)).isEqualTo(Toggle.ON);
        assertThat(resolver.toggleOf(Boolean.FALSE)).isEqualTo(Toggle.OFF);
    }
}
