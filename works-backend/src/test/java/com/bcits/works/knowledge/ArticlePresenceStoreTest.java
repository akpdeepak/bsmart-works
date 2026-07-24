package com.bcits.works.knowledge;

import com.bcits.works.shared.api.RealtimeService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

/**
 * Unit tests for {@link ArticlePresenceStore} — KR-065.
 * Uses a controllable clock subclass (same pattern as PresenceServiceTest) to avoid real-time
 * waits. RealtimeService is mocked to isolate the store from the SSE broadcast.
 */
@Tag("unit")
class ArticlePresenceStoreTest {

    private final RealtimeService realtime = mock(RealtimeService.class);

    private ArticlePresenceStore.PresenceRecord rec(String userId, Instant t) {
        return new ArticlePresenceStore.PresenceRecord(userId, "User " + userId, "U", 25.0, 40.0, t);
    }

    @Test
    void upsertAndGetPresencesReturnRecord() {
        ArticlePresenceStore store = new ArticlePresenceStore(realtime);
        Instant now = Instant.now();
        store.upsert("ART-1", "WS-1", rec("U-1", now));

        List<ArticlePresenceStore.PresenceRecord> result = store.getPresences("ART-1");
        assertEquals(1, result.size());
        assertEquals("U-1", result.get(0).userId());
        assertEquals(25.0, result.get(0).cursorX());
        assertEquals(40.0, result.get(0).cursorY());
    }

    @Test
    void upsertUpdatesExistingRecord() {
        ArticlePresenceStore store = new ArticlePresenceStore(realtime);
        Instant t1 = Instant.now().minusSeconds(5);
        Instant t2 = Instant.now();
        store.upsert("ART-1", "WS-1", rec("U-1", t1));
        store.upsert("ART-1", "WS-1", rec("U-1", t2));

        List<ArticlePresenceStore.PresenceRecord> result = store.getPresences("ART-1");
        assertEquals(1, result.size());
        assertEquals(t2, result.get(0).lastSeen());
    }

    @Test
    void removeEvictsRecord() {
        ArticlePresenceStore store = new ArticlePresenceStore(realtime);
        store.upsert("ART-1", "WS-1", rec("U-1", Instant.now()));
        store.remove("ART-1", "WS-1", "U-1");
        assertTrue(store.getPresences("ART-1").isEmpty());
    }

    @Test
    void getPresencesPrunesStaleRecords() {
        // Stale record: lastSeen was (TTL + 1) seconds ago — should be evicted on next read.
        ArticlePresenceStore store = new ArticlePresenceStore(realtime);
        Instant stale = Instant.now().minusSeconds(ArticlePresenceStore.TTL_SECONDS + 1);
        // Directly upsert with a stale timestamp (the store accepts arbitrary Instants).
        store.upsert("ART-1", "WS-1", rec("U-stale", stale));

        // getPresences prunes inline.
        assertTrue(store.getPresences("ART-1").isEmpty());
    }

    @Test
    void presenceIsArticleScoped() {
        ArticlePresenceStore store = new ArticlePresenceStore(realtime);
        store.upsert("ART-1", "WS-1", rec("U-1", Instant.now()));
        store.upsert("ART-2", "WS-1", rec("U-2", Instant.now()));

        assertEquals(1, store.getPresences("ART-1").size());
        assertEquals("U-1", store.getPresences("ART-1").get(0).userId());
        assertEquals(1, store.getPresences("ART-2").size());
        assertEquals("U-2", store.getPresences("ART-2").get(0).userId());
    }

    @Test
    void evictStaleRemovesOldRecords() {
        ArticlePresenceStore store = new ArticlePresenceStore(realtime);
        Instant stale = Instant.now().minusSeconds(ArticlePresenceStore.TTL_SECONDS + 1);
        store.upsert("ART-1", "WS-1", rec("U-stale", stale));
        store.upsert("ART-1", "WS-1", rec("U-fresh", Instant.now()));

        store.evictStale();

        List<ArticlePresenceStore.PresenceRecord> result = store.getPresences("ART-1");
        assertEquals(1, result.size());
        assertEquals("U-fresh", result.get(0).userId());
    }
}
