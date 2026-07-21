package com.bcits.works.auth;


import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests for the locale self-service endpoint (RB-40 Cap A): validates that only the
 * 10 supported locales are accepted and that an unknown user gets a 404.
 */
@Tag("unit")
class UserControllerLocaleTest {

    private static final String USER_ID = "user-1";

    private final UserRepository userRepository = mock(UserRepository.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);

    private final UserController controller = new UserController(userRepository, authenticatedUser, rbac);

    UserControllerLocaleTest() {
        when(authenticatedUser.id()).thenReturn(USER_ID);
    }

    @Test
    void setLocale_validLocale_savesAndReturnsLocale() {
        User u = user(USER_ID, "en");
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(u));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var result = controller.setLocale(new UserController.LocaleRequest("hi"));

        assertThat(result.get("locale")).isEqualTo("hi");
        verify(userRepository).save(u);
    }

    @Test
    void setLocale_unsupportedLocale_throwsBadRequest() {
        assertThatThrownBy(() -> controller.setLocale(new UserController.LocaleRequest("xx")))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus())
                        .isEqualTo(org.springframework.http.HttpStatus.BAD_REQUEST));

        verify(userRepository, never()).save(any());
    }

    @Test
    void setLocale_allSupportedLocales_accepted() {
        User u = user(USER_ID, "en");
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(u));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        for (String locale : UserController.SUPPORTED_LOCALES) {
            var result = controller.setLocale(new UserController.LocaleRequest(locale));
            assertThat(result.get("locale")).isEqualTo(locale);
        }
    }

    @Test
    void setLocale_unknownUser_throwsNotFound() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.setLocale(new UserController.LocaleRequest("fr")))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus())
                        .isEqualTo(org.springframework.http.HttpStatus.NOT_FOUND));
    }

    @Test
    void getCurrentUser_knownUser_returnsFields() {
        User u = user(USER_ID, "ja");
        u.setFullName("Deepak");
        u.setEmail("d@example.com");
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(u));

        var result = controller.getCurrentUser();

        assertThat(result.get("id")).isEqualTo(USER_ID);
        assertThat(result.get("locale")).isEqualTo("ja");
        assertThat(result.get("fullName")).isEqualTo("Deepak");
    }

    @Test
    void getCurrentUser_unknownUser_returnsDefaults() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.empty());

        var result = controller.getCurrentUser();

        assertThat(result.get("id")).isEqualTo(USER_ID);
        assertThat(result.get("locale")).isEqualTo("en");
        assertThat(result.get("fullName")).isEqualTo("Unknown");
    }

    private User user(String id, String locale) {
        User u = new User();
        u.setId(id);
        u.setLocale(locale);
        return u;
    }
}
