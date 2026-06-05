package com.example.demo;

import org.springframework.stereotype.Service;
import java.util.regex.Pattern;

/**
 * Server-side data-boundary redaction (iteration 10, Cap Z / I10-S11; RB-40 §2). Before any prompt
 * leaves the server boundary to a model, the configured data types are <b>redacted here</b> — never
 * relied on to be hidden in the UI. Admins choose what may go to a model; this enforces it.
 *
 * <ul>
 *   <li>{@code blockPii} → redact emails and phone numbers (the structured PII this surface can see);</li>
 *   <li>{@code blockFinancial} → redact currency amounts and long account-number-like digit runs.</li>
 * </ul>
 *
 * <p>Pure (no I/O), so the redaction rules are unit-testable in isolation (mirrors
 * {@link SlaCalculationService}). The deterministic provider never sends data off-box, but the
 * boundary is applied unconditionally so the seam is correct the day a live provider plugs in.
 */
@Service
public class DataBoundaryService {

    private static final String EMAIL_TOKEN = "[redacted-email]";
    private static final String PHONE_TOKEN = "[redacted-phone]";
    private static final String MONEY_TOKEN = "[redacted-amount]";
    private static final String ACCOUNT_TOKEN = "[redacted-account]";

    private static final Pattern EMAIL =
        Pattern.compile("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}");
    // +country, separators, 10+ digit runs — a deliberately conservative phone matcher.
    private static final Pattern PHONE =
        Pattern.compile("\\+?\\d[\\d ()\\-]{8,}\\d");
    // Currency amounts: a symbol (₹ $ € £) or an INR/USD/EUR code, then a number.
    private static final Pattern MONEY =
        Pattern.compile("(?:[₹$€£]|\\b(?:INR|USD|EUR|GBP|Rs\\.?)\\b)\\s?\\d[\\d,]*(?:\\.\\d+)?",
            Pattern.CASE_INSENSITIVE);
    // Long bare digit runs (account / card-like), 12+ digits.
    private static final Pattern ACCOUNT = Pattern.compile("\\b\\d{12,}\\b");

    /**
     * Redact a prompt for the given boundary flags. Order matters: financial patterns run before the
     * phone matcher so a currency amount is not mistaken for a phone number.
     */
    public String redact(String text, boolean blockPii, boolean blockFinancial) {
        if (text == null || text.isEmpty()) {
            return text == null ? "" : text;
        }
        String out = text;
        if (blockFinancial) {
            out = MONEY.matcher(out).replaceAll(MONEY_TOKEN);
            out = ACCOUNT.matcher(out).replaceAll(ACCOUNT_TOKEN);
        }
        if (blockPii) {
            out = EMAIL.matcher(out).replaceAll(EMAIL_TOKEN);
            out = PHONE.matcher(out).replaceAll(PHONE_TOKEN);
        }
        return out;
    }

    /** True if redaction would change the text — used to flag that the boundary was applied. */
    public boolean wouldRedact(String text, boolean blockPii, boolean blockFinancial) {
        return !redact(text, blockPii, blockFinancial).equals(text == null ? "" : text);
    }
}
