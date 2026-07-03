package com.bcits.works;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;

import com.bcits.works.shared.dto.PasskeyAuthBeginRequest;
import com.bcits.works.shared.dto.PasskeyAuthFinishRequest;
import com.bcits.works.shared.dto.PasskeyRegisterRequest;
import jakarta.validation.Valid;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
 * <p>The {@code begin} responses carry the full {@code navigator.credentials} option shape (rp, user,
 * pubKeyCredParams, allowCredentials …) from {@link WebAuthnSettings}, which the frontend feeds
 * straight to {@code navigator.credentials.create()/get()}.
 *
 * RBAC is not needed here — every operation is intrinsically scoped to the acting user.
 */
@RestController
@RequestMapping("/api/v1/auth")
public class WebAuthnController {

    private static final long CEREMONY_TIMEOUT_MS = 300_000;

    private final WebAuthnService webAuthn;
    private final WebAuthnSettings settings;
    private final AuthenticatedUser authenticatedUser;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final EventService eventService;

    public WebAuthnController(WebAuthnService webAuthn, WebAuthnSettings settings,
                              AuthenticatedUser authenticatedUser, UserRepository userRepository,
                              JwtUtil jwtUtil, EventService eventService) {
        this.webAuthn = webAuthn;
        this.settings = settings;
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
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.unauthorized("Account not found."));
        WebAuthnChallenge c = webAuthn.begin(userId, "REGISTER");

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("challenge", c.getChallenge());
        resp.put("rp", Map.of("id", settings.getRpId(), "name", settings.getRpName()));
        resp.put("user", Map.of(
                "id", webAuthn.userHandle(userId),
                "name", user.getEmail() == null ? userId : user.getEmail(),
                "displayName", user.getFullName() == null ? userId : user.getFullName()));
        // ES256 (-7) and RS256 (-257) — the algorithms WebAuthnFido2Verifier records.
        resp.put("pubKeyCredParams", List.of(
                Map.of("type", "public-key", "alg", -7),
                Map.of("type", "public-key", "alg", -257)));
        resp.put("timeout", CEREMONY_TIMEOUT_MS);
        resp.put("attestation", "none");
        resp.put("authenticatorSelection", Map.of(
                "residentKey", "preferred",
                "userVerification", userVerification()));
        resp.put("excludeCredentials", webAuthn.list(userId).stream()
                .map(WebAuthnController::credentialDescriptor).toList());
        // Legacy software-authenticator frontend fields (ignored by the FIDO2 frontend):
        resp.put("rpId", settings.getRpId());
        resp.put("userId", userId);
        return resp;
    }

    @PostMapping("/passkeys/register/finish")
    public Map<String, Object> finishRegister(@Valid @RequestBody PasskeyRegisterRequest req) {
        WebAuthnCredential cred = webAuthn.finishRegistration(authenticatedUser.id(), req);
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

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("challenge", c.getChallenge());
        resp.put("rpId", settings.getRpId());
        resp.put("userId", user.getId());
        resp.put("allowCredentials", creds.stream().map(WebAuthnController::credentialDescriptor).toList());
        resp.put("userVerification", userVerification());
        resp.put("timeout", CEREMONY_TIMEOUT_MS);
        // Legacy software-authenticator frontend field:
        resp.put("credentialIds", creds.stream().map(WebAuthnCredential::getCredentialId).toList());
        return resp;
    }

    @PostMapping("/passkey/authenticate/finish")
    public Map<String, Object> finishAuthenticate(@Valid @RequestBody PasskeyAuthFinishRequest req) {
        WebAuthnCredential cred = webAuthn.finishAuthentication(req);
        User user = userRepository.findById(cred.getUserId())
                .orElseThrow(() -> ApiException.unauthorized("Account not found."));
        eventService.record(user.getId(), "USER_LOGGED_IN_PASSKEY", user.getId(), "{}");
        String token = jwtUtil.generate(user.getId(), user.getEmail());
        return Map.of(
                "token", token,
                "user", Map.of("id", user.getId(), "email", user.getEmail(), "fullName", user.getFullName())
        );
    }

    private String userVerification() {
        return settings.isUserVerificationRequired() ? "required" : "preferred";
    }

    /** A {@code PublicKeyCredentialDescriptor} for the browser allow/exclude lists. */
    private static Map<String, Object> credentialDescriptor(WebAuthnCredential c) {
        return Map.of("type", "public-key", "id", c.getCredentialId());
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
