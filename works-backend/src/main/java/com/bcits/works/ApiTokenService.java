package com.bcits.works;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Public-API token management (iteration 13, Cap Q) — the bearer/OAuth foundation. Tokens are shown
 * once at issue time; only a prefix (for lookup) and a SHA-256 hash are persisted, so a database leak
 * never exposes a usable token. Workspace-scoped (RB-40 §1).
 */
@Service
public class ApiTokenService {

    static final String TOKEN_PREFIX = "wtk_";

    private final ApiTokenRepository tokens;
    private final ObjectMapper json = new ObjectMapper();

    public ApiTokenService(ApiTokenRepository tokens) {
        this.tokens = tokens;
    }

    public record IssuedToken(ApiToken token, String plaintext) { }

    public List<ApiToken> list(String workspaceId) {
        return tokens.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId);
    }

    @Transactional
    public IssuedToken issue(String workspaceId, String creatorId, String name, List<String> scopes) {
        if (name == null || name.isBlank()) {
            throw ApiException.badRequest("MISSING_NAME", "Token name is required.", "name");
        }
        String plaintext = TOKEN_PREFIX + UUID.randomUUID().toString().replace("-", "")
            + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        ApiToken t = new ApiToken();
        t.setId("TOK-" + shortId());
        t.setWorkspaceId(workspaceId);
        t.setName(name.trim());
        t.setTokenPrefix(prefixOf(plaintext));
        t.setTokenHash(sha256Hex(plaintext));
        t.setScopes(toJson(scopes));
        t.setCreatedBy(creatorId);
        t.setRevoked(false);
        t.setCreatedAt(OffsetDateTime.now());
        return new IssuedToken(tokens.save(t), plaintext);
    }

    /** Verify a presented token; returns the matching, non-revoked record or empty. Updates last-used. */
    @Transactional
    public Optional<ApiToken> verify(String plaintext) {
        if (plaintext == null || !plaintext.startsWith(TOKEN_PREFIX)) {
            return Optional.empty();
        }
        String hash = sha256Hex(plaintext);
        for (ApiToken t : tokens.findByTokenPrefixAndRevokedFalse(prefixOf(plaintext))) {
            if (constantTimeEquals(hash, t.getTokenHash())) {
                t.setLastUsedAt(OffsetDateTime.now());
                tokens.save(t);
                return Optional.of(t);
            }
        }
        return Optional.empty();
    }

    @Transactional
    public ApiToken revoke(String workspaceId, String id) {
        ApiToken t = tokens.findById(id).orElseThrow(() -> ApiException.notFound("API token", id));
        if (!workspaceId.equals(t.getWorkspaceId())) {
            throw ApiException.forbidden("Token belongs to a different workspace.");
        }
        t.setRevoked(true);
        return tokens.save(t);
    }

    // ── Pure helpers (unit-testable, RB-10 §7) ───────────────────────────────────

    static String prefixOf(String token) {
        if (token == null) {
            return "";
        }
        return token.length() <= 12 ? token : token.substring(0, 12);
    }

    static String sha256Hex(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] raw = md.digest((input == null ? "" : input).getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(raw.length * 2);
            for (byte b : raw) {
                sb.append(Character.forDigit((b >> 4) & 0xF, 16)).append(Character.forDigit(b & 0xF, 16));
            }
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null || a.length() != b.length()) {
            return false;
        }
        int diff = 0;
        for (int i = 0; i < a.length(); i++) {
            diff |= a.charAt(i) ^ b.charAt(i);
        }
        return diff == 0;
    }

    private String toJson(List<String> scopes) {
        try {
            return json.writeValueAsString(scopes == null ? List.of() : scopes);
        } catch (Exception e) {
            return "[]";
        }
    }

    private static String shortId() {
        return UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}
