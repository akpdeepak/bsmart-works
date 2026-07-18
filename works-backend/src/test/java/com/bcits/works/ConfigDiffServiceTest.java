package com.bcits.works;
import com.bcits.works.workspaces.ConfigDiffService;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

/** Unit tests for the pure config diff (iteration 17, Cap R). */
@Tag("unit")
class ConfigDiffServiceTest {

    private final ConfigDiffService diff = new ConfigDiffService();

    @Test
    void detectsChangedLeafByDotPath() {
        List<ConfigDiffService.ConfigChange> changes = diff.diff(
                "{\"settings\":{\"timezone\":\"Asia/Kolkata\"}}",
                "{\"settings\":{\"timezone\":\"UTC\"}}");
        assertThat(changes).hasSize(1);
        ConfigDiffService.ConfigChange c = changes.get(0);
        assertThat(c.path()).isEqualTo("settings.timezone");
        assertThat(c.op()).isEqualTo(ConfigDiffService.Op.CHANGED);
        assertThat(c.oldValue()).isEqualTo("Asia/Kolkata");
        assertThat(c.newValue()).isEqualTo("UTC");
    }

    @Test
    void detectsAddedAndRemovedKeys() {
        List<ConfigDiffService.ConfigChange> changes = diff.diff(
                "{\"a\":1,\"b\":2}",
                "{\"a\":1,\"c\":3}");
        assertThat(changes).extracting(ConfigDiffService.ConfigChange::path)
                .containsExactlyInAnyOrder("b", "c");
        assertThat(changes).anySatisfy(c -> {
            assertThat(c.path()).isEqualTo("b");
            assertThat(c.op()).isEqualTo(ConfigDiffService.Op.REMOVED);
        });
        assertThat(changes).anySatisfy(c -> {
            assertThat(c.path()).isEqualTo("c");
            assertThat(c.op()).isEqualTo(ConfigDiffService.Op.ADDED);
        });
    }

    @Test
    void identicalDocumentsProduceNoChanges() {
        assertThat(diff.diff("{\"x\":{\"y\":[1,2,3]}}", "{\"x\":{\"y\":[1,2,3]}}")).isEmpty();
    }

    @Test
    void treatsArrayAsASingleComparableLeaf() {
        List<ConfigDiffService.ConfigChange> changes = diff.diff(
                "{\"workdays\":[\"MON\",\"TUE\"]}",
                "{\"workdays\":[\"MON\",\"TUE\",\"WED\"]}");
        assertThat(changes).hasSize(1);
        assertThat(changes.get(0).path()).isEqualTo("workdays");
        assertThat(changes.get(0).op()).isEqualTo(ConfigDiffService.Op.CHANGED);
    }

    @Test
    void blankDocumentsAreTreatedAsEmptyObjects() {
        assertThat(diff.diff(null, "")).isEmpty();
        assertThat(diff.diff("", "{\"a\":1}"))
                .singleElement()
                .satisfies(c -> assertThat(c.op()).isEqualTo(ConfigDiffService.Op.ADDED));
    }
}
