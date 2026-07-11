package com.bcits.works.shared;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface FieldVisibilityRepository extends JpaRepository<FieldVisibility, String> {
    List<FieldVisibility> findByFieldDefId(String fieldDefId);
    List<FieldVisibility> findByRoleDefId(String roleDefId);
    Optional<FieldVisibility> findByFieldDefIdAndRoleDefId(String fieldDefId, String roleDefId);
}
