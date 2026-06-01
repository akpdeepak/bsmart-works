package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for ApiError — the standard error shape returned by every endpoint.
 * Tagged @Tag("unit") so CI can run these without a live database:
 *   ./mvnw -B -Dgroups=unit test
 */
@Tag("unit")
class ApiErrorTest {

    @Test
    void ofWithCodeAndMessage_setsFieldToNull() {
        ApiError err = ApiError.of("NOT_FOUND", "Resource not found");
        assertThat(err.code()).isEqualTo("NOT_FOUND");
        assertThat(err.message()).isEqualTo("Resource not found");
        assertThat(err.field()).isNull();
    }

    @Test
    void ofWithField_setsAllThreeValues() {
        ApiError err = ApiError.of("VALIDATION_ERROR", "Title is required", "title");
        assertThat(err.code()).isEqualTo("VALIDATION_ERROR");
        assertThat(err.message()).isEqualTo("Title is required");
        assertThat(err.field()).isEqualTo("title");
    }

    @Test
    void twoErrorsWithSameValues_areEqual() {
        ApiError a = ApiError.of("FORBIDDEN", "Access denied");
        ApiError b = ApiError.of("FORBIDDEN", "Access denied");
        assertThat(a).isEqualTo(b);
    }

    @Test
    void twoErrorsWithDifferentCodes_areNotEqual() {
        ApiError a = ApiError.of("NOT_FOUND", "Not found");
        ApiError b = ApiError.of("FORBIDDEN", "Not found");
        assertThat(a).isNotEqualTo(b);
    }
}
