package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

@Tag("unit")
class PresenceServiceTest {

    private final RealtimeService realtime = mock(RealtimeService.class);

    @Test
    void heartbeatAddsToRosterAndBroadcasts() {
        PresenceService p = new PresenceService(realtime);
        List<PresenceService.Presence> roster = p.heartbeat("WS-1", "USR-1", "Asha", "board", 1.0, 2.0);
        assertEquals(1, roster.size());
        assertEquals("USR-1", roster.get(0).userId());
        verify(realtime).publish(org.mockito.ArgumentMatchers.eq("WS-1"),
                org.mockito.ArgumentMatchers.eq("presence"), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void rosterIsWorkspaceScoped() {
        PresenceService p = new PresenceService(realtime);
        p.heartbeat("WS-1", "USR-1", "Asha", "board", null, null);
        p.heartbeat("WS-2", "USR-2", "Ben", "board", null, null);
        assertEquals(1, p.roster("WS-1").size());
        assertEquals("USR-2", p.roster("WS-2").get(0).userId());
    }

    @Test
    void leaveRemovesUser() {
        PresenceService p = new PresenceService(realtime);
        p.heartbeat("WS-1", "USR-1", "Asha", "board", null, null);
        p.leave("WS-1", "USR-1");
        assertTrue(p.roster("WS-1").isEmpty());
    }

    @Test
    void staleEntriesArePruned() {
        // A controllable clock: heartbeat at t=0, then read the roster after the TTL has elapsed.
        long[] clock = { 1000L };
        PresenceService p = new PresenceService(realtime) {
            @Override
            long now() {
                return clock[0];
            }
        };
        p.heartbeat("WS-1", "USR-1", "Asha", "board", null, null);
        assertEquals(1, p.roster("WS-1").size());
        clock[0] += PresenceService.TTL.toMillis() + 1;
        assertTrue(p.roster("WS-1").isEmpty());
    }
}
