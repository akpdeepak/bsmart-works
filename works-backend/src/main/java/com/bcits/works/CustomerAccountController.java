package com.bcits.works;

import com.bcits.works.auth.TokenRevocationService;
import com.bcits.works.shared.RbacGate;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Customer accounts and their external users (iteration 9, Cap N). The service-desk admin surface:
 * workspace-scoped CRUD on customer organizations plus provisioning of the customers' portal users
 * (a separate identity from internal {@code users}). RBAC lives here at the service boundary
 * (RB-10 §2): reads require workspace membership; mutations require {@code manage_service}. Every
 * mutation is recorded as an event (RB-10 §3); every read is workspace-scoped (RB-40 §1).
 */
@RestController
@RequestMapping("/api/v1/service/customers")
public class CustomerAccountController {

    private final CustomerAccountRepository accounts;
    private final CustomerUserRepository customerUsers;
    private final CustomerAccountService accountService;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;
    private final CustomerUserPiiService customerUserPii;
    private final TokenRevocationService tokenRevocation;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public CustomerAccountController(CustomerAccountRepository accounts, CustomerUserRepository customerUsers,
                                     CustomerAccountService accountService, EventService eventService,
                                     AuthenticatedUser authenticatedUser, RbacGate rbac,
                                     CustomerUserPiiService customerUserPii,
                                     TokenRevocationService tokenRevocation) {
        this.accounts = accounts;
        this.customerUsers = customerUsers;
        this.accountService = accountService;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
        this.customerUserPii = customerUserPii;
        this.tokenRevocation = tokenRevocation;
    }

    @GetMapping
    public List<CustomerAccount> list(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        return accounts.findByWorkspaceIdOrderByNameAsc(workspaceId);
    }

    @GetMapping("/{id}")
    public CustomerAccount get(@PathVariable String id) {
        CustomerAccount account = load(id);
        rbac.require(authenticatedUser.id(), account.getWorkspaceId(), "view_items");
        return account;
    }

    @PostMapping
    public CustomerAccount create(@Valid @RequestBody CustomerAccount account) {
        String userId = authenticatedUser.id();
        if (account.getWorkspaceId() == null || account.getWorkspaceId().isBlank()) {
            throw ApiException.badRequest("WORKSPACE_REQUIRED", "workspaceId is required.");
        }
        rbac.require(userId, account.getWorkspaceId(), "manage_service");
        CustomerAccount saved = accounts.save(accountService.prepareNew(account, userId));
        eventService.record(saved.getId(), "CUSTOMER_ACCOUNT_CREATED", userId,
                Map.of("name", safe(saved.getName()), "tier", safe(saved.getTier())));
        return saved;
    }

    @PutMapping("/{id}")
    public CustomerAccount update(@PathVariable String id, @Valid @RequestBody CustomerAccount updated) {
        String userId = authenticatedUser.id();
        CustomerAccount existing = load(id);
        rbac.require(userId, existing.getWorkspaceId(), "manage_service");
        CustomerAccount saved = accounts.save(accountService.applyUpdate(existing, updated));
        eventService.record(saved.getId(), "CUSTOMER_ACCOUNT_UPDATED", userId,
                Map.of("name", safe(saved.getName())));
        return saved;
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        String userId = authenticatedUser.id();
        CustomerAccount existing = load(id);
        rbac.require(userId, existing.getWorkspaceId(), "manage_service");
        accounts.deleteById(id);
        eventService.record(id, "CUSTOMER_ACCOUNT_DELETED", userId, Map.of("name", safe(existing.getName())));
        return ResponseEntity.noContent().build();
    }

    // ── Customer users (portal identities) ──────────────────────────────────────────

    @GetMapping("/{accountId}/users")
    public List<CustomerUser> listUsers(@PathVariable String accountId) {
        CustomerAccount account = load(accountId);
        rbac.require(authenticatedUser.id(), account.getWorkspaceId(), "view_items");
        return scrub(customerUsers.findByCustomerAccountIdOrderByCreatedAtDesc(accountId));
    }

