package com.example.demo;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
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
    private final String allowedOrigins;

    public SecurityConfig(JwtUtil jwtUtil,
                          @Value("${app.cors.allowed-origins}") String allowedOrigins) {
        this.jwtUtil = jwtUtil;
        this.allowedOrigins = allowedOrigins;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .headers(headers -> headers
                .contentSecurityPolicy(csp -> csp.policyDirectives(
                    "default-src 'self'; " +
                    "script-src 'self'; " +
                    "style-src 'self' 'unsafe-inline'; " +
                    "img-src 'self' data: blob:; " +
                    "font-src 'self'; " +
                    "connect-src 'self'; " +
                    "frame-ancestors 'none'"
                ))
                .frameOptions(frame -> frame.deny())
                .contentTypeOptions(withDefaults())
                .referrerPolicy(referrer -> referrer.policy(
                    org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN
                ))
            )
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/auth/login", "/api/v1/auth/signup",
                                 "/api/v1/auth/verify", "/api/v1/auth/forgot-password",
                                 // token-based reset (no session yet) + MFA challenge during login
                                 "/api/v1/auth/reset-password", "/api/v1/auth/mfa/verify",
                                 // passwordless passkey sign-in ceremony (pre-auth, iteration 19 Cap T)
                                 "/api/v1/auth/passkey/authenticate/begin",
                                 "/api/v1/auth/passkey/authenticate/finish").permitAll()
                // Public, read-only, token-scoped dashboard embeds (iteration 6). GET only.
                .requestMatchers(HttpMethod.GET, "/api/v1/public/**").permitAll()
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
                // Authorization header, so for those streaming requests we also accept the JWT as an
                // access_token query param. The token is still validated exactly the same way.
                String token = null;
                if (authHeader != null && authHeader.startsWith("Bearer ")) {
                    token = authHeader.substring(7);
                } else {
                    String paramToken = request.getParameter("access_token");
                    if (paramToken != null && !paramToken.isBlank()) {
                        token = paramToken;
                    }
                }

                if (token != null) {
                    try {
                        userId = jwtUtil.extractUserId(token);
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
}
