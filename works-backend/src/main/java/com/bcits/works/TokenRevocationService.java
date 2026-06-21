package com.bcits.works;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;

/**
 * Token-version JWT revocation (RB-40 §4; W1 rate-limit/JWT PR1). bSmart issues stateless 7-day HS256
 * JWTs (see {@link JwtUtil}), so before this there was NO way to invalidate a token early — a GDPR
 * erasure, password change, or password reset left every previously-minted JWT valid for up to 7 days.
 *
 * <p>This service adds a per-subject "valid after" cutoff: a token is revoked when its issued-at
 * (iat) predates the subject's {@code tokens_valid_after} (V115). Bumping that column on a revocation
 * event instantly invalidates every token minted before the bump, <b>across all app instances</b> —
 * the cutoff lives in the shared DB, not in per-instance memory, which is exactly the distributed
 * guarantee the in-process {@link RateLimiter} cannot give. A {@code NULL} cutoff means "never
 * revoked", so the column's introduction changes no existing session (non-disruptive rollout).
 *
 * <p><b>Two subject identities, one mechanism.</b> Internal users key on the global {@code users}
 * table; customer-portal users on {@code customer_users} (parity — otherwise portal tokens stay
 * unrevocable). The enforcement points are {@link SecurityConfig}'s JWT auth filter (internal) and
 * {@link CustomerContext} (portal); the bump points are erasure / password change / password reset.
 *
 * <p><b>Second granularity.</b> A JWT {@code iat} is a NumericDate (whole seconds), so the cutoff is
 * written truncated to the second and compared at second resolution: revoked iff
 * {@code iatSecond < cutoffSecond}. Truncating the cutoff down means a token minted later in the same
 * second as a bump is never falsely revoked; the only residual is that a token issued in that same
 * second just <i>before</i> the bump survives — a &le;1s window, the standard, well-understood
 * trade-off for second-granular {@code iat}.
 */
@Service
public class TokenRevocationService {

    private static final Logger log = LoggerFactory.getLogger(TokenRevocationService.class);

    private final JdbcTemplate jdbc;

    public TokenRevocationService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Invalidate every internal JWT issued for {@code userId} up to now (erase / pw change / reset). */
    public void revokeUserTokens(String userId) {
        bump("users", userId);
    }

    /** Invalidate every customer-portal JWT issued for {@code customerUserId} up to now. */
    public void revokeCustomerTokens(String customerUserId) {
        bump("customer_users", customerUserId);
    }

    /** Whether an internal token issued at {@code issuedAt} is revoked for {@code userId}. */
    public boolean isUserTokenRevoked(String userId, Instant issuedAt) {
        return isRevoked("users", userId, issuedAt);
    }

    /** Whether a customer-portal token issued at {@code issuedAt} is revoked for {@code customerUserId}. */
    public boolean isCustomerTokenRevoked(String customerUserId, Instant issuedAt) {
        return isRevoked("customer_users", customerUserId, issuedAt);
    }

    // ── Individual-token (jti) blocklist — logout (PR2) ──────────────────────────────────────────

    /**
     * Add a single token to the blocklist (logout). Idempotent ({@code ON CONFLICT DO NOTHING}, so a
     * double logout is harmless). Opportunistically prunes entries whose token has already expired, so
     * the table stays bounded by the 7-day token lifetime without a separate scheduler. No-op for a
     * pre-PR2 token that carries no {@code jti}.
     */
    public void blocklist(String jti, String subject, String scope, Instant expiresAt) {
        if (jti == null) {
            return;
        }
        Instant exp = expiresAt != null ? expiresAt : Instant.now().plus(7, ChronoUnit.DAYS);
        try {
            jdbc.update("DELETE FROM revoked_tokens WHERE expires_at < ?", Timestamp.from(Instant.now()));
            jdbc.update("INSERT INTO revoked_tokens (jti, subject, scope, expires_at) VALUES (?, ?, ?, ?) "
                    + "ON CONFLICT (jti) DO NOTHING", jti, subject, scope, Timestamp.from(exp));
        } catch (Exception e) {
            // The caller's logout endpoint returns OK regardless (the client discards the token), but a
            // failed blocklist must never be silent — it would leave a "logged out" token live.
            log.warn("Failed to blocklist token jti={} subject={} scope={}", jti, subject, scope, e);
        }
    }

    /**
     * Whether a token's {@code jti} has been logged out. Fail-OPEN on a lookup error (consistent with
     * the token-version check): a DB blip must not lock everyone out, and the token's 7-day exp still
     * bounds exposure. A {@code null} jti (pre-PR2 token) is not blocklistable, so the per-subject
     * cutoff remains its only revocation path.
     */
    public boolean isBlocklisted(String jti) {
        if (jti == null) {
            return false;
        }
        try {
            Boolean present = jdbc.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM revoked_tokens WHERE jti = ?)", Boolean.class, jti);
            return Boolean.TRUE.equals(present);
        } catch (Exception e) {
            log.warn("Token blocklist lookup failed for jti={}; treating as not-blocklisted", jti, e);
            return false;
        }
    }

    private void bump(String table, String id) {
        if (id == null) {
            return;
        }
        // Truncate to the second so a token minted later in the same second is not falsely revoked.
        OffsetDateTime cutoff = OffsetDateTime.now(ZoneOffset.UTC).truncatedTo(ChronoUnit.SECONDS);
        // table is a fixed internal literal ("users" / "customer_users"), never user input.
        jdbc.update("UPDATE " + table + " SET tokens_valid_after = ? WHERE id = ?", cutoff, id);
    }

    private boolean isRevoked(String table, String id, Instant issuedAt) {
        if (id == null || issuedAt == null) {
            // A token we cannot evaluate (missing subject or iat) is treated as revoked — fail closed
            // on an unusable token. Every token bSmart mints carries both, so this never fires normally.
            return true;
        }
        try {
            Timestamp cutoff = jdbc.queryForObject(
                "SELECT tokens_valid_after FROM " + table + " WHERE id = ?", Timestamp.class, id);
            if (cutoff == null) {
                return false; // NULL cutoff → never revoked
            }
            // Second-resolution comparison (JWT iat is whole seconds).
            return issuedAt.getEpochSecond() < cutoff.toInstant().getEpochSecond();
        } catch (EmptyResultDataAccessException noRow) {
            // No such subject (e.g. hard-deleted) → nothing to honour; downstream auth/RBAC decides.
            return false;
        } catch (Exception e) {
            // Fail OPEN on a transient lookup error: the auth path must not lock every user out on a
            // DB blip (the request would fail at the data layer anyway). The token's 7-day exp still
            // bounds exposure. Surfaced at WARN so it is never silent.
            log.warn("Token revocation lookup failed for {} id={}; treating as not-revoked", table, id, e);
            return false;
        }
    }
}
