package com.example.demo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

/** Unit tests for config import/export serialization (iteration 17, Cap R). */
@Tag("unit")
class ConfigSerializationServiceTest {

    private final ConfigSerializationService svc = new ConfigSerializationService();

    @Test
    void yamlExportThenImportRoundTripsToTheSameJson() {
        String json = "{\"settings\":{\"timezone\":\"Asia/Kolkata\",\"locale\":\"en-IN\"}}";
        String yaml = svc.export(json, ConfigSerializationService.Format.YAML);
        assertThat(yaml).contains("timezone");
        String back = svc.importToJson(yaml, ConfigSerializationService.Format.YAML);
        assertThat(back).contains("Asia/Kolkata").contains("en-IN");
    }

    @Test
    void jsonExportIsPrettyPrinted() {
        String out = svc.export("{\"a\":1}", ConfigSerializationService.Format.JSON);
        assertThat(out).contains("\n");
    }

    @Test
    void parseFormatDefaultsToJson() {
        assertThat(ConfigSerializationService.parseFormat("yaml")).isEqualTo(ConfigSerializationService.Format.YAML);
        assertThat(ConfigSerializationService.parseFormat("anything-else")).isEqualTo(ConfigSerializationService.Format.JSON);
        assertThat(ConfigSerializationService.parseFormat(null)).isEqualTo(ConfigSerializationService.Format.JSON);
    }

    @Test
    void rejectsMalformedImport() {
        assertThatThrownBy(() -> svc.importToJson("{not valid", ConfigSerializationService.Format.JSON))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getCode()).isEqualTo("INVALID_CONFIG"));
    }

    @Test
    void rejectsNonObjectTopLevel() {
        assertThatThrownBy(() -> svc.importToJson("[1,2,3]", ConfigSerializationService.Format.JSON))
                .isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> svc.importToJson("", ConfigSerializationService.Format.YAML))
                .isInstanceOf(ApiException.class);
    }
}
