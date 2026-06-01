package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("unit")
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void handleApiException_returnsCorrectStatusAndBody() {
        ApiException ex = ApiException.forbidden("Not allowed");
        ResponseEntity<ApiError> response = handler.handleApiException(ex);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo("FORBIDDEN");
        assertThat(response.getBody().message()).isEqualTo("Not allowed");
    }

    @Test
    void handleApiException_withField_propagatesField() {
        ApiException ex = ApiException.badRequest("INVALID", "Bad value", "title");
        ResponseEntity<ApiError> response = handler.handleApiException(ex);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().field()).isEqualTo("title");
    }

    @Test
    void handleRuntime_notFoundMessage_returns404() {
        RuntimeException ex = new RuntimeException("Not found: resource 42");
        ResponseEntity<ApiError> response = handler.handleRuntime(ex);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody().code()).isEqualTo("NOT_FOUND");
    }

    @Test
    void handleRuntime_otherMessage_returns500() {
        RuntimeException ex = new RuntimeException("Something blew up");
        ResponseEntity<ApiError> response = handler.handleRuntime(ex);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody().code()).isEqualTo("SERVER_ERROR");
    }

    @Test
    void handleRuntime_nullMessage_returns500() {
        RuntimeException ex = new RuntimeException((String) null);
        ResponseEntity<ApiError> response = handler.handleRuntime(ex);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @Test
    void handleGeneric_returns500WithServerErrorCode() {
        Exception ex = new Exception("generic error");
        ResponseEntity<ApiError> response = handler.handleGeneric(ex);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody().code()).isEqualTo("SERVER_ERROR");
    }
}
