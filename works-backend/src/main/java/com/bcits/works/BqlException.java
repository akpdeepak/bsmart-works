package com.bcits.works;

/**
 * Thrown when a BQL query cannot be parsed or references an invalid field.
 *
 * <p>Carries an optional character {@code position} into the source query so the editor can point
 * at the exact spot — addressing the long-standing JQL pain point of opaque, locationless errors.
 * {@code -1} means "no specific position".
 */
public class BqlException extends RuntimeException {

    private final int position;

    public BqlException(String message) {
        this(message, -1);
    }

    public BqlException(String message, int position) {
        super(message);
        this.position = position;
    }

    /** Character offset into the query where the error was detected, or {@code -1} if unknown. */
    public int getPosition() {
        return position;
    }
}
