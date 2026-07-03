package com.bcits.works.shared;



import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

/**
 * Bridges the Spring-managed {@link WorkspaceFilterActivator} into the static utility
 * {@link TenantScope}, so the escape hatch ({@link TenantScope#systemUnscoped}) can physically toggle
 * the central Hibernate filter on the live session — not merely flip the {@link TenantContext}
 * thread-local.
 *
 * <p>{@link TenantScope} stays a static helper (its callers — schedulers, controllers, public/token
 * paths — invoke it without injection), and this one-line bridge gives it the collaborator it needs.
 * In plain unit tests that never start a Spring context the activator is simply never set, and
 * {@link TenantScope} degrades gracefully to thread-local-only behaviour (correct, because there is
 * no live Hibernate session to toggle in that case).
 */
@Component
public class TenantScopeBootstrap {

    private final WorkspaceFilterActivator activator;

    public TenantScopeBootstrap(WorkspaceFilterActivator activator) {
        this.activator = activator;
    }

    @PostConstruct
    void wireStaticActivator() {
        TenantScope.setActivator(activator);
    }
}
