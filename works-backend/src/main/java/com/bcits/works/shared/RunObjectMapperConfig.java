package com.bcits.works.shared;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Fix-forward (2026-06-09): origin/main's AnthropicAiProvider (#173) injects a
 * {@code com.fasterxml.jackson.databind.ObjectMapper}, but after the Spring Boot 4
 * upgrade no such bean is auto-registered, so the application context fails to start.
 * Register a standard Jackson ObjectMapper so DI resolves.
 */
@Configuration
public class RunObjectMapperConfig {

    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper().findAndRegisterModules();
    }
}
