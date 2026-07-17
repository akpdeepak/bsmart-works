package com.bcits.works;
import com.bcits.works.ai.AiProvider;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.health.contributor.Health;
import org.springframework.boot.health.contributor.HealthIndicator;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import java.nio.file.Files;
import java.nio.file.Path;

@Configuration
public class DeploymentHealthIndicators {

    @Bean
    HealthIndicator migrationHealthIndicator(JdbcTemplate jdbc) {
        return () -> {
            try {
                Integer failed = jdbc.queryForObject(
                        "SELECT COUNT(*) FROM flyway_schema_history WHERE success = false",
                        Integer.class);
                if (failed != null && failed > 0) {
                    return Health.down().withDetail("failedMigrations", failed).build();
                }
                String version = jdbc.queryForObject(
                        "SELECT version FROM flyway_schema_history WHERE success = true "
                                + "ORDER BY installed_rank DESC LIMIT 1",
                        String.class);
                return Health.up().withDetail("latestVersion", version).build();
            } catch (Exception e) {
                return Health.down(e).build();
            }
        };
    }

    @Bean
    HealthIndicator storageHealthIndicator(@Value("${app.attachments.dir}") String attachmentsDir) {
        return () -> {
            try {
                Path path = Path.of(attachmentsDir);
                Files.createDirectories(path);
                return Files.isWritable(path)
                        ? Health.up().withDetail("path", path.toAbsolutePath().toString()).build()
                        : Health.down().withDetail("path", path.toAbsolutePath().toString()).build();
            } catch (Exception e) {
                return Health.down(e).build();
            }
        };
    }

    @Bean
    HealthIndicator aiHealthIndicator(AiProvider aiProvider) {
        return () -> Health.up().withDetail("provider", aiProvider.name()).build();
    }

    @Bean
    HealthIndicator realtimeHealthIndicator() {
        return () -> Health.up().withDetail("transport", "sse").build();
    }
}
