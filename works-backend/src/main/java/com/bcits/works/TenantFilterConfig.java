package com.bcits.works;

import com.bcits.works.shared.TenantFilterInterceptor;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Registers the MVC interceptors: {@link TenantFilterInterceptor} (syncs the central Hibernate
 * {@code workspaceFilter} to {@link TenantContext} once per request — RB-40 §1, #243) and
 * {@link WriteRateLimitInterceptor} (per-user write-endpoint rate limiting — RB-10 §8, W1 rate-limit PR4).
 *
 * <p>Both are added for all paths and are no-ops in their default state (no workspace bound / write
 * limit disabled), so registering them globally is safe.
 */
@Configuration
public class TenantFilterConfig implements WebMvcConfigurer {

    private final TenantFilterInterceptor tenantFilterInterceptor;
    private final WriteRateLimitInterceptor writeRateLimitInterceptor;

    public TenantFilterConfig(TenantFilterInterceptor tenantFilterInterceptor,
                              WriteRateLimitInterceptor writeRateLimitInterceptor) {
        this.tenantFilterInterceptor = tenantFilterInterceptor;
        this.writeRateLimitInterceptor = writeRateLimitInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(tenantFilterInterceptor).addPathPatterns("/**");
        registry.addInterceptor(writeRateLimitInterceptor).addPathPatterns("/api/**");
    }
}
