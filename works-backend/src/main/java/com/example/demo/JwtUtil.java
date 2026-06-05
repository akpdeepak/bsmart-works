package com.example.demo;

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
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + EXPIRY_MS))
                .signWith(key())
                .compact();
    }

    /**
     * Portal token for an external customer account (iteration 9, Cap N). The subject is the
     * customer account id; the {@code portal} claim marks it so portal endpoints never confuse it
     * with an internal user, and {@code workspace}/{@code org} carry the tenant + organization the
     * token is bound to — the basis for organization-scoped reads (RB-40 §1). Same signing key and
     * stateless contract as the internal token.
     */
    public String generatePortal(String accountId, String email, String workspaceId, String organizationId) {
        return Jwts.builder()
                .subject(accountId)
                .claim("email", email)
                .claim("portal", true)
                .claim("workspace", workspaceId)
                .claim("org", organizationId)
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
}
