package com.bcits.works.workitems;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class TeamSequenceGenerator {

    private final JdbcTemplate jdbcTemplate;

    public TeamSequenceGenerator(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Atomically increments and returns the next sequence for the given team ID.
     */
    public int getNextSequence(String teamId) {
        // Postgres-specific atomic increment and return
        Integer nextSeq = jdbcTemplate.queryForObject(
            "UPDATE teams SET next_seq = next_seq + 1, updated_at = NOW() WHERE id = ? RETURNING next_seq - 1",
            Integer.class,
            teamId
        );
        return nextSeq != null ? nextSeq : 1;
    }
}
