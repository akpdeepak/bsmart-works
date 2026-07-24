package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Iteration 16 — pure-logic tests for the Admin Operations Center (Cap Y) licence-seat helpers.
 *
 * <p>Split out of {@code Iteration16LeadershipTest} (GH-537). That test covered Cap X and Cap Y
 * together and reached both through package-private statics, which worked only while every class
 * shared the flat root. Cap X's helpers moved to {@code reporting}; {@code AdminOpsService} could
 * not move (it closes a cycle), so the two halves now live beside the classes they exercise.
 */
@Tag("unit")
class AdminOpsServiceSeatsTest {

    @Test
    void renewalSoon_trueWithinThirtyDays() {
        assertThat(AdminOpsService.renewalSoon(LocalDate.now().plusDays(10))).isTrue();
        assertThat(AdminOpsService.renewalSoon(LocalDate.now().plusDays(60))).isFalse();
        assertThat(AdminOpsService.renewalSoon(null)).isFalse();
    }

    @Test
    void projectGrowth_growsActiveSeatsByHeadroom() {
        assertThat(AdminOpsService.projectGrowth(20)).isEqualTo(23); // 20 * 1.15
    }
}
