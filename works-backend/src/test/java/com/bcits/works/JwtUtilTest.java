package com.bcits.works;

import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Tag("unit")
class JwtUtilTest {

    // 32+ byte value required for HS256; intentionally plain so scanners ignore it
    private static final String SIGNING_SEED = "unit-test-jwt-seed-value-abcdefghijk123";
    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil(SIGNING_SEED);
    }

    @Test
    void generate_producesNonNullToken() {
        String token = jwtUtil.generate("user-1", "user@example.com");
        assertThat(token).isNotBlank();
    }

    @Test
    void generate_tokenHasThreeJwtParts() {
        String token = jwtUtil.generate("user-1", "user@example.com");
        assertThat(token.split("\\.")).hasSize(3);
    }

    @Test
    void extractUserId_returnsSubjectFromGeneratedToken() {
        String token = jwtUtil.generate("user-42", "test@example.com");
        assertThat(jwtUtil.extractUserId(token)).isEqualTo("user-42");
    }

    @Test
    void validate_returnsClaimsWithCorrectEmail() {
        String token = jwtUtil.generate("user-7", "hello@example.com");
        Claims claims = jwtUtil.validate(token);
        assertThat(claims.get("email", String.class)).isEqualTo("hello@example.com");
        assertThat(claims.getSubject()).isEqualTo("user-7");
    }

    @Test
    void validate_tamperedToken_throwsException() {
        String token = jwtUtil.generate("user-1", "a@b.com") + "tampered";
        assertThatThrownBy(() -> jwtUtil.validate(token))
                .isInstanceOf(Exception.class);
    }

    @Test
    void constructor_shortSecret_throwsIllegalState() {
        assertThatThrownBy(() -> new JwtUtil("tooshort"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("32 bytes");
    }

    // ── customer-portal tokens (iteration 9) ────────────────────────────────────────
    @Test
    void internalToken_hasInternalScopeAndIsNotCustomer() {
        String token = jwtUtil.generate("user-1", "u@example.com");
        assertThat(jwtUtil.extractScope(token)).isEqualTo("internal");
        assertThat(jwtUtil.isCustomerToken(token)).isFalse();
    }

    @Test
    void customerToken_carriesScopeAccountAndWorkspace() {
        String token = jwtUtil.generateCustomer("CU-1", "asha@amr.example", "CA-1", "WS-002");
        assertThat(jwtUtil.isCustomerToken(token)).isTrue();
        assertThat(jwtUtil.extractScope(token)).isEqualTo("customer");
        assertThat(jwtUtil.extractUserId(token)).isEqualTo("CU-1");
        assertThat(jwtUtil.extractClaim(token, "accountId")).isEqualTo("CA-1");
        assertThat(jwtUtil.extractClaim(token, "workspaceId")).isEqualTo("WS-002");
        assertThat(jwtUtil.extractClaim(token, "missing")).isNull();
    }
}
