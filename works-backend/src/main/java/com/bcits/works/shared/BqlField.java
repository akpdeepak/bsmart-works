package com.bcits.works.shared;

/**
 * A queryable BQL field: the alias users type, the real {@code work_items} column it maps to,
 * its value type (drives coercion + validation), and whether it is sensitive (gated by role).
 *
 * <p>The registry of these ({@link BqlFieldRegistry}) is a <b>closed allow-list</b> — only fields
 * declared here can appear in a BQL query, which is what gives field-level security a server-side
 * choke point (RB-40 §1) rather than the former open-by-default column pass-through.
 */
public record BqlField(String alias, String column, BqlType type, boolean sensitive) {

    /** Value type of a field — controls how a bound value is coerced and which operators are legal. */
    public enum BqlType { TEXT, NUMBER, DATE, ENUM, ID }

    public static BqlField of(String alias, String column, BqlType type) {
        return new BqlField(alias, column, type, false);
    }

    public static BqlField sensitive(String alias, String column, BqlType type) {
        return new BqlField(alias, column, type, true);
    }
}