    @PostMapping("/{accountId}/users")
    public CustomerUser createUser(@PathVariable String accountId, @RequestBody Map<String, Object> body) {
        String userId = authenticatedUser.id();
        CustomerAccount account = load(accountId);
        rbac.require(userId, account.getWorkspaceId(), "manage_service");

        String email = str(body.get("email"));
        String password = str(body.get("password"));
        if (email == null || email.isBlank()) {
            throw ApiException.badRequest("EMAIL_REQUIRED", "A customer email is required.", "email");
        }
        if (password == null || password.length() < 8) {
            throw ApiException.badRequest("WEAK_PASSWORD", "Password must be at least 8 characters.", "password");
        }
        String normalizedEmail = email.trim().toLowerCase();
        if (customerUserPii.existsByEmail(normalizedEmail)) {
            throw ApiException.conflict("A customer user with that email already exists.");
        }
        CustomerUser cu = new CustomerUser();
        cu.setId("CU-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        cu.setCustomerAccountId(accountId);
        cu.setWorkspaceId(account.getWorkspaceId());
        cu.setEmail(normalizedEmail);
        cu.setEmailHmac(customerUserPii.emailHmac(normalizedEmail)); // blind index for tokenized portal login (RB-40 §3)
        cu.setPasswordHash(passwordEncoder.encode(password));
        cu.setDisplayName(str(body.get("displayName")));
        cu.setIsAccountAdmin(Boolean.TRUE.equals(body.get("isAccountAdmin")));
        cu.setActive(true);
        OffsetDateTime now = OffsetDateTime.now();
        cu.setCreatedAt(now);
        cu.setUpdatedAt(now);
        CustomerUser saved = customerUsers.save(cu);
        customerUserPii.syncIdentity(saved); // dual-write email + display name into the PII vault (RB-40 §3)
        // No raw PII in events (RB-40 §3 rule 1): reference the account, not the customer's email.
        eventService.record(saved.getId(), "CUSTOMER_USER_CREATED", userId,
                Map.of("accountId", accountId));
        return scrub(saved);
    }

    @PutMapping("/{accountId}/users/{userId}")
    public CustomerUser updateUser(@PathVariable String accountId, @PathVariable String userId,
                                   @RequestBody Map<String, Object> body) {
        String actor = authenticatedUser.id();
        CustomerAccount account = load(accountId);
        rbac.require(actor, account.getWorkspaceId(), "manage_service");
        CustomerUser cu = customerUsers.findById(userId)
                .orElseThrow(() -> ApiException.notFound("Customer user", userId));
        if (!accountId.equals(cu.getCustomerAccountId())) {
            throw ApiException.notFound("Customer user", userId);
        }
        if (body.containsKey("displayName")) {
            cu.setDisplayName(str(body.get("displayName")));
        }
        if (body.containsKey("active")) {
            cu.setActive(Boolean.TRUE.equals(body.get("active")));
        }
        if (body.containsKey("isAccountAdmin")) {
            cu.setIsAccountAdmin(Boolean.TRUE.equals(body.get("isAccountAdmin")));
        }
        String newPassword = str(body.get("password"));
        boolean passwordChanged = newPassword != null && !newPassword.isBlank();
        if (passwordChanged) {
            if (newPassword.length() < 8) {
                throw ApiException.badRequest("WEAK_PASSWORD", "Password must be at least 8 characters.", "password");
            }
            cu.setPasswordHash(passwordEncoder.encode(newPassword));
        }
        cu.setUpdatedAt(OffsetDateTime.now());
        CustomerUser saved = customerUsers.save(cu);
        if (passwordChanged) {
            // Token-version revocation parity (W1 rate-limit/JWT PR1): a portal password change
            // invalidates the customer's existing portal tokens, matching internal change-password.
            tokenRevocation.revokeCustomerTokens(saved.getId());
        }
        customerUserPii.syncIdentity(saved); // dual-write the updated display name into the PII vault (RB-40 §3)
        eventService.record(saved.getId(), "CUSTOMER_USER_UPDATED", actor, Map.of("accountId", accountId));
        return scrub(saved);
    }

    // ── helpers ─────────────────────────────────────────────────────────────────────

    private CustomerAccount load(String id) {
        return accounts.findById(id).orElseThrow(() -> ApiException.notFound("Customer account", id));
    }

    /** Never leak password hashes over the wire; resolve display PII from the vault when reads are
     *  switched on (RB-40 §3 — no-op while read-from-vault is off, the default). */
    private CustomerUser scrub(CustomerUser cu) {
        customerUserPii.applyDisplay(cu);
        cu.setPasswordHash(null);
        return cu;
    }

    private List<CustomerUser> scrub(List<CustomerUser> users) {
        users.forEach(this::scrub);
        return users;
    }

    private static String str(Object o) { return o == null ? null : o.toString(); }

    private static String safe(String s) { return s == null ? "" : s; }
}
