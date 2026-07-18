package com.bcits.works;
import com.bcits.works.automation.InstalledExtension;
import com.bcits.works.automation.InstalledExtensionRepository;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;
import com.bcits.works.automation.MarketplaceListing;
import com.bcits.works.automation.MarketplaceListingRepository;
import com.bcits.works.automation.MarketplaceService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the marketplace service (RB-10 §7, @Tag("unit") — Mockito, no Spring, no DB). Covers
 * the install happy path, permission scoping (granted ⊆ requested), duplicate-install conflict, the
 * cross-tenant uninstall guard (RB-40 §1), and that the catalog browse only returns PUBLISHED.
 */
@Tag("unit")
class MarketplaceServiceTest {

    private static final String WS = "ws-A";
    private static final String FOREIGN_WS = "ws-B";
    private static final String USER = "user-1";

    private final MarketplaceListingRepository listings = mock(MarketplaceListingRepository.class);
    private final InstalledExtensionRepository installs = mock(InstalledExtensionRepository.class);
    private final EventService events = mock(EventService.class);

    private final MarketplaceService service = new MarketplaceService(listings, installs, events);

    private MarketplaceListing publishedListing() {
        MarketplaceListing l = new MarketplaceListing();
        l.setId("MKT-1");
        l.setSlug("slack-notifier");
        l.setName("Slack Notifier");
        l.setStatus("PUBLISHED");
        l.setRequestedScopes("read_items,write_comments");
        return l;
    }

    @Test
    void install_happyPath_savesScopedSubsetAndRecordsEvent() {
        when(listings.findById("MKT-1")).thenReturn(Optional.of(publishedListing()));
        when(installs.findByWorkspaceIdAndListingId(WS, "MKT-1")).thenReturn(Optional.empty());
        when(installs.save(any(InstalledExtension.class))).thenAnswer(inv -> inv.getArgument(0));

        InstalledExtension ext = service.install(WS, USER, "MKT-1", List.of("read_items"));

        assertThat(ext.getWorkspaceId()).isEqualTo(WS);
        assertThat(ext.getListingId()).isEqualTo("MKT-1");
        assertThat(ext.getGrantedScopes()).isEqualTo("read_items");
        assertThat(ext.getEnabled()).isTrue();
        verify(events).recordInWorkspace(eq(WS), anyString(), eq("EXTENSION_INSTALLED"), eq(USER), any());
    }

    @Test
    void install_scopeNotRequested_rejected() {
        when(listings.findById("MKT-1")).thenReturn(Optional.of(publishedListing()));
        when(installs.findByWorkspaceIdAndListingId(WS, "MKT-1")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.install(WS, USER, "MKT-1", List.of("delete_items")))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> {
                assertThat(((ApiException) e).getCode()).isEqualTo("SCOPE_NOT_REQUESTED");
                assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
            });
        verify(installs, never()).save(any());
    }

    @Test
    void install_duplicate_conflict() {
        when(listings.findById("MKT-1")).thenReturn(Optional.of(publishedListing()));
        when(installs.findByWorkspaceIdAndListingId(WS, "MKT-1"))
            .thenReturn(Optional.of(new InstalledExtension()));

        assertThatThrownBy(() -> service.install(WS, USER, "MKT-1", List.of("read_items")))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.CONFLICT));
        verify(installs, never()).save(any());
    }

    @Test
    void uninstall_otherWorkspacesInstall_notFound_crossTenantGuard() {
        // The foreign install is invisible when scoped to this workspace.
        when(installs.findByWorkspaceIdAndId(WS, "EXT-foreign")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.uninstall(WS, USER, "EXT-foreign"))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        verify(installs, never()).delete(any());
    }

    @Test
    void listPublished_filtersToPublishedOnly() {
        MarketplaceListing l = publishedListing();
        when(listings.findByStatusOrderByNameAsc("PUBLISHED")).thenReturn(List.of(l));

        List<MarketplaceListing> result = service.listPublished();

        assertThat(result).containsExactly(l);
        verify(listings).findByStatusOrderByNameAsc("PUBLISHED");
    }

    @Test
    void uninstall_happyPath_deletesExtensionAndRecordsEvent() {
        InstalledExtension ext = new InstalledExtension();
        ext.setId("EXT-001");
        ext.setWorkspaceId(WS);
        ext.setListingId("MKT-1");
        when(installs.findByWorkspaceIdAndId(WS, "EXT-001")).thenReturn(Optional.of(ext));

        service.uninstall(WS, USER, "EXT-001");

        verify(installs).delete(ext);
        verify(events).recordInWorkspace(eq(WS), eq("EXT-001"), eq("EXTENSION_UNINSTALLED"), eq(USER), any());
    }

    @Test
    void updateListing_rejectsForeignWorkspaceOwner() {
        // A workspace that does not own the listing must not be able to edit it.
        MarketplaceListing l = publishedListing();
        l.setPublisherWorkspaceId(FOREIGN_WS);
        when(listings.findById("MKT-1")).thenReturn(Optional.of(l));

        MarketplaceService.ListingInput input = new MarketplaceService.ListingInput(
            "slack-notifier", "Slack Notifier", null, null, null, null, null, null, "PUBLISHED");

        assertThatThrownBy(() -> service.updateListing(WS, USER, "MKT-1", input))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verify(listings, never()).save(any());
    }
}
