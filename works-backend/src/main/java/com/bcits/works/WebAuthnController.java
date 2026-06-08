package com.bcits.works;

import com.bcits.works.dto.PasskeyAuthBeginRequest;
import com.bcits.works.dto.PasskeyAuthFinishRequest;
import com.bcits.works.dto.PasskeyRegisterRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Passkeys / WebAuthn (iteration 19 Cap T, RB-40 §4). Two surfaces:
 *
 * <ul>
 *   <li><b>{@code /auth/passkeys/**}</b> — authenticated self-service: a signed-in user registers,
 *       lists and removes their own passkeys. The identity comes from the JWT, never the body, so a
 *       caller can only manage their own credentials (same posture as {@link MfaController}).</li>
 *   <li><b>{@code /auth/passkey/authenticate/**}</b> — pre-auth, passwordless sign-in (permit-all in
 *       {@link SecurityConfig}); the challenge–response proves possession of the private key and the
 *       server mints the session token.</li>
 * </ul>
 *
 * RBAC is not needed here — every operation is intrinsically scoped to the acting user.
 */
@RestController
@RequestMapping("/api/v1/auth")
public class WebAuthnController {

    private final WebAuthnService webAuthn;
    private final AuthenticatedUser authenticatedUser;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final EventService eventService;

    public WebAuthnController(WebAuthnService webAuthn, AuthenticatedUser authenticatedUser,
                              UserRepository userRepository, JwtUtil jwtUtil, EventService eventService) {
        this.webAuthn = webAuthn;
        this.authenticatedUser = authenticatedUser;
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
        this.eventService = eventService;
    }

    // ── Self-service registration / management ────────────────────────────────────────────────

    @GetMapping("/passkeys")
    public List<Map<String, Object>> list() {
        return webAuthn.list(authenticatedUser.id()).stream().map(WebAuthnController::toPublic).toList();
    }

    @PostMapping("/passkeys/register/begin")
    public Map<String, Object> beginRegister() {
        String userId = authenticatedUser.id();
        WebAuthnChallenge c = webAuthn.begin(userId, "REGISTER");
        return Map.of("challenge", c.getChallenge(), "rpId", "bsmart.works", "userId", userId);
    }

    @PostMapping("/passkeys/register/finish")
    public Map<String, Object> finishRegister(@Valid @RequestBody PasskeyRegisterRequest req) {
        String userId = authenticatedUser.id();
        WebAuthnCredential cred = webAuthn.finishRegistration(userId, req.workspaceId(),
                req.credentialId(), req.publicKeyPem(), req.algorithm(), req.label(),
                req.transports(), req.signature());
        return Map.of("message", "Passkey registered.", "passkey", toPublic(cred));
    }

    @DeleteMapping("/passkeys/{id}")
    public Map<String, Object> remove(@PathVariable String id) {
        webAuthn.delete(authenticatedUser.id(), id);
        return Map.of("message", "Passkey removed.");
    }

    // ── Passwordless authentication ceremony (pre-auth) ───────────────────────────────────────

    @PostMapping("/passkey/authenticate/begin")
    public Map<String, Object> beginAuthenticate(@Valid @RequestBody PasskeyAuthBeginRequest req) {
        User user = userRepository.findByEmail(req.email().toLowerCase().trim())
                .orElseThrow(() -> ApiException.unauthorized("No passkey is registered for that account."));
        List<WebAuthnCredential> creds = webAuthn.list(user.getId());
        if (creds.isEmpty()) {
            throw ApiException.unauthorized("No passkey is registered for that account.");
        }
        WebAuthnChallenge c = webAuthn.begin(user.getId(), "AUTHENTICATE");
        return Map.of(
                "challenge", c.getChallenge(),
                "userId", user.getId(),
                "credentialIds", creds.stream().map(WebAuthnCredential::getCredentialId).toList()
        );
    }

    @PostMapping("/passkey/authenticate/finish")
    public Map<String, Object> finishAuthenticate(@Valid @RequestBody PasskeyAuthFinishRequest req) {
        WebAuthnCredential cred = webAuthn.finishAuthentication(req.userId(), req.credentialId(),
                req.signature());
        User user = userRepository.findById(cred.getUserId())
                .orElseThrow(() -> ApiException.unauthorized("Account not found."));
        eventService.record(user.getId(), "USER_LOGGED_IN_PASSKEY", user.getId(), "{}");
        String token = jwtUtil.generate(user.getId(), user.getEmail());
        return Map.of(
                "token", token,
                "user", Map.of("id", user.getId(), "email", user.getEmail(), "fullName", user.getFullName())
        );
    }

    /** Never expose the public key blob to the client list — only display metadata. */
    private static Map<String, Object> toPublic(WebAuthnCredential c) {
        return Map.of(
                "id", c.getId(),
                "label", c.getLabel(),
                "algorithm", c.getAlgorithm(),
                "createdAt", String.valueOf(c.getCreatedAt()),
                "lastUsedAt", String.valueOf(c.getLastUsedAt())
        );
    }
}
