package com.bcits.works;
import com.bcits.works.shared.BlindIndexService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** Unit tests for the email blind index (RB-40 §3, EPIC-P1-pii-vault Slice 2). */
@Tag("unit")
class BlindIndexServiceTest {

    private final BlindIndexService svc = new BlindIndexService("test-blind-index-key");

    @Test
    void hmac_isDeterministicAndHex64() {
        String a = svc.hmac("alice@example.com");
        String b = svc.hmac("alice@example.com");
        assertThat(a).isEqualTo(b);
        assertThat(a).hasSize(64).matches("[0-9a-f]{64}");
    }

    @Test
    void hmac_normalizesCaseAndWhitespace() {
        assertThat(svc.hmac("  Alice@Example.com ")).isEqualTo(svc.hmac("alice@example.com"));
    }

    @Test
    void hmac_distinguishesDifferentValues() {
        assertThat(svc.hmac("alice@example.com")).isNotEqualTo(svc.hmac("bob@example.com"));
    }

    @Test
    void hmac_isKeyed_differentKeysProduceDifferentIndexes() {
        BlindIndexService other = new BlindIndexService("a-different-key");
        assertThat(svc.hmac("alice@example.com")).isNotEqualTo(other.hmac("alice@example.com"));
    }

    @Test
    void hmac_null_isNull() {
        assertThat(svc.hmac(null)).isNull();
    }
}
