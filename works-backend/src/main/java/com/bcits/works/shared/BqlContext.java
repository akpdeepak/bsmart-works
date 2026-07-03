package com.bcits.works.shared;

import java.util.Map;

/**
 * Compile-time context for a BQL query: who is asking, what they're allowed to query, and the
 * workspace's custom-field definitions in scope.
 *
 * <p>Carries the {@code currentUser()} binding, the field-level-security gate
 * ({@link #canSeeSensitive()}), and {@link #customFields()} — a map of custom-field key →
 * definition, so a query can reference workspace-defined fields (RB-10 §6: BQL is the one query
 * language, including over custom fields). The legacy {@code compile(query, userId)} path builds a
 * <b>trusted</b> context (full field visibility, no custom fields) for internal/server-side
 * consumers (KPIs, SLA, compliance); the user-facing controller builds a context gated by
 * {@link RbacService} and seeded with the workspace's custom fields.
 */
public record BqlContext(String currentUserId, boolean canSeeSensitive,
                         Map<String, CustomField> customFields) {

    /** A workspace custom field referenced from BQL: its value-store id and value type. */
    public record CustomField(String fieldDefId, BqlField.BqlType type) { }

    /** Internal/server-side callers compiling trusted BQL — full field visibility, no custom fields. */
    public static BqlContext trusted(String currentUserId) {
        return new BqlContext(currentUserId, true, Map.of());
    }

    /** A user-facing caller; {@code sensitive} comes from the role gate, no custom fields. */
    public static BqlContext forUser(String currentUserId, boolean canSeeSensitive) {
        return new BqlContext(currentUserId, canSeeSensitive, Map.of());
    }

    /** A user-facing caller with the workspace's custom fields available to the query. */
    public static BqlContext forUser(String currentUserId, boolean canSeeSensitive,
                                     Map<String, CustomField> customFields) {
        return new BqlContext(currentUserId, canSeeSensitive,
            customFields == null ? Map.of() : customFields);
    }

    /** Look up a custom field by key (case-insensitive); null if not a custom field. */
    public CustomField customField(String key) {
        return key == null ? null : customFields.get(key.toLowerCase(java.util.Locale.ROOT));
    }
}
