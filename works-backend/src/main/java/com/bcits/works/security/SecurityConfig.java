package com.bcits.works.security;

import com.bcits.works.auth.JwtUtil;
import com.bcits.works.auth.TokenRevocationService;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import static org.springframework.security.config.Customizer.withDefaults;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtUtil jwtUtil;
    private final TokenRevocationService tokenRevocation;
    private final String allowedOrigins;
    private final String embedFrameAncestors;

    public SecurityConfig(JwtUtil jwtUtil,
                          TokenRevocationService tokenRevocation,
                          @Value("${app.cors.allowed-origins}") String allowedOrigins,
                          @Value("${app.embed.frame-ancestors:'self'}") String embedFrameAncestors) {
        this.jwtUtil = jwtUtil;
        this.tokenRevocation = tokenRevocation;
        this.allowedOrigins = allowedOrigins;
        this.embedFrameAncestors = embedFrameAncestors;
    }

    // Shared content-type + referrer hardening applied to every chain (RB-10 §8).
    private static void commonHardening(HeadersConfigurer<HttpSecurity> headers) {
        headers
            .contentTypeOptions(withDefaults())
            .referrerPolicy(referrer -> referrer.policy(
                org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN
            ));
    }

    /**
     * Public, read-only, token-scoped dashboard embed API (iteration 6, Cap J — "iframe-embeddable
     * URLs"). This chain matches ONLY {@code /api/v1/public/**} and deliberately relaxes the framing
     * controls so the embed page's API responses don't carry the app's {@code X-Frame-Options: DENY}
     * / {@code frame-ancestors 'none'} (RB-40 §1, RB-10 §8). The allowance is NARROW:
     * <ul>
     *   <li>It applies only to this unauthenticated, GET-only, token-scoped path — never the app.</li>
     *   <li>It uses CSP {@code frame-ancestors} (an allow-list) and OMITS {@code X-Frame-Options}
     *       (which can only say DENY/SAMEORIGIN and would otherwise contradict the allow-list).</li>
     *   <li>The allow-list defaults to {@code 'self'} (same-origin embeds) and is configurable via
     *       {@code app.embed.frame-ancestors} for a workspace's customer portal origins. It is
     *       never {@code *} — opening framing to any origin is rejected by policy.</li>
     * </ul>
     * The endpoint already resolves the workspace from the share token, not the caller
     * (PublicDashboardController), so this changes framing only — not tenant isolation.
     */
    @Bean
    @Order(1)
    public SecurityFilterChain publicEmbedFilterChain(HttpSecurity http) throws Exception {
        http
            .securityMatcher("/api/v1/public/**")
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .headers(headers -> {
                commonHardening(headers);
                headers
                    .contentSecurityPolicy(csp -> csp.policyDirectives(
                        "default-src 'self'; " +
                        "img-src 'self' data: blob:; " +
                        "style-src 'self' 'unsafe-inline'; " +
                        "frame-ancestors " + embedFrameAncestors
                    ))
                    // Drop the inherited X-Frame-Options entirely — frame-ancestors above is the
                    // single source of truth for who may frame this path (an allow-list, not DENY).
                    .frameOptions(frame -> frame.disable());
            })
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Public, read-only, token-scoped dashboard embeds (iteration 6). GET only.
                .requestMatchers(HttpMethod.GET, "/api/v1/public/**").permitAll()
                .anyRequest().denyAll()
            );
        return http.build();
    }

    @Bean
    @Order(2)
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .headers(headers -> {
                commonHardening(headers);
                headers
                    .contentSecurityPolicy(csp -> csp.policyDirectives(
                        "default-src 'self'; " +
                        "script-src 'self'; " +
                        "style-src 'self' 'unsafe-inline'; " +
                        "img-src 'self' data: blob:; " +
                        "font-src 'self'; " +
                        "connect-src 'self'; " +
                        // The authenticated app is never framable — this is unchanged (RB-10 §8).
                        "frame-ancestors 'none'"
                    ))
                    .frameOptions(frame -> frame.deny());
            })
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health", "/actuator/health/**", "/actuator/info").permitAll()
                .requestMatchers("/api/v1/auth/login", "/api/v1/auth/signup",
                                 "/api/v1/auth/verify", "/api/v1/auth/forgot-password",
                                 // token-based reset (no session yet) + MFA challenge during login
                                 "/api/v1/auth/reset-password", "/api/v1/auth/mfa/verify",
                                 // passwordless passkey sign-in ceremony (pre-auth, iteration 19 Cap T)
                                 "/api/v1/auth/passkey/authenticate/begin",
                                 "/api/v1/auth/passkey/authenticate/finish").permitAll()
                // External customer-portal login (iteration 9) — separate identity, own login flow.
                .requestMatchers("/api/v1/portal/auth/login").permitAll()
                // SCIM 2.0 endpoints authenticate via their own Bearer token (not JWT); the
                // ScimController resolves the workspace from the token itself (RB-40 §1).
                .requestMatchers("/scim/v2/**").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter(), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isBlank())
                .toList());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("Authorization"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public OncePerRequestFilter jwtAuthFilter() {
        return new OncePerRequestFilter() {
            @Override
            protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                            FilterChain filterChain) throws jakarta.servlet.ServletException, IOException {
                String authHeader = request.getHeader("Authorization");
                String userId = null;

                // The browser EventSource API (real-time SSE, iteration 18) cannot set an
                // Authorization header, so for the realtime stream only we also accept the JWT as an
                // access_token query param. Do not accept query-param JWTs on normal API paths.
                String token = null;
                if (authHeader != null && authHeader.startsWith("Bearer ")) {
                    token = authHeader.substring(7);
                } else if (isRealtimeStreamRequest(request)) {
                    String paramToken = request.getParameter("access_token");
                    if (paramToken != null && !paramToken.isBlank()) {
                        token = paramToken;
                    }
                }

                if (token != null) {
                    try {
                        io.jsonwebtoken.Claims claims = jwtUtil.validate(token);
                        userId = claims.getSubject();
                        // Token-version revocation (W1 rate-limit/JWT PR1): reject a token issued before
                        // the subject's cutoff (bumped on erase / password change / reset). Customer-
                        // scoped tokens are checked at their portal choke point (CustomerContext); here
                        // we enforce internal-scoped tokens against the users table.
                        if (userId != null && !"customer".equals(claims.get("scope", String.class))) {
                            java.util.Date iat = claims.getIssuedAt();
                            if (tokenRevocation.isUserTokenRevoked(
                                    userId, iat == null ? null : iat.toInstant())) {
                                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                                response.getWriter().write("{\"error\":\"Token revoked\"}");
                                return;
                            }
                        }
                        // Individual-token revocation (PR2): a logged-out token's jti is blocklisted.
                        // Scope-agnostic — a dead token is dead whether internal or customer.
                        String jti = claims.getId();
                        if (jti != null && tokenRevocation.isBlocklisted(jti)) {
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.getWriter().write("{\"error\":\"Token revoked\"}");
                            return;
                        }
                    } catch (Exception e) {
                        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        response.getWriter().write("{\"error\":\"Invalid or expired token\"}");
                        return;
                    }
                }

                if (userId != null) {
                    request.setAttribute("authenticatedUserId", userId);
                    var auth = new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                            userId, null, List.of());
                    org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(auth);
                }

                filterChain.doFilter(request, response);
            }
        };
    }

    static boolean isRealtimeStreamRequest(HttpServletRequest request) {
        return "/api/v1/realtime/stream".equals(request.getRequestURI());
    }
}
