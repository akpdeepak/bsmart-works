package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link DataBoundaryService} — server-side PII/financial redaction before any prompt
 * could leave the box (iteration 10, Cap Z / I10-S11; RB-40 §2). Pure; no DB.
 */
@Tag("unit")
class DataBoundaryServiceTest {

    private final DataBoundaryService boundary = new DataBoundaryService();

    @Test
    void redactsEmailAndPhone_whenPiiBlocked() {
        String out = boundary.redact("Contact me@x.com or +91 98765 43210 please", true, false);
        assertThat(out).doesNotContain("me@x.com");
        assertThat(out).contains("[redacted-email]");
        assertThat(out).contains("[redacted-phone]");
    }

    @Test
    void redactsMoneyAndAccount_whenFinancialBlocked() {
        String out = boundary.redact("Pay ₹50,000 to 123456789012 now", false, true);
        assertThat(out).contains("[redacted-amount]");
        assertThat(out).contains("[redacted-account]");
        assertThat(out).doesNotContain("50,000");
    }

    @Test
    void leavesTextUntouched_whenNothingBlocked() {
        String text = "Contact me@x.com about ₹500";
        assertThat(boundary.redact(text, false, false)).isEqualTo(text);
    }

    @Test
    void wouldRedact_reflectsWhetherAnyChangeApplies() {
        assertThat(boundary.wouldRedact("plain text", true, true)).isFalse();
        assertThat(boundary.wouldRedact("email me@x.com", true, false)).isTrue();
    }

    @Test
    void handlesNullInput() {
        assertThat(boundary.redact(null, true, true)).isEmpty();
    }
}
