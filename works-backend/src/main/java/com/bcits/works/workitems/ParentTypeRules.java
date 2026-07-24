package com.bcits.works.workitems;

import com.bcits.works.workitems.DefaultWorkItemTypes;

import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Resolves which parent types may contain a given child type.
 *
 * <p>Two sources exist. {@link DefaultWorkItemTypes#VALID_CHILDREN} covers the 16 built-in types,
 * and a workspace may declare its own rule per type in {@link WorkItemTypeConfig#getValidParentTypes()}.
 * Only the first was consulted, so a custom type — which appears in no built-in child set — could
 * never be given a parent, whatever the workspace had configured.
 *
 * <p>Resolution order: a non-empty configured list wins outright (it narrows as readily as it
 * widens); otherwise the built-in hierarchy applies. An <em>empty</em> list counts as unconfigured,
 * because {@code valid_parent_types} is {@code NOT NULL DEFAULT '[]'::jsonb} (V68) and so every row
 * predating this feature carries one — reading it as "no parent is legal" would break hierarchies
 * that work today. A type that should accept no parent simply has no rule.
 */
public final class ParentTypeRules {

    private ParentTypeRules() {}

    /** Child type → the parent types the built-in hierarchy allows, i.e. VALID_CHILDREN inverted. */
    private static final Map<String, Set<String>> BUILT_IN_PARENTS =
        DefaultWorkItemTypes.VALID_CHILDREN.entrySet().stream()
            .flatMap(e -> e.getValue().stream().map(child -> Map.entry(child, e.getKey())))
            .collect(Collectors.groupingBy(Map.Entry::getKey,
                     Collectors.mapping(Map.Entry::getValue, Collectors.toUnmodifiableSet())));

    /** The parent types {@code childType} may sit under according to the built-in hierarchy. */
    public static Set<String> builtInParents(String childType) {
        String key = normalize(childType);
        return key == null ? Set.of() : BUILT_IN_PARENTS.getOrDefault(key, Set.of());
    }

    /**
     * The parent types {@code childType} may sit under, honouring a workspace's configuration.
     *
     * @param configuredParents the workspace's {@code valid_parent_types} for this child type;
     *                          {@code null}, empty, or all-blank means "not configured"
     */
    public static Set<String> allowedParents(String childType, Collection<String> configuredParents) {
        if (normalize(childType) == null) {
            return Set.of();
        }
        if (configuredParents != null) {
            Set<String> configured = configuredParents.stream()
                .map(ParentTypeRules::normalize)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
            if (!configured.isEmpty()) {
                return Set.copyOf(configured);
            }
        }
        return builtInParents(childType);
    }

    /** Whether {@code childType} may be created under {@code parentType}. */
    public static boolean permits(String parentType, String childType, Collection<String> configuredParents) {
        String parent = normalize(parentType);
        return parent != null && allowedParents(childType, configuredParents).contains(parent);
    }

    private static String normalize(String typeKey) {
        if (typeKey == null) {
            return null;
        }
        String trimmed = typeKey.trim();
        return trimmed.isEmpty() ? null : trimmed.toUpperCase(java.util.Locale.ROOT);
    }
}
