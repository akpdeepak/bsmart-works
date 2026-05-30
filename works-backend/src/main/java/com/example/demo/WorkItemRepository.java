package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WorkItemRepository extends JpaRepository<WorkItem, String> {
    // Spring Boot automatically writes all the SQL queries (FindAll, Save, Delete) for us!
}