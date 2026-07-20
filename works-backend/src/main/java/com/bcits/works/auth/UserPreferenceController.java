package com.bcits.works.auth;

import com.bcits.works.shared.AuthenticatedUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.time.OffsetDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users/me/preferences")
public class UserPreferenceController {

    private final UserPreferenceRepository repository;
    private final AuthenticatedUser authenticatedUser;

    public UserPreferenceController(UserPreferenceRepository repository, AuthenticatedUser authenticatedUser) {
        this.repository = repository;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public UserPreference getPreferences() {
        return repository.findByUserId(authenticatedUser.id()).orElseGet(() -> {
            UserPreference p = new UserPreference();
            p.setId("PREF-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            p.setUserId(authenticatedUser.id());
            p.setTheme("system");
            p.setNotificationsEnabled(true);
            p.setLocale("en");
            p.setTimezone("UTC");
            p.setCreatedAt(OffsetDateTime.now());
            p.setUpdatedAt(OffsetDateTime.now());
            return repository.save(p);
        });
    }

    @PutMapping
    public UserPreference updatePreferences(@RequestBody UserPreference updated) {
        UserPreference p = getPreferences();
        if (updated.getTheme() != null) p.setTheme(updated.getTheme());
        p.setNotificationsEnabled(updated.isNotificationsEnabled());
        if (updated.getLocale() != null) p.setLocale(updated.getLocale());
        if (updated.getTimezone() != null) p.setTimezone(updated.getTimezone());
        p.setUpdatedAt(OffsetDateTime.now());
        return repository.save(p);
    }
}
