package com.bcits.works.projects;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface KeyResultRepository extends JpaRepository<KeyResult, String> {
    List<KeyResult> findByObjectiveIdOrderByDisplayOrderAsc(String objectiveId);
    void deleteByObjectiveId(String objectiveId);
}
