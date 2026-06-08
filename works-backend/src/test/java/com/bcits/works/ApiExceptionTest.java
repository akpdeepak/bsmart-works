package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("unit")
class ApiExceptionTest {

    @Test
    void constructor_withoutField_setsFieldToNull() {
        ApiException ex = new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Item missing");
        assertThat(ex.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(ex.getCode()).isEqualTo("NOT_FOUND");
        assertThat(ex.getMessage()).isEqualTo("Item missing");
        assertThat(ex.getField()).isNull();
    }

    @Test
    void constructor_withField_setsAllValues() {
        ApiException ex = new ApiException(HttpStatus.BAD_REQUEST, "INVALID", "Bad input", "email");
        assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(ex.getCode()).isEqualTo("INVALID");
        assertThat(ex.getMessage()).isEqualTo("Bad input");
        assertThat(ex.getField()).isEqualTo("email");
    }

    @Test
    void notFound_setsCorrectStatusAndCode() {
        ApiException ex = ApiException.notFound("User", "42");
        assertThat(ex.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(ex.getCode()).isEqualTo("NOT_FOUND");
        assertThat(ex.getMessage()).contains("User").contains("42");
        assertThat(ex.getField()).isNull();
    }

    @Test
    void forbidden_setsCorrectStatusAndCode() {
        ApiException ex = ApiException.forbidden("No access");
        assertThat(ex.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(ex.getCode()).isEqualTo("FORBIDDEN");
        assertThat(ex.getMessage()).isEqualTo("No access");
    }

    @Test
    void badRequest_withoutField_setsCorrectStatus() {
        ApiException ex = ApiException.badRequest("MISSING_TITLE", "Title required");
        assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(ex.getCode()).isEqualTo("MISSING_TITLE");
        assertThat(ex.getField()).isNull();
    }

    @Test
    void badRequest_withField_setsField() {
        ApiException ex = ApiException.badRequest("INVALID_EMAIL", "Bad email", "email");
        assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(ex.getField()).isEqualTo("email");
    }

    @Test
    void conflict_setsCorrectStatusAndCode() {
        ApiException ex = ApiException.conflict("Already exists");
        assertThat(ex.getStatus()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(ex.getCode()).isEqualTo("CONFLICT");
    }

    @Test
    void unauthorized_setsCorrectStatusAndCode() {
        ApiException ex = ApiException.unauthorized("Login required");
        assertThat(ex.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(ex.getCode()).isEqualTo("UNAUTHORIZED");
        assertThat(ex.getMessage()).isEqualTo("Login required");
    }

    @Test
    void isRuntimeException() {
        assertThat(new ApiException(HttpStatus.BAD_REQUEST, "X", "msg"))
                .isInstanceOf(RuntimeException.class);
    }
}
