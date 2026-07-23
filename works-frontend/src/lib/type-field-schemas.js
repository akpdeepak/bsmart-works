// Per-type field schemas for the work-item Create dialog.
// Each schema defines the fields shown during creation — essential fields only.
// Full field sets are available in the item detail view.

const PRIORITY_OPTIONS = [
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH',     label: 'High' },
  { value: 'MEDIUM',   label: 'Medium' },
  { value: 'LOW',      label: 'Low' },
];

const PROB_OPTIONS = [
  { value: 'HIGH',   label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW',    label: 'Low' },
];

const SEVERITY_OPTIONS = [
  { value: 'CRITICAL', label: 'P1 — Critical' },
  { value: 'HIGH',     label: 'P2 — High' },
  { value: 'MEDIUM',   label: 'P3 — Moderate' },
  { value: 'LOW',      label: 'P4 — Low' },
];

const ENV_OPTIONS = [
  { value: 'PRODUCTION',  label: 'Production' },
  { value: 'STAGING',     label: 'Staging' },
  { value: 'UAT',         label: 'UAT' },
  { value: 'DEVELOPMENT', label: 'Development' },
];

const RESPONSE_SPEED_OPTIONS = [
  { value: 'IMMEDIATE', label: 'Immediate' },
  { value: 'HIGH',      label: 'High' },
  { value: 'NORMAL',    label: 'Normal' },
  { value: 'PLANNED',   label: 'Planned' },
];

const BUSINESS_IMPACT_OPTIONS = [
  { value: 'ORGANIZATION', label: 'Organization-wide' },
  { value: 'DEPARTMENT',   label: 'Department' },
  { value: 'TEAM',         label: 'Team' },
  { value: 'INDIVIDUAL',   label: 'Individual' },
];

const AFFECTED_AREA_OPTIONS = [
  { value: 'APPLICATION',    label: 'Application' },
  { value: 'NETWORK',        label: 'Network' },
  { value: 'SECURITY',       label: 'Security' },
  { value: 'DATA',           label: 'Data' },
  { value: 'INFRASTRUCTURE', label: 'Infrastructure' },
  { value: 'OTHER',          label: 'Other' },
];

const HR_CATEGORY_OPTIONS = [
  { value: 'LEAVE',        label: 'Leave & Absence' },
  { value: 'ONBOARDING',   label: 'Onboarding & Offboarding' },
  { value: 'PAYROLL',      label: 'Payroll & Compensation' },
  { value: 'BENEFITS',     label: 'Benefits & Wellness' },
  { value: 'LEARNING',     label: 'Learning & Development' },
  { value: 'POLICY',       label: 'Policy & Compliance' },
  { value: 'OTHER',        label: 'Other' },
];

const IT_CATEGORY_OPTIONS = [
  { value: 'HARDWARE',       label: 'Hardware & Devices' },
  { value: 'SOFTWARE',       label: 'Software & Licenses' },
  { value: 'ACCESS',         label: 'Access & Permissions' },
  { value: 'NETWORK',        label: 'Network & Connectivity' },
  { value: 'ACCOUNT',        label: 'Account Management' },
  { value: 'CLOUD',          label: 'Cloud & Infrastructure' },
  { value: 'SECURITY',       label: 'Security' },
  { value: 'OTHER',          label: 'Other' },
];

const DEP_TYPE_OPTIONS = [
  { value: 'INTERNAL', label: 'Internal' },
  { value: 'EXTERNAL', label: 'External' },
];

const REG_RISK_OPTIONS = [
  { value: 'YES',           label: 'Yes' },
  { value: 'NO',            label: 'No' },
  { value: 'NOT_ASSESSED',  label: 'Not Assessed' },
];

// ── Schema map — key = type key ────────────────────────────────────────────────
// Field types: text | textarea | select | user | date | number | item-picker | tags

export const FIELD_SCHEMAS = {

  // ── DELIVERY ──────────────────────────────────────────────────────────────

  CAPABILITY: [
    { key: 'title',       label: 'Title',         type: 'text',   required: true },
    { key: 'assigneeId',  label: 'Owner',          type: 'user' },
    { key: 'priority',    label: 'Priority',       type: 'select', options: PRIORITY_OPTIONS },
    { key: 'description', label: 'Description',    type: 'textarea' },
    { key: 'tags',        label: 'Tags',           type: 'tags' },
  ],

  THEME: [
    { key: 'title',       label: 'Title',         type: 'text',        required: true },
    { key: 'assigneeId',  label: 'Owner',          type: 'user' },
    { key: 'priority',    label: 'Priority',       type: 'select',      options: PRIORITY_OPTIONS },
    { key: 'parentId',    label: 'Capability / Initiative', type: 'item-picker', validParents: ['CAPABILITY', 'INITIATIVE'] },
    { key: 'description', label: 'Description',    type: 'textarea' },
    { key: 'tags',        label: 'Tags',           type: 'tags' },
  ],

  INITIATIVE: [
    { key: 'title',       label: 'Title',         type: 'text',        required: true },
    { key: 'assigneeId',  label: 'Owner',          type: 'user',        required: true },
    { key: 'priority',    label: 'Priority',       type: 'select',      options: PRIORITY_OPTIONS, required: true },
    { key: 'parentId',    label: 'Parent',         type: 'item-picker', validParents: ['CAPABILITY', 'PRODUCT'] },
    { key: 'dueDate',     label: 'Target End',     type: 'date' },
    { key: 'description', label: 'Description',    type: 'textarea' },
    { key: 'tags',        label: 'Tags',           type: 'tags' },
  ],

  PRODUCT: [
    { key: 'title',       label: 'Title',         type: 'text',        required: true },
    { key: 'assigneeId',  label: 'Product Owner',  type: 'user',        required: true },
    { key: 'priority',    label: 'Priority',       type: 'select',      options: PRIORITY_OPTIONS },
    { key: 'parentId',    label: 'Capability',     type: 'item-picker', validParents: ['CAPABILITY'] },
    { key: 'description', label: 'Description',    type: 'textarea' },
    { key: 'tags',        label: 'Tags',           type: 'tags' },
  ],

  EPIC: [
    { key: 'title',             label: 'Title',       type: 'text',        required: true },
    { key: 'assigneeId',        label: 'Assignee',     type: 'user',        required: true },
    { key: 'priority',          label: 'Priority',     type: 'select',      options: PRIORITY_OPTIONS, required: true },
    { key: 'parentId',          label: 'Parent',       type: 'item-picker', validParents: ['INITIATIVE', 'THEME'] },
    { key: 'storyPoints',       label: 'Story Points', type: 'number' },
    { key: 'dueDate',           label: 'Due Date',     type: 'date' },
    { key: 'description',       label: 'Description',  type: 'textarea' },
    { key: 'acceptanceCriteria', label: 'Acceptance Criteria', type: 'textarea' },
    { key: 'tags',              label: 'Tags',         type: 'tags' },
  ],

  STORY: [
    { key: 'title',             label: 'Title',         type: 'text',        required: true },
    { key: 'assigneeId',        label: 'Assignee',       type: 'user',        required: true },
    { key: 'priority',          label: 'Priority',       type: 'select',      options: PRIORITY_OPTIONS, required: true },
    { key: 'parentId',          label: 'Epic',           type: 'item-picker', validParents: ['EPIC'], required: true },
    { key: 'storyPoints',       label: 'Story Points',   type: 'number' },
    { key: 'dueDate',           label: 'Due Date',       type: 'date' },
    { key: 'description',       label: 'Description',    type: 'textarea' },
    { key: 'acceptanceCriteria', label: 'Acceptance Criteria', type: 'textarea' },
    { key: 'tags',              label: 'Tags',           type: 'tags' },
  ],

  BUG: [
    { key: 'title',             label: 'Summary',           type: 'text',        required: true },
    { key: 'reporterId',        label: 'Found By',           type: 'user',        required: true },
    { key: 'severity',          label: 'Severity',           type: 'select',      options: SEVERITY_OPTIONS, required: true },
    { key: 'priority',          label: 'Priority',           type: 'select',      options: PRIORITY_OPTIONS, required: true },
    { key: 'environmentDetail', label: 'Environment',        type: 'select',      options: ENV_OPTIONS, required: true },
    { key: 'assigneeId',        label: 'Assignee',           type: 'user' },
    { key: 'parentId',          label: 'Related Story / Epic', type: 'item-picker', validParents: ['STORY', 'EPIC'] },
    { key: 'stepsToReproduce',  label: 'Steps to Reproduce', type: 'textarea' },
    { key: 'expectedBehavior',  label: 'Expected Behaviour', type: 'textarea' },
    { key: 'actualBehavior',    label: 'Actual Behaviour',   type: 'textarea' },
    { key: 'regressionRisk',    label: 'Regression Risk',    type: 'select',      options: REG_RISK_OPTIONS },
    { key: 'affectedVersion',   label: 'Affected Version',   type: 'text' },
    { key: 'tags',              label: 'Tags',               type: 'tags' },
  ],

  TASK: [
    { key: 'title',       label: 'Title',     type: 'text',   required: true },
    { key: 'assigneeId',  label: 'Assignee',   type: 'user',   required: true },
    { key: 'priority',    label: 'Priority',   type: 'select', options: PRIORITY_OPTIONS, required: true },
    { key: 'parentId',    label: 'Parent',     type: 'item-picker',
      validParents: ['EPIC', 'STORY', 'BUG',
                     'INCIDENT', 'HR_SERVICE_REQUEST', 'IT_SERVICE_REQUEST'] },
    { key: 'storyPoints', label: 'Estimate (hrs)', type: 'number' },
    { key: 'dueDate',     label: 'Due Date',   type: 'date' },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'tags',        label: 'Tags',       type: 'tags' },
  ],

  ACTIVITY: [
    { key: 'title',       label: 'Title',     type: 'text', required: true },
    { key: 'assigneeId',  label: 'Assignee',   type: 'user' },
    { key: 'parentId',    label: 'Parent',     type: 'item-picker', validParents: ['STORY', 'BUG', 'TASK'] },
    { key: 'dueDate',     label: 'Due Date',   type: 'date' },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'tags',        label: 'Tags',       type: 'tags' },
  ],

  // ── RAID ──────────────────────────────────────────────────────────────────

  RISK: [
    { key: 'title',           label: 'Title',          type: 'text',        required: true },
    { key: 'assigneeId',      label: 'Owner',           type: 'user',        required: true },
    { key: 'probability',     label: 'Probability',     type: 'select',      options: PROB_OPTIONS, required: true },
    { key: 'impactLevel',     label: 'Impact',          type: 'select',      options: PROB_OPTIONS, required: true },
    { key: 'dueDate',         label: 'Review By',       type: 'date' },
    { key: 'parentId',        label: 'Parent',          type: 'item-picker', validParents: null },
    { key: 'sourceItemId',    label: 'Relates To',      type: 'item-picker', validParents: null },
    { key: 'targetItemId',    label: 'Affects',         type: 'item-picker', validParents: null },
    { key: 'description',     label: 'Description',     type: 'textarea' },
    { key: 'mitigationPlan',  label: 'Mitigation Plan', type: 'textarea' },
    { key: 'tags',            label: 'Tags',            type: 'tags' },
  ],

  ISSUE: [
    { key: 'title',        label: 'Title',       type: 'text',        required: true },
    { key: 'assigneeId',   label: 'Owner',        type: 'user',        required: true },
    { key: 'priority',     label: 'Priority',     type: 'select',      options: PRIORITY_OPTIONS, required: true },
    { key: 'impactLevel',  label: 'Impact',       type: 'select',      options: PROB_OPTIONS },
    { key: 'dueDate',      label: 'Resolve By',   type: 'date' },
    { key: 'parentId',     label: 'Parent',       type: 'item-picker', validParents: null },
    { key: 'sourceItemId', label: 'Relates To',   type: 'item-picker', validParents: null },
    { key: 'targetItemId', label: 'Affects',      type: 'item-picker', validParents: null },
    { key: 'description',  label: 'Description',  type: 'textarea' },
    { key: 'rootCause',    label: 'Root Cause',   type: 'textarea' },
    { key: 'tags',         label: 'Tags',         type: 'tags' },
  ],

  ASSUMPTION: [
    { key: 'title',           label: 'Title',             type: 'text',        required: true },
    { key: 'assigneeId',      label: 'Owner',              type: 'user',        required: true },
    { key: 'validationDate',  label: 'Validate By',        type: 'date' },
    { key: 'parentId',        label: 'Parent',             type: 'item-picker', validParents: null },
    { key: 'sourceItemId',    label: 'Relates To',         type: 'item-picker', validParents: null },
    { key: 'targetItemId',    label: 'Affects',            type: 'item-picker', validParents: null },
    { key: 'basisRationale',  label: 'Basis / Rationale',  type: 'textarea',    required: true },
    { key: 'riskIfWrong',     label: 'Risk if Wrong',      type: 'textarea' },
    { key: 'tags',            label: 'Tags',               type: 'tags' },
  ],

  DEPENDENCY: [
    { key: 'title',                  label: 'Title',              type: 'text',        required: true },
    { key: 'assigneeId',             label: 'Owner',               type: 'user',        required: true },
    { key: 'dependencyType',         label: 'Type',                type: 'select',      options: DEP_TYPE_OPTIONS, required: true },
    { key: 'parentId',               label: 'Parent',              type: 'item-picker', validParents: null },
    { key: 'sourceItemId',           label: 'Relates To',          type: 'item-picker', validParents: null },
    { key: 'targetItemId',           label: 'Affects',             type: 'item-picker', validParents: null },
    { key: 'expectedResolutionDate', label: 'Expected Resolution', type: 'date' },
    { key: 'description',            label: 'Description',         type: 'textarea' },
    { key: 'impactIfDelayed',        label: 'Impact if Delayed',   type: 'textarea' },
    { key: 'tags',                   label: 'Tags',                type: 'tags' },
  ],

  // ── SERVICE ───────────────────────────────────────────────────────────────

  INCIDENT: [
    { key: 'title',           label: 'Title',               type: 'text',   required: true },
    { key: 'reporterId',      label: 'Reported By',          type: 'user',   required: true },
    { key: 'severity',        label: 'Severity',             type: 'select', options: SEVERITY_OPTIONS,       required: true },
    { key: 'itemCategory',    label: 'Affected Area',        type: 'select', options: AFFECTED_AREA_OPTIONS,  required: true },
    { key: 'businessImpact',  label: 'Business Impact',      type: 'select', options: BUSINESS_IMPACT_OPTIONS, required: true },
    { key: 'responseSpeed',   label: 'Response Speed',       type: 'select', options: RESPONSE_SPEED_OPTIONS },
    { key: 'respondingTeam',  label: 'Responding Team',      type: 'text' },
    { key: 'assigneeId',      label: 'Assignee',             type: 'user' },
    { key: 'affectedSystem',  label: 'Affected System',      type: 'text' },
    { key: 'subArea',         label: 'Sub-Area',             type: 'text' },
    { key: 'description',     label: 'Description',          type: 'textarea' },
    { key: 'tags',            label: 'Tags',                 type: 'tags' },
  ],

  HR_SERVICE_REQUEST: [
    { key: 'title',            label: 'What do you need?',  type: 'text',   required: true },
    { key: 'requestedForId',   label: 'Requested For',       type: 'user',   required: true },
    { key: 'itemCategory',     label: 'HR Category',         type: 'select', options: HR_CATEGORY_OPTIONS, required: true },
    { key: 'priority',         label: 'Priority',            type: 'select', options: PRIORITY_OPTIONS },
    { key: 'assigneeId',       label: 'Assigned HR Partner', type: 'user' },
    { key: 'approverId',       label: 'Approver',            type: 'user' },
    { key: 'neededByDate',     label: 'Needed By',           type: 'date' },
    { key: 'description',      label: 'Details',             type: 'textarea' },
    { key: 'tags',             label: 'Tags',                type: 'tags' },
  ],

  IT_SERVICE_REQUEST: [
    { key: 'title',               label: 'What do you need?',  type: 'text',   required: true },
    { key: 'requestedForId',      label: 'Requested For',       type: 'user',   required: true },
    { key: 'itemCategory',        label: 'IT Category',         type: 'select', options: IT_CATEGORY_OPTIONS, required: true },
    { key: 'priority',            label: 'Priority',            type: 'select', options: PRIORITY_OPTIONS },
    { key: 'affectedSystem',      label: 'Affected System / App', type: 'text' },
    { key: 'assigneeId',          label: 'Assigned IT Team',    type: 'user' },
    { key: 'approverId',          label: 'Approver',            type: 'user' },
    { key: 'neededByDate',        label: 'Needed By',           type: 'date' },
    { key: 'businessJustification', label: 'Business Justification', type: 'textarea' },
    { key: 'description',         label: 'Details',             type: 'textarea' },
    { key: 'tags',                label: 'Tags',                type: 'tags' },
  ],
};

