package com.example.demo;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;

/**
 * Pure structural diff between two configuration documents (iteration 17, Cap R). Walks both JSON
 * trees and emits a flat list of leaf-level changes keyed by dot-path (e.g.
 * {@code settings.timezone}), each tagged ADDED / REMOVED / CHANGED. This single diff backs the
 * version diff view, the import/promote preview, and impact analysis — there is one notion of
 * "what changed" across the whole engine. No DB access, no side effects: fully unit-testable.
 */
@Service
public class ConfigDiffService {

    private final ObjectMapper mapper = new ObjectMapper();

    public enum Op { ADDED, REMOVED, CHANGED }

    /** A single leaf change. {@code oldValue}/{@code newValue} are rendered scalar/JSON strings. */
    public record ConfigChange(String path, Op op, String oldValue, String newValue) { }

    /** Diff two document JSON strings. Either may be null/blank (treated as an empty object). */
    public List<ConfigChange> diff(String oldJson, String newJson) {
        JsonNode oldNode = parse(oldJson);
        JsonNode newNode = parse(newJson);
        List<ConfigChange> changes = new ArrayList<>();
        walk("", oldNode, newNode, changes);
        return changes;
    }

    private void walk(String path, JsonNode oldNode, JsonNode newNode, List<ConfigChange> out) {
        if (oldNode.isObject() && newNode.isObject()) {
            Set<String> keys = new LinkedHashSet<>();
            oldNode.fieldNames().forEachRemaining(keys::add);
            newNode.fieldNames().forEachRemaining(keys::add);
            for (String key : keys) {
                String child = path.isEmpty() ? key : path + "." + key;
                JsonNode o = oldNode.get(key);
                JsonNode n = newNode.get(key);
                if (o == null) {
                    out.add(new ConfigChange(child, Op.ADDED, null, render(n)));
                } else if (n == null) {
                    out.add(new ConfigChange(child, Op.REMOVED, render(o), null));
                } else {
                    walk(child, o, n, out);
                }
            }
            return;
        }
        // Leaves (scalars, arrays, or a type change object<->scalar): compare by rendered value.
        String o = render(oldNode);
        String n = render(newNode);
        if (!o.equals(n)) {
            out.add(new ConfigChange(path, Op.CHANGED, o, n));
        }
    }

    private JsonNode parse(String json) {
        try {
            JsonNode node = mapper.readTree(json == null || json.isBlank() ? "{}" : json);
            return node == null || node.isNull() ? mapper.createObjectNode() : node;
        } catch (Exception e) {
            throw ApiException.badRequest("INVALID_CONFIG", "Configuration is not valid JSON.");
        }
    }

    /** Stable string rendering: scalars as their text, arrays/objects as compact JSON. */
    private String render(JsonNode node) {
        if (node == null || node.isNull()) {
            return "";
        }
        if (node.isValueNode()) {
            return node.asText();
        }
        return node.toString();
    }
}
