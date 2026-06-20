package com.bcits.works.portal;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/v1/portal")
public class PortalController {

    // In-memory demo store for requests (dev stubs)
    private static final Map<String, Map<String, Object>> REQUEST_STORE = new LinkedHashMap<>();

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> body) {
        // Dev-mode: accept any username/password and return a demo token
        String username = body.getOrDefault("username", "guest");
        Map<String, Object> session = new HashMap<>();
        session.put("token", "dev-token-" + UUID.randomUUID());
        session.put("accountId", "acct-" + (username.equals("guest") ? "demo" : username));
        session.put("customerName", username);
        return ResponseEntity.ok(session);
    }

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> dashboard() {
        Map<String, Object> dash = new HashMap<>();
        dash.put("accountId", "acct-demo");
        dash.put("openRequests", REQUEST_STORE.size());
        dash.put("recent", REQUEST_STORE.values());
        return ResponseEntity.ok(dash);
    }

    @GetMapping("/request-types")
    public ResponseEntity<List<Map<String, Object>>> requestTypes() {
        List<Map<String, Object>> types = new ArrayList<>();
        types.add(Map.of("id", "billing", "name", "Billing"));
        types.add(Map.of("id", "outage", "name", "Outage"));
        types.add(Map.of("id", "access", "name", "Account access"));
        return ResponseEntity.ok(types);
    }

    @GetMapping("/requests")
    public ResponseEntity<Map<String, Object>> listRequests(@RequestParam(value = "page", required = false, defaultValue = "1") int page) {
        Map<String, Object> result = new HashMap<>();
        result.put("items", new ArrayList<>(REQUEST_STORE.values()));
        result.put("total", REQUEST_STORE.size());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/requests")
    public ResponseEntity<Map<String, Object>> createRequest(@RequestBody Map<String, Object> body) {
        String id = UUID.randomUUID().toString();
        Map<String, Object> req = new HashMap<>(body);
        req.put("id", id);
        req.put("status", "OPEN");
        req.put("createdAt", Instant.now().toString());
        REQUEST_STORE.put(id, req);
        return ResponseEntity.status(HttpStatus.CREATED).body(req);
    }

    @GetMapping("/requests/{requestId}")
    public ResponseEntity<Map<String, Object>> getRequest(@PathVariable String requestId) {
        Map<String, Object> req = REQUEST_STORE.get(requestId);
        if (req == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        return ResponseEntity.ok(req);
    }

    @PostMapping("/requests/{requestId}/csat")
    public ResponseEntity<Map<String, Object>> postCsat(@PathVariable String requestId, @RequestBody Map<String, Object> body) {
        Map<String, Object> req = REQUEST_STORE.get(requestId);
        if (req == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        // attach csat to the request (dev-only)
        req.put("csat", body);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @GetMapping("/knowledge/search")
    public ResponseEntity<List<Map<String, Object>>> knowledgeSearch(@RequestParam(value = "q") String q) {
        // Dev: return simple mocked articles matching query
        List<Map<String, Object>> hits = new ArrayList<>();
        hits.add(Map.of("id", "kb-1", "title", "How to pay your bill", "excerpt", "Steps to pay your bill...", "url", "/kb/kb-1"));
        hits.add(Map.of("id", "kb-2", "title", "Report an outage", "excerpt", "If you see an outage...", "url", "/kb/kb-2"));
        return ResponseEntity.ok(hits);
    }
}
