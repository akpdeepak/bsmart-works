package com.bcits.works;

final class DashboardNumbers {

    private DashboardNumbers() {
    }

    static long toLong(Object val) {
        if (val == null) {
            return 0;
        }
        if (val instanceof Long longVal) {
            return longVal;
        }
        if (val instanceof Integer intVal) {
            return intVal.longValue();
        }
        if (val instanceof Number number) {
            return number.longValue();
        }
        try {
            return Long.parseLong(val.toString());
        } catch (Exception e) {
            return 0;
        }
    }
}