/**
 * Returns the field list for a type — the baseline schema, augmented with `_system: true`.
 *
 * There is deliberately no client-side override layer here. Per-type field visibility and order are
 * workspace configuration owned by the server (`type_field_prefs`, edited in Settings → Detail
 * Fields). This function used to merge in a localStorage config that only a since-retired settings
 * tab could write, which meant an admin was told the change was saved to the workspace when it lived
 * in one browser profile. Any per-type customization added here must go through the server.
 */
export function getEffectiveSchema(typeKey) {
  return (FIELD_SCHEMAS[typeKey] ?? []).map(f => ({ ...f, _system: true }));
}

/** Default form values for a given type key. */
export function defaultFormData(typeKey) {
  const defaults = { priority: 'MEDIUM' };
  if (typeKey === 'RISK' || typeKey === 'ISSUE') {
    defaults.priority = 'MEDIUM';
    defaults.probability = 'MEDIUM';
    defaults.impactLevel = 'MEDIUM';
  }
  if (typeKey === 'INCIDENT') {
    defaults.responseSpeed = 'NORMAL';
    defaults.businessImpact = 'TEAM';
    defaults.severity = 'MEDIUM';
  }
  if (typeKey === 'HR_SERVICE_REQUEST' || typeKey === 'IT_SERVICE_REQUEST') {
    defaults.priority = 'NORMAL';
  }
  if (typeKey === 'DEPENDENCY') {
    defaults.dependencyType = 'INTERNAL';
  }
  if (typeKey === 'BUG') {
    defaults.severity = 'MEDIUM';
    defaults.regressionRisk = 'NOT_ASSESSED';
    defaults.environmentDetail = 'PRODUCTION';
  }
  return defaults;
}
