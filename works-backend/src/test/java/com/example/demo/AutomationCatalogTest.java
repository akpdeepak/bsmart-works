package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The automation building-block registry (iteration 13, Cap C).
 */
@Tag("unit")
class AutomationCatalogTest {

    @Test
    void triggersAndActions_areRegistered() {
        assertThat(AutomationCatalog.isTrigger(AutomationCatalog.TR_ITEM_CREATED)).isTrue();
        assertThat(AutomationCatalog.isTrigger("item_created")).isTrue();   // case-insensitive
        assertThat(AutomationCatalog.isTrigger("NOPE")).isFalse();
        assertThat(AutomationCatalog.isAction(AutomationCatalog.AC_SET_STATUS)).isTrue();
        assertThat(AutomationCatalog.isAction("nope")).isFalse();
    }

    @Test
    void scheduled_isOnlyTrueForScheduledTrigger() {
        assertThat(AutomationCatalog.isScheduled(AutomationCatalog.TR_SCHEDULED)).isTrue();
        assertThat(AutomationCatalog.isScheduled(AutomationCatalog.TR_ITEM_CREATED)).isFalse();
    }

    @Test
    void templates_areAvailableAsFallback() {
        assertThat(AutomationCatalog.templates()).isNotEmpty();
        assertThat(AutomationCatalog.templates())
            .allSatisfy(t -> assertThat(AutomationCatalog.isTrigger(t.triggerType())).isTrue());
    }
}
