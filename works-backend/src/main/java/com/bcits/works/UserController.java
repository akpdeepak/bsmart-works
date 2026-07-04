package com.bcits.works;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    // Iteration 20 (Cap A — localization): the shipped UI languages. The canonical list lives in
    // SupportedLocales (ONE Source); kept here as an alias for call sites and tests. The server
    // validates the preference so a stored locale always maps to a bundle the frontend can load.
    static final Set<String> SUPPORTED_LOCALES = SupportedLocales.CODES;

    private final UserRepository userRepository;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public UserController(UserRepository userRepository, AuthenticatedUser authenticatedUser, RbacService rbac) {
        this.userRepository = userRepository;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    /** Returns only users who are members of the given workspace (RB-40 §1). */
    @GetMapping
    public List<Map<String, String>> getAllUsers(@RequestParam String workspaceId) {
        String callerId = authenticatedUser.id();
        // 404 hides both missing workspace and membership check failure (RB-40 §1)
        if (rbac.getUserTier(callerId, workspaceId) < 1) {
            throw ApiException.notFound("Workspace", workspaceId);
        }
        return userRepository.findByWorkspaceId(workspaceId).stream().map(u -> Map.of(
                "id", u.getId(),
                "fullName", u.getFullName(),
                "email", u.getEmail()
        )).collect(Collectors.toList());
    }

    @GetMapping("/me")
    public Map<String, String> getCurrentUser() {
        String userId = authenticatedUser.id();
        final String uid = userId;
        return userRepository.findById(uid).map(u -> Map.of(
                "id", u.getId(), "fullName", u.getFullName(), "email", u.getEmail(),
                "locale", u.getLocale()
        )).orElse(Map.of("id", uid, "fullName", "Unknown", "email", "", "locale", SupportedLocales.DEFAULT));
    }

    public record LocaleRequest(String locale) { }

    /** Set the current user's preferred UI language (self-service; no RBAC beyond authentication). */
    @PutMapping("/me/locale")
    public Map<String, String> setLocale(@Valid @RequestBody LocaleRequest req) {
        String uid = authenticatedUser.id();
        String locale = req.locale() == null ? "" : req.locale().trim().toLowerCase();
        if (!SUPPORTED_LOCALES.contains(locale)) {
            throw ApiException.badRequest("UNSUPPORTED_LOCALE",
                "Locale must be one of: " + String.join(", ", SUPPORTED_LOCALES.stream().sorted().toList()));
        }
        User u = userRepository.findById(uid)
            .orElseThrow(() -> ApiException.notFound("User", uid));
        u.setLocale(locale);
        userRepository.save(u);
        return Map.of("id", u.getId(), "locale", u.getLocale());
    }
}
