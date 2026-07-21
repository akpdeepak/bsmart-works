package com.bcits.works.reporting;

import java.lang.reflect.Method;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

/** Keeps the Today aggregate inside the explicit two-second transaction budget. */
@Tag("unit")
class DashboardServiceNfrGuardTest {

    @Test
    void roleDashboardReadsCarryTheTwoSecondBudget() throws Exception {
        Transactional transaction = DashboardService.class.getAnnotation(Transactional.class);

        assertThat(transaction).isNotNull();
        assertThat(transaction.readOnly()).isTrue();
        assertThat(transaction.timeout()).isEqualTo(2);

        for (Method method : DashboardService.class.getDeclaredMethods()) {
            if (method.isSynthetic()) {
                continue;
            }
            assertThat(method.getReturnType())
                .as("dashboard facade methods return one aggregate")
                .isEqualTo(java.util.Map.class);
        }
    }
}
