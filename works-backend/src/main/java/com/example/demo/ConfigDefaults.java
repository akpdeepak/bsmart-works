package com.example.demo;

/**
 * The system-default configuration document (iteration 17, Cap R). A workspace with no
 * {@link WorkspaceConfig} row inherits this — opinionated defaults that work for the 80% out of the
 * box (RB-20 §3), here tuned for the Indian DISCOM context (en-IN, Asia/Kolkata, Mon–Fri 9–18).
 * Branding uses design-token names, never hex (RB-30 §1). The five document sections — settings,
 * forms, pages, extensions, locks — are the full surface that customization can touch.
 */
final class ConfigDefaults {

    private ConfigDefaults() { }

    static final String DOCUMENT = """
        {
          "settings": {
            "branding": {
              "appName": "bSmart Works",
              "primaryColor": "brand-navy",
              "accentColor": "brand-orange",
              "logoUrl": ""
            },
            "locale": "en-IN",
            "timezone": "Asia/Kolkata",
            "workingCalendar": {
              "workdays": ["MON", "TUE", "WED", "THU", "FRI"],
              "startHour": 9,
              "endHour": 18,
              "holidays": []
            },
            "defaults": {
              "workItemType": "TASK",
              "priority": "MEDIUM",
              "estimateUnit": "POINTS"
            }
          },
          "forms": [],
          "pages": [],
          "extensions": [],
          "locks": []
        }""";
}
