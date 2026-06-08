package com.bcits.works;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    // Iteration 20 (Cap A — localization): the 10 shipped UI languages. The server validates the
    // preference so a stored locale always maps to a bundle the frontend can load.
    static final Set<String> SUPPORTED_LOCALES =
        Set.of("en", "hi", "es", "fr", "de", "pt", "ja", "zh", "ar", "ko");

    private final UserRepository userRepository;
    private final AuthenticatedUser authenticatedUser;

    public UserController(UserRepository userRepository, AuthenticatedUser authenticatedUser) {
        this.userRepository = userRepository;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<Map<String, String>> getAllUsers() {
        return userRepository.findAll().stream().map(u -> Map.of(
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
        )).orElse(Map.of("id", uid, "fullName", "Unknown", "email", "", "locale", "en"));
    }

    public record LocaleRequest(String locale) { }

    /** Set the current user's preferred UI language (self-service; no RBAC beyond authentication). */
    @PutMapping("/me/locale")
    public Map<String, String> setLocale(@RequestBody LocaleRequest req) {
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
