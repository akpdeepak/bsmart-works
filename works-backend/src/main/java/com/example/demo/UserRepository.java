package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String> {
    // This magically tells PostgreSQL to search the table by email!
    Optional<User> findByEmail(String email);
    Optional<User> findByVerificationToken(String verificationToken);
}