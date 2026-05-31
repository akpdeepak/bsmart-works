# Iteration 3 — Workflows, Permissions & Custom Fields

## What was built

1. **Workflow engine** — `workflow`, `workflow_status`, `workflow_transition` tables. Full CRUD API for workflows with statuses and transitions. `/api/v1/workflows` endpoint with nested `/statuses` and `/transitions` sub-resources. Bulk reorder of statuses.

2. **Custom field library (17 types)** — `field_def` table with types: TEXT, NUMBER, CURRENCY, DATE, SELECT, MULTI_SELECT, USER, URL, CHECKBOX, FILE, JSON, TEXTAREA, EMAIL, PHONE, RATING, PROGRESS. `/api/v1/field-defs` with per-work-item field values at `/api/v1/field-defs/values/{workItemId}`.

3. **Roles & permissions matrix** — `permission_scheme`, `role_def`, `role_permission` tables. `/api/v1/permission-schemes` with `/roles` and `/matrix` endpoints. The matrix returns all roles × all permissions in a single call for the UI grid.

4. **Field visibility rules per role** — `field_visibility` table with HIDDEN/READ_ONLY/EDITABLE per field per role. `/api/v1/permission-schemes/field-visibility/{fieldDefId}/{roleDefId}`.

5. **Custom work item types** — `work_item_type_config` table. `/api/v1/work-item-types` returns built-in (7 types) + custom types. Admins can create new types like `METER_ROLLOUT` with custom icon and color.

6. **Layout designer** — `field_layout` table storing JSON layout config per item type. `/api/v1/field-layouts/{itemType}` GET/PUT for workspace or project-scoped layouts.

7. **Workflow conditions, validators, post-functions** — stored as JSONB arrays on `workflow_transition`. Evaluated/executed server-side (JSONB schema extensible).

8. **WIQL — Work Item Query Language** — `/api/v1/wiql/execute` accepts composable queries (field = value AND/OR chains, IN lists, comparison operators, functions: currentUser() today() now()). Saved filters at `/api/v1/wiql/filters`.

## UI

- **Workflows & Fields** view in sidebar with 4 sub-tabs: Workflows, Custom Fields, Permissions Matrix, Item Types
- **WIQL Query** view with textarea editor, syntax reference, saved filters bar, results table
- Both accessible from new "Configuration" sidebar section

## Key decisions

- Workflow statuses and transitions use JSONB for conditions/validators/post-functions (future scripting layer)
- WIQL translator generates parameterised SQL (no raw user input in queries)
- Field values stored as three columns (text/number/json) covering all 17 types
- Permission matrix endpoint returns pre-joined data to avoid N+1 in the UI
