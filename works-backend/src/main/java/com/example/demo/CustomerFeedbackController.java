package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
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

    public CustomerFeedbackController(CustomerFeedbackService service, AuthenticatedUser authenticatedUser) {
        this.service = service;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<CustomerFeedback> list(@RequestParam String workspaceId) {
        return service.list(authenticatedUser.id(), workspaceId);
    }

    @PostMapping
    public CustomerFeedback create(@Valid @RequestBody CustomerFeedback feedback) {
        return service.create(authenticatedUser.id(), feedback);
    }

    @PutMapping("/{id}")
    public CustomerFeedback update(@PathVariable String id, @Valid @RequestBody CustomerFeedback updated) {
        return service.update(authenticatedUser.id(), id, updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(authenticatedUser.id(), id);
        return ResponseEntity.noContent().build();
    }
}
