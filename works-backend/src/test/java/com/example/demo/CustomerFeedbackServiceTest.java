package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("unit")
class CustomerFeedbackServiceTest {

    private final CustomerFeedbackService service = new CustomerFeedbackService(null, null, null);

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
