package com.bcits.works;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtil {

    private static final long EXPIRY_MS = 7 * 24 * 60 * 60 * 1000L; // 7 days
    private final String secret;

    public JwtUtil(@Value("${app.jwt.secret}") String secret) {
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("app.jwt.secret must be at least 32 bytes for HS256 signing");
        }
        this.secret = secret;
    }

    private SecretKey key() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String generate(String userId, String email) {
        return Jwts.builder()
                .subject(userId)
                .claim("email", email)
                .claim("scope", "internal")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + EXPIRY_MS))
                .signWith(key())
                .compact();
    }

    /**
     * Mint a token for an external customer-portal user (iteration 9). It carries {@code scope=customer}
     * plus the account and workspace so portal endpoints can scope reads without a DB round-trip — and
     * so a customer token can never be mistaken for an internal one.
     */
    public String generateCustomer(String customerUserId, String email, String accountId, String workspaceId) {
        return Jwts.builder()
                .subject(customerUserId)
                .claim("email", email)
                .claim("scope", "customer")
                .claim("accountId", accountId)
                .claim("workspaceId", workspaceId)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + EXPIRY_MS))
                .signWith(key())
                .compact();
    }

    public Claims validate(String token) {
        return Jwts.parser().verifyWith(key()).build().parseSignedClaims(token).getPayload();
    }

    public String extractUserId(String token) {
        return validate(token).getSubject();
    }

    public String extractScope(String token) {
        Object scope = validate(token).get("scope");
        return scope == null ? "internal" : scope.toString();
    }

    public boolean isCustomerToken(String token) {
        return "customer".equals(extractScope(token));
    }

    public String extractClaim(String token, String name) {
        Object value = validate(token).get(name);
        return value == null ? null : value.toString();
    }
}
