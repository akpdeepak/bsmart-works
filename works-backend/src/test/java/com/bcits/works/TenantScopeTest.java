package com.bcits.works;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Semantics of the central tenant context + escape hatch (RB-40 §1): the filter is dormant by
 * default, active only when scoped, off inside the system hatch, and the previous state is always
 * restored — so a pooled thread can never leak a workspace binding into the next request.
 */
@Tag("unit")
class TenantScopeTest {

    @AfterEach
    void cleanup() {
        TenantContext.clear();
    }

    @Test
    void default_isDormant_noWorkspace_noSystem_filterInactive() {
        assertThat(TenantContext.hasWorkspace()).isFalse();
        assertThat(TenantContext.isSystem()).isFalse();
        assertThat(TenantContext.isFilterActive()).isFalse();
    }

    @Test
    void scoped_makesFilterActiveForThatWorkspace() {
        TenantScope.runScoped("WS-1", () -> {
            assertThat(TenantContext.getWorkspace()).isEqualTo("WS-1");
            assertThat(TenantContext.isFilterActive()).isTrue();
        });
        // Restored to dormant afterwards.
        assertThat(TenantContext.isFilterActive()).isFalse();
        assertThat(TenantContext.getWorkspace()).isNull();
    }

    @Test
    void systemHatch_forcesFilterOffEvenWhenWorkspaceBound() {
        TenantContext.setWorkspace("WS-1");
        TenantScope.runAsSystem(() -> {
            assertThat(TenantContext.isSystem()).isTrue();
            assertThat(TenantContext.isFilterActive()).isFalse();
        });
        // The previous workspace binding is restored after the hatch closes.
        assertThat(TenantContext.isSystem()).isFalse();
        assertThat(TenantContext.getWorkspace()).isEqualTo("WS-1");
        assertThat(TenantContext.isFilterActive()).isTrue();
    }

    @Test
    void callAsSystem_returnsValue_andRestoresContextOnException() {
        TenantContext.setWorkspace("WS-7");

        String result = TenantScope.callAsSystem(() -> "ok");
        assertThat(result).isEqualTo("ok");

        assertThatThrownBy(() -> TenantScope.callAsSystem(() -> {
            throw new IllegalStateException("boom");
        })).isInstanceOf(IllegalStateException.class);

        // Even after an exception inside the hatch, the binding is intact and not stuck in system mode.
        assertThat(TenantContext.isSystem()).isFalse();
        assertThat(TenantContext.getWorkspace()).isEqualTo("WS-7");
    }

    @Test
    void clear_removesWorkspaceAndSystemState() {
        TenantContext.setWorkspace("WS-1");
        TenantContext.enterSystem();
        TenantContext.clear();
        assertThat(TenantContext.getWorkspace()).isNull();
        assertThat(TenantContext.isSystem()).isFalse();
    }
}
