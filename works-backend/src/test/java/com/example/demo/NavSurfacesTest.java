package com.example.demo;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

/** Unit tests for the authoritative nav-surface visibility catalog. */
@Tag("unit")
class NavSurfacesTest {

    @Test
    void ownerSeesEveryCatalogSurface() {
        List<String> owner = NavSurfaces.visibleFor(5);
        // Owner sees all; a representative governance + delivery + admin-only surface are present.
        assertThat(owner).contains("security", "adminops", "board", "dashboard", "compliance");
    }

    @Test
    void securityIsOwnerOnly() {
        assertThat(NavSurfaces.minTier("security")).isEqualTo(5);
        assertThat(NavSurfaces.visibleFor(4)).doesNotContain("security");
        assertThat(NavSurfaces.visibleFor(5)).contains("security");
    }

    @Test
    void memberDoesNotSeeAdminSurfaces() {
        List<String> member = NavSurfaces.visibleFor(2);
        assertThat(member).contains("dashboard", "myworks", "board", "backlog");
        assertThat(member).doesNotContain("workspace", "adminops", "compliance", "security");
    }

    @Test
    void higherTiersAreSupersetsOfLower() {
        for (int t = 1; t < 5; t++) {
            assertThat(NavSurfaces.visibleFor(t + 1)).containsAll(NavSurfaces.visibleFor(t));
        }
    }

    @Test
    void unknownSurfaceDefaultsToEveryone() {
        assertThat(NavSurfaces.minTier("nonexistent-surface")).isEqualTo(1);
    }
}
