package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("unit")
class DashboardLayoutServiceTest {

    private final DashboardLayoutService service = new DashboardLayoutService();

    @Test
    void cols_defaultsAndFloors() {
        assertThat(service.cols(null)).isEqualTo(12);
        assertThat(service.cols(0)).isEqualTo(12);
        assertThat(service.cols(6)).isEqualTo(6);
    }

    @Test
    void clampWidth_neverZeroOrWiderThanGrid() {
        assertThat(service.clampWidth(0, 12)).isEqualTo(1);
        assertThat(service.clampWidth(20, 12)).isEqualTo(12);
        assertThat(service.clampWidth(null, 12)).isEqualTo(4);
        assertThat(service.clampWidth(5, 12)).isEqualTo(5);
    }

    @Test
    void clampHeight_atLeastOne() {
        assertThat(service.clampHeight(0)).isEqualTo(1);
        assertThat(service.clampHeight(null)).isEqualTo(2);
        assertThat(service.clampHeight(3)).isEqualTo(3);
    }

    @Test
    void clampX_keepsWidgetOnGrid() {
        assertThat(service.clampX(10, 4, 12)).isEqualTo(8); // 10 would overflow; max start is 12-4
        assertThat(service.clampX(-3, 4, 12)).isEqualTo(0);
        assertThat(service.clampX(2, 4, 12)).isEqualTo(2);
    }

    @Test
    void normalize_clampsEverythingAndDefaultsConfig() {
        DashboardWidget w = new DashboardWidget();
        w.setGridW(99);
        w.setGridH(0);
        w.setGridX(50);
        w.setGridY(-1);
        service.normalize(w, 12);
        assertThat(w.getGridW()).isEqualTo(12);
        assertThat(w.getGridH()).isEqualTo(1);
        assertThat(w.getGridX()).isEqualTo(0); // width==cols → only valid x is 0
        assertThat(w.getGridY()).isEqualTo(0);
        assertThat(w.getPosition()).isEqualTo(0);
        assertThat(w.getConfig()).isEqualTo("{}");
    }

    @Test
    void normalize_preservesValidPlacement() {
        DashboardWidget w = new DashboardWidget();
        w.setGridW(3);
        w.setGridH(2);
        w.setGridX(4);
        w.setGridY(1);
        w.setPosition(5);
        w.setConfig("{\"metric\":\"count\"}");
        service.normalize(w, 12);
        assertThat(w.getGridW()).isEqualTo(3);
        assertThat(w.getGridX()).isEqualTo(4);
        assertThat(w.getPosition()).isEqualTo(5);
        assertThat(w.getConfig()).isEqualTo("{\"metric\":\"count\"}");
    }
}
