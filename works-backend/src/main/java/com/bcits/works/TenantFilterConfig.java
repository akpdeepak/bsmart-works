package com.bcits.works;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Registers the {@link TenantFilterInterceptor} so the central Hibernate {@code workspaceFilter} is
 * synced to {@link TenantContext} once per request (RB-40 §1, #243).
 *
 * <p>The interceptor is added for all paths. It is a no-op when no workspace is bound (the dormant
 * default) and when the request never opens a Hibernate session, so registering it globally is safe.
 */
@Configuration
public class TenantFilterConfig implements WebMvcConfigurer {

    private final TenantFilterInterceptor tenantFilterInterceptor;

    public TenantFilterConfig(TenantFilterInterceptor tenantFilterInterceptor) {
        this.tenantFilterInterceptor = tenantFilterInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(tenantFilterInterceptor).addPathPatterns("/**");
    }
}
