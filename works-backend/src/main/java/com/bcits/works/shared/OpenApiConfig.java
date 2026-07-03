package com.bcits.works.shared;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAPI 3.1 global configuration (TD-006).
 *
 * <p>Swagger UI is served at {@code /swagger-ui.html}; the raw JSON spec at {@code /api-docs}.
 * Every endpoint inherits the {@code bearerAuth} security requirement so the UI's "Authorize"
 * button accepts a JWT and forwards it in the {@code Authorization: Bearer …} header.
 *
 * <p>Individual controllers and endpoints use {@code @Tag} and {@code @Operation} annotations
 * to enrich the generated spec with human-readable summaries. springdoc picks them up
 * automatically — no extra wiring required.
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI worksOpenApi() {
        return new OpenAPI()
            .info(new Info()
                .title("bSmart Works API")
                .version("1.0")
                .description("AI-native project workspace for utility teams"))
            .addSecurityItem(new SecurityRequirement().addList("bearerAuth"))
            .components(new Components()
                .addSecuritySchemes("bearerAuth",
                    new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")));
    }
}
