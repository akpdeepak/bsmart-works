package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

@Tag("unit")
class CustomerFeedbackServiceTest {

    // attributionPii is mocked (its default returns null, leaving the per-record token unset) so the
    // pure prepareNew/sentiment logic can be unit-tested without a vault.
    private final CustomerFeedbackService service =
            new CustomerFeedbackService(null, null, null, mock(CustomerAttributionPiiService.class));

    @Test
    void lexiconSentiment_classifiesByKeywords() {
        assertThat(CustomerFeedbackService.lexiconSentiment("I love this, great and fast")).isEqualTo("POSITIVE");
        assertThat(CustomerFeedbackService.lexiconSentiment("slow and broken, terrible bug")).isEqualTo("NEGATIVE");
        assertThat(CustomerFeedbackService.lexiconSentiment("it exists")).isEqualTo("NEUTRAL");
    }

    @Test
    void prepareNew_defaultsSentimentFromContent() {
        CustomerFeedback f = new CustomerFeedback();
        f.setContent("the report is confusing and slow");
        service.prepareNew(f, "USR-2");
        assertThat(f.getId()).startsWith("FBK-");
        assertThat(f.getSource()).isEqualTo("PORTAL");
        assertThat(f.getStatus()).isEqualTo("NEW");
        assertThat(f.getSentiment()).isEqualTo("NEGATIVE");
    }

    @Test
    void prepareNew_keepsExplicitSentiment() {
        CustomerFeedback f = new CustomerFeedback();
        f.setContent("anything");
        f.setSentiment("POSITIVE");
        service.prepareNew(f, "USR-2");
        assertThat(f.getSentiment()).isEqualTo("POSITIVE");
    }
}
