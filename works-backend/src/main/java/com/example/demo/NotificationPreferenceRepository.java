package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;

/** Per-user notification preferences, keyed by user id (iteration 18, Cap S). */
public interface NotificationPreferenceRepository extends JpaRepository<NotificationPreference, String> {
}
