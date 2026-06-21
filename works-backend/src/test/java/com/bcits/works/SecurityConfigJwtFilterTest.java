package com.bcits.works;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@Tag("unit")
class SecurityConfigJwtFilterTest {

    private static final String SECRET = "unit-test-jwt-filter-secret-abcdef123456";

    private final JwtUtil jwtUtil = new JwtUtil(SECRET);
    // Default mock = not revoked, so the existing happy-path tests are unaffected by the W1 revocation
    // check; the revocation test below stubs it true.
    private final TokenRevocationService tokenRevocation = mock(TokenRevocationService.class);
    private final SecurityConfig securityConfig =
            new SecurityConfig(jwtUtil, tokenRevocation, "http://localhost:5173", "'self'");

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void queryParamTokenAuthenticatesOnlyRealtimeStream() throws Exception {
        String token = jwtUtil.generate("USR-RT", "rt@example.com");
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/realtime/stream");
        request.addParameter("access_token", token);
        MockHttpServletResponse response = new MockHttpServletResponse();

        doFilter(request, response);

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(request.getAttribute("authenticatedUserId")).isEqualTo("USR-RT");
        assertThat(SecurityContextHolder.getContext().getAuthentication().getPrincipal()).isEqualTo("USR-RT");
    }

    @Test
    void queryParamTokenIsIgnoredOnNormalApiPaths() throws Exception {
        String token = jwtUtil.generate("USR-NORMAL", "normal@example.com");
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/work-items");
        request.addParameter("access_token", token);
        MockHttpServletResponse response = new MockHttpServletResponse();

        doFilter(request, response);

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(request.getAttribute("authenticatedUserId")).isNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void authorizationHeaderStillAuthenticatesNormalApiPaths() throws Exception {
        String token = jwtUtil.generate("USR-BEARER", "bearer@example.com");
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/work-items");
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();

        doFilter(request, response);

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(request.getAttribute("authenticatedUserId")).isEqualTo("USR-BEARER");
        assertThat(SecurityContextHolder.getContext().getAuthentication().getPrincipal()).isEqualTo("USR-BEARER");
    }

    @Test
    void revokedInternalTokenIsRejectedWith401_andDoesNotAuthenticate() throws Exception {
        String token = jwtUtil.generate("USR-REVOKED", "revoked@example.com");
        // The subject revoked their tokens (e.g. password change) after this token was issued.
        when(tokenRevocation.isUserTokenRevoked(eq("USR-REVOKED"), any())).thenReturn(true);

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/work-items");
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();

        SecurityContextHolder.clearContext();
        AtomicBoolean continued = new AtomicBoolean(false);
        FilterChain chain = (req, res) -> continued.set(true);
        securityConfig.jwtAuthFilter().doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(continued).as("a revoked token must not continue the chain").isFalse();
        assertThat(SecurityContextHolder.getContext().getAuthentication())
            .as("a revoked token must not set an authenticated principal").isNull();
    }

    private void doFilter(MockHttpServletRequest request, MockHttpServletResponse response) throws Exception {
        SecurityContextHolder.clearContext();
        AtomicBoolean continued = new AtomicBoolean(false);
        FilterChain chain = (req, res) -> continued.set(true);
        Filter filter = securityConfig.jwtAuthFilter();
        filter.doFilter(request, response, chain);
        assertThat(continued).isTrue();
    }
}
