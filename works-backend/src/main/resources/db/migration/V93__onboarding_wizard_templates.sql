-- V93: seed four global (owner_workspace_id = NULL) onboarding config templates for the
-- first-run wizard (WI-12). Each sets workspace defaults for a common workflow style.
-- Shareable = TRUE so every workspace's template library shows them.
-- Forward-only; idempotent ON CONFLICT (id) DO NOTHING.

INSERT INTO config_templates (id, owner_workspace_id, name, description, shareable, document, created_by)
VALUES

('TPL-ONBOARD-SCRUM',
 NULL,
 'Scrum',
 'Sprint-based agile delivery — backlog, sprints, stories and story-point estimates.',
 TRUE,
 '{
   "settings": {
     "branding": {"appName": "bSmart Works", "primaryColor": "brand-navy", "accentColor": "brand-orange", "logoUrl": ""},
     "locale": "en",
     "timezone": "UTC",
     "workingCalendar": {"workdays": ["MON","TUE","WED","THU","FRI"], "startHour": 9, "endHour": 18, "holidays": []},
     "defaults": {"workItemType": "STORY", "priority": "MEDIUM", "estimateUnit": "POINTS"}
   },
   "forms": [], "pages": [], "extensions": [], "locks": []
 }'::jsonb,
 'system'),

('TPL-ONBOARD-KANBAN',
 NULL,
 'Kanban',
 'Continuous-flow delivery — cards move through columns at their own pace, no sprints.',
 TRUE,
 '{
   "settings": {
     "branding": {"appName": "bSmart Works", "primaryColor": "brand-navy", "accentColor": "brand-orange", "logoUrl": ""},
     "locale": "en",
     "timezone": "UTC",
     "workingCalendar": {"workdays": ["MON","TUE","WED","THU","FRI"], "startHour": 9, "endHour": 18, "holidays": []},
     "defaults": {"workItemType": "TASK", "priority": "MEDIUM", "estimateUnit": "HOURS"}
   },
   "forms": [], "pages": [], "extensions": [], "locks": []
 }'::jsonb,
 'system'),

('TPL-ONBOARD-BUG',
 NULL,
 'Bug tracking',
 'Defect-lifecycle workflow — triage, reproduce, fix and verify bugs end to end.',
 TRUE,
 '{
   "settings": {
     "branding": {"appName": "bSmart Works", "primaryColor": "brand-navy", "accentColor": "brand-orange", "logoUrl": ""},
     "locale": "en",
     "timezone": "UTC",
     "workingCalendar": {"workdays": ["MON","TUE","WED","THU","FRI"], "startHour": 9, "endHour": 18, "holidays": []},
     "defaults": {"workItemType": "BUG", "priority": "HIGH", "estimateUnit": "HOURS"}
   },
   "forms": [], "pages": [], "extensions": [], "locks": []
 }'::jsonb,
 'system'),

('TPL-ONBOARD-RAID',
 NULL,
 'RAID log',
 'Risk, assumption, issue and dependency tracking — the PM toolkit for project governance.',
 TRUE,
 '{
   "settings": {
     "branding": {"appName": "bSmart Works", "primaryColor": "brand-navy", "accentColor": "brand-orange", "logoUrl": ""},
     "locale": "en",
     "timezone": "UTC",
     "workingCalendar": {"workdays": ["MON","TUE","WED","THU","FRI"], "startHour": 9, "endHour": 18, "holidays": []},
     "defaults": {"workItemType": "RISK", "priority": "MEDIUM", "estimateUnit": "HOURS"}
   },
   "forms": [], "pages": [], "extensions": [], "locks": []
 }'::jsonb,
 'system')

ON CONFLICT (id) DO NOTHING;
