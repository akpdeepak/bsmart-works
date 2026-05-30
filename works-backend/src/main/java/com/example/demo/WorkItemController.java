package com.example.demo;

import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/work-items")
@CrossOrigin(origins = "http://localhost:5173")
public class WorkItemController {

    private final WorkItemRepository repository;

    public WorkItemController(WorkItemRepository repository) {
        this.repository = repository;
    }

    // GET: Send data to React
    @GetMapping
    public List<WorkItem> getAllWorkItems() {
        return repository.findAll();
    }

    // POST: Receive new data from React and save to Postgres
    @PostMapping
    public WorkItem createWorkItem(@RequestBody WorkItem newItem) {
        // Generate a random ID for this MVP (e.g., WEB-8492)
        int randomNum = (int)(Math.random() * 10000);
        newItem.setId("WEB-" + randomNum);

        // Force new items to start as 'Todo'
        newItem.setStatus("Todo");

        return repository.save(newItem);
    }

    // PUT: Update an existing work item (like moving columns)
    @PutMapping("/{id}")
    public WorkItem updateWorkItem(@PathVariable String id, @RequestBody WorkItem updatedItem) {
        // Find the existing item in the database
        return repository.findById(id).map(existingItem -> {
            // Update its fields
            existingItem.setTitle(updatedItem.getTitle());
            existingItem.setStatus(updatedItem.getStatus());
            existingItem.setType(updatedItem.getType());
            // Save the changes
            return repository.save(existingItem);
        }).orElseThrow(() -> new RuntimeException("Work Item not found: " + id));
    }
}
