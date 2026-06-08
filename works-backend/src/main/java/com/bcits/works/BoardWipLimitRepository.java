package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;

/** Board WIP limits, keyed by workspace id (RB-40 §1 — workspace-scoped by construction). */
public interface BoardWipLimitRepository extends JpaRepository<BoardWipLimit, String> {
}
