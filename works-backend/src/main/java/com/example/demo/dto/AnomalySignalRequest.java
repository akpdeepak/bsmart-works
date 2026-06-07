package com.example.demo.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.Set;

/** A signal fed to anomaly detection (iteration 19 Cap T). Used by the analyze endpoint and the
 *  admin "test detection" action; in production the access pipeline emits these. */
public record AnomalySignalRequest(
        @NotBlank(message = "userId is required") String userId,
        String countryCode,
        Set<String> usualCountries,
        int localHour,
        int exportedInWindow,
        int dailyExportNorm,
        boolean privilegeEscalated,
        Integer minutesSincePrevLogin,
        boolean differentCountryThanPrev
) {}
