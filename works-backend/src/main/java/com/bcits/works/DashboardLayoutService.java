package com.bcits.works;

import org.springframework.stereotype.Service;

/**
 * Pure grid-geometry helpers for dashboard widgets. Keeps a widget's placement
 * inside the dashboard's column grid so the persisted layout is always valid,
 * regardless of what the client posts. No I/O — unit-testable in isolation.
 */
@Service
public class DashboardLayoutService {

    public static final int DEFAULT_COLS = 12;
    public static final int DEFAULT_W = 4;
    public static final int DEFAULT_H = 2;

    public int cols(Integer cols) {
        return cols == null || cols < 1 ? DEFAULT_COLS : cols;
    }

    /** Width is at least 1 and never wider than the grid. */
    public int clampWidth(Integer w, int cols) {
        int width = w == null ? DEFAULT_W : w;
        return Math.max(1, Math.min(width, cols));
    }

    /** Height is at least 1 row. */
    public int clampHeight(Integer h) {
        int height = h == null ? DEFAULT_H : h;
        return Math.max(1, height);
    }

    /** X keeps the widget fully on-grid given its (already clamped) width. */
    public int clampX(Integer x, int width, int cols) {
        int gx = x == null ? 0 : x;
        return Math.max(0, Math.min(gx, cols - width));
    }

    public int clampY(Integer y) {
        int gy = y == null ? 0 : y;
        return Math.max(0, gy);
    }

    /** Normalize a widget's placement in place against the grid width. */
    public void normalize(DashboardWidget widget, Integer layoutCols) {
        int cols = cols(layoutCols);
        int w = clampWidth(widget.getGridW(), cols);
        widget.setGridW(w);
        widget.setGridH(clampHeight(widget.getGridH()));
        widget.setGridX(clampX(widget.getGridX(), w, cols));
        widget.setGridY(clampY(widget.getGridY()));
        if (widget.getPosition() == null) {
            widget.setPosition(0);
        }
        if (widget.getConfig() == null || widget.getConfig().isBlank()) {
            widget.setConfig("{}");
        }
    }
}
