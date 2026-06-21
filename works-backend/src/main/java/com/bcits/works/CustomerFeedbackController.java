package com.bcits.works;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import jakarta.validation.Valid;
import java.util.List;

/**
 * Cap W · Customer feedback aggregation HTTP surface (I15-S11). Thin; delegates to
 * {@link CustomerFeedbackService}. AI theme clustering is exposed via {@code /api/v1/ai/...}.
 */
@RestController
@RequestMapping("/api/v1/customer-feedback")
public class CustomerFeedbackController {

    private final CustomerFeedbackService service;
    private final AuthenticatedUser authenticatedUser;
    private final CustomerAttributionPiiService attributionPii;

    public CustomerFeedbackController(CustomerFeedbackService service, AuthenticatedUser authenticatedUser,
                                      CustomerAttributionPiiService attributionPii) {
        this.service = service;
        this.authenticatedUser = authenticatedUser;
        this.attributionPii = attributionPii;
    }

    @GetMapping
    public List<CustomerFeedback> list(@RequestParam String workspaceId) {
        List<CustomerFeedback> items = service.list(authenticatedUser.id(), workspaceId);
        items.forEach(this::resolveCustomer);
        return items;
    }

    @PostMapping
    public CustomerFeedback create(@Valid @RequestBody CustomerFeedback feedback) {
        return resolveCustomer(service.create(authenticatedUser.id(), feedback));
    }

    @PutMapping("/{id}")
    public CustomerFeedback update(@PathVariable String id, @Valid @RequestBody CustomerFeedback updated) {
        return resolveCustomer(service.update(authenticatedUser.id(), id, updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(authenticatedUser.id(), id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Resolve the free-text customer attribution from the PII vault when reads are switched on
     * (RB-40 §3 — no-op while read-from-vault is off, the default), mutating the rendered value in
     * place at the controller boundary (outside the service transaction) so it is never flushed back to
     * the legacy customer column.
     */
    private CustomerFeedback resolveCustomer(CustomerFeedback f) {
        if (f != null) {
            f.setCustomer(attributionPii.resolve(f.getWorkspaceId(), f.getCustomerSubjectToken(), f.getCustomer()));
        }
        return f;
    }
}
