package com.bcits.works;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Locale;

/**
 * Deterministic blind index for searchable-but-tokenized fields (RB-40 §3, EPIC-P1-pii-vault). Once
 * a field like {@code users.email} is moved into the vault, it can no longer be looked up by value;
 * the blind index restores an O(1) equality lookup without storing the raw value: it is
 * {@code HMAC-SHA256(normalize(value))} under a separate server-managed key, stored as hex.
 *
 * <p>Security properties: the HMAC is one-way and keyed, so without the server key the index cannot
 * be brute-forced into the original value (unlike a bare hash, which is rainbow-table-able for
 * low-entropy values like emails). The key lives only in configuration ({@code BLIND_INDEX_KEY}),
 * never in the database, so a DB (or backup) leak does not expose the addresses. Normalization
 * (trim + lowercase) makes the index case/whitespace-insensitive, matching how the app already
 * normalizes emails before lookup.
 */
@Service
public class BlindIndexService {

    private static final Logger log = LoggerFactory.getLogger(BlindIndexService.class);
    private static final String DEV_DEFAULT = "dev-only-change-me-bSmartBlindIndexKey2026";

    private final SecretKeySpec key;

    public BlindIndexService(@Value("${blind-index.key:}") String configured) {
        String material;
        if (configured == null || configured.isBlank()) {
            log.warn("[BLIND-INDEX] BLIND_INDEX_KEY is not set — using an insecure, well-known dev key. "
                + "Production MUST set BLIND_INDEX_KEY (a high-entropy secret) or email lookups are forgeable.");
            material = DEV_DEFAULT;
        } else {
            material = configured;
        }
        // Derive a fixed 32-byte HMAC key from the (arbitrary-length) configured material.
        this.key = new SecretKeySpec(sha256(material), "HmacSHA256");
    }

    /**
     * The blind index of {@code value}: hex {@code HMAC-SHA256(trim+lowercase(value))}. Stable across
     * restarts/instances that share the key (so login lookups always match). Returns {@code null} for
     * a {@code null} input.
     */
    public String hmac(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(key);
            byte[] digest = mac.doFinal(normalized.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException("Blind-index HMAC failed", e);
        }
    }

    private static byte[] sha256(String s) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
