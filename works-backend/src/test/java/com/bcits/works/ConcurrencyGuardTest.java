package com.bcits.works;

import com.bcits.works.shared.ApiException;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Tag("unit")
class ConcurrencyGuardTest {

    @Test
    void requireCurrentVersion_throwsConflictWhenVersionsDiffer() {
        assertThatThrownBy(() -> ConcurrencyGuard.requireCurrentVersion(3, 2))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus().value()).isEqualTo(409));
    }

    @Test
    void requireCurrentVersion_passesWhenVersionsMatch() {
        assertThatCode(() -> ConcurrencyGuard.requireCurrentVersion(5, 5)).doesNotThrowAnyException();
    }

    @Test
    void requireCurrentVersion_passesWhenEitherVersionIsNull() {
        assertThatCode(() -> ConcurrencyGuard.requireCurrentVersion(5, null)).doesNotThrowAnyException();
        assertThatCode(() -> ConcurrencyGuard.requireCurrentVersion(null, 5)).doesNotThrowAnyException();
        assertThatCode(() -> ConcurrencyGuard.requireCurrentVersion(null, null)).doesNotThrowAnyException();
    }

    @Test
    void nextVersion_incrementsNullSafe() {
        assertThat(ConcurrencyGuard.nextVersion(null)).isEqualTo(1);
        assertThat(ConcurrencyGuard.nextVersion(0)).isEqualTo(1);
        assertThat(ConcurrencyGuard.nextVersion(7)).isEqualTo(8);
    }
}
