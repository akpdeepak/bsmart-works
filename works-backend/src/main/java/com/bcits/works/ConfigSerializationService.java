package com.bcits.works;

import com.bcits.works.shared.ApiException;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.yaml.snakeyaml.DumperOptions;
import org.yaml.snakeyaml.Yaml;

/**
 * Config import/export serialization (iteration 17, Cap R). Moves a configuration document between
 * workspaces as JSON or YAML — for backup and source-control-friendly review. JSON is canonical
 * (the document is stored as jsonb); YAML is a human-/diff-friendly rendering produced via SnakeYAML
 * (already on the classpath). Import validates that the text parses and re-canonicalizes to JSON so
 * a malformed upload is rejected at the boundary, never persisted.
 */
@Service
public class ConfigSerializationService {

    private final ObjectMapper json = new ObjectMapper();

    public enum Format { JSON, YAML }

    public static Format parseFormat(String raw) {
        if (raw != null && raw.equalsIgnoreCase("yaml")) {
            return Format.YAML;
        }
        return Format.JSON;
    }

    /** Render a stored JSON document to the requested export format (pretty JSON or YAML). */
    public String export(String documentJson, Format format) {
        try {
            Object tree = json.readValue(documentJson == null || documentJson.isBlank() ? "{}" : documentJson, Object.class);
            if (format == Format.YAML) {
                return yaml().dump(tree);
            }
            return json.writerWithDefaultPrettyPrinter().writeValueAsString(tree);
        } catch (Exception e) {
            throw ApiException.badRequest("INVALID_CONFIG", "Stored configuration could not be exported.");
        }
    }

    /** Parse imported JSON or YAML text into a canonical JSON document string (or 400 if malformed). */
    public String importToJson(String text, Format format) {
        if (text == null || text.isBlank()) {
            throw ApiException.badRequest("INVALID_CONFIG", "Import payload is empty.");
        }
        try {
            Object tree = format == Format.YAML ? new Yaml().load(text) : json.readValue(text, Object.class);
            if (!(tree instanceof Map)) {
                throw ApiException.badRequest("INVALID_CONFIG", "Configuration must be an object at the top level.");
            }
            return json.writeValueAsString(tree);
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw ApiException.badRequest("INVALID_CONFIG", "Import is not valid " + format + ".");
        }
    }

    private Yaml yaml() {
        DumperOptions opts = new DumperOptions();
        opts.setDefaultFlowStyle(DumperOptions.FlowStyle.BLOCK);
        opts.setPrettyFlow(true);
        return new Yaml(opts);
    }
}
