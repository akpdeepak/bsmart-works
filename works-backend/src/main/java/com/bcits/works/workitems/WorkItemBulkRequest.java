package com.bcits.works.workitems;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record WorkItemBulkRequest(
        @NotNull List<@NotBlank String> ids,
        @NotBlank String action,
        String value) {
}
