// Per-type detail fields, as DATA (was hardcoded JSX in the detail panel). Drives the dynamic
// type-specific section so fields can be shown/hidden and reordered per type (type_field_prefs).
//
// kind: 'select' (needs options) | 'text' | 'textarea' (rows) | 'date' | 'user' | 'readonly'.

const SEV = ['Critical', 'High', 'Medium', 'Low'];
const HML = ['High', 'Medium', 'Low'];

export const TYPE_DETAIL_FIELDS = {
  BUG: [
    { key: 'severity',          label: 'Severity',          kind: 'select', options: SEV },
    { key: 'environmentDetail', label: 'Environment',       kind: 'select', options: ['Development', 'Staging', 'UAT', 'Production'] },
    { key: 'regressionRisk',    label: 'Regression Risk',   kind: 'select', options: ['Yes', 'No', 'Not Assessed'] },
    { key: 'stepsToReproduce',  label: 'Steps to Reproduce', kind: 'textarea', rows: 3 },
    { key: 'expectedBehavior',  label: 'Expected Behavior', kind: 'textarea' },
    { key: 'actualBehavior',    label: 'Actual Behavior',   kind: 'textarea' },
    { key: 'affectedVersion',   label: 'Affected Version',  kind: 'text' },
    { key: 'fixedInVersion',    label: 'Fixed In Version',  kind: 'text' },
  ],
  RISK: [
    { key: 'probability',     label: 'Probability',      kind: 'select', options: HML },
    { key: 'impactLevel',     label: 'Impact Level',     kind: 'select', options: HML },
    { key: 'riskScore',       label: 'Risk Score',       kind: 'readonly' },
    { key: 'mitigationPlan',  label: 'Mitigation Plan',  kind: 'textarea', rows: 3 },
    { key: 'contingencyPlan', label: 'Contingency Plan', kind: 'textarea' },
  ],
  ISSUE: [
    { key: 'impactLevel',       label: 'Impact Level',       kind: 'select', options: HML },
    { key: 'rootCause',         label: 'Root Cause',         kind: 'textarea', rows: 3 },
    { key: 'resolutionSummary', label: 'Resolution Summary', kind: 'textarea' },
  ],
  ASSUMPTION: [
    { key: 'basisRationale',  label: 'Basis / Rationale', kind: 'textarea', rows: 3 },
    { key: 'validationDate',  label: 'Validation Date',   kind: 'date' },
    { key: 'riskIfWrong',     label: 'Risk if Wrong',     kind: 'textarea' },
  ],
  DEPENDENCY: [
    { key: 'dependencyType',         label: 'Dependency Type',     kind: 'select', options: ['Internal', 'External'] },
    { key: 'expectedResolutionDate', label: 'Expected Resolution', kind: 'date' },
    { key: 'impactIfDelayed',        label: 'Impact if Delayed',   kind: 'textarea' },
  ],
  INCIDENT: [
    { key: 'responseSpeed',     label: 'Response Speed',     kind: 'select', options: ['Immediate', 'High', 'Normal', 'Planned'] },
    { key: 'businessImpact',    label: 'Business Impact',    kind: 'select', options: ['Organisation-wide', 'Department', 'Team', 'Individual'] },
    { key: 'severity',          label: 'Severity',           kind: 'select', options: SEV },
    { key: 'itemCategory',      label: 'Affected Area',      kind: 'text', placeholder: 'e.g. Billing, Field Ops' },
    { key: 'affectedSystem',    label: 'Affected System',    kind: 'text' },
    { key: 'respondingTeam',    label: 'Responding Team',    kind: 'text' },
    { key: 'rootCause',         label: 'Root Cause',         kind: 'textarea', rows: 3 },
    { key: 'resolutionSummary', label: 'Resolution Summary', kind: 'textarea' },
  ],
  HR_SERVICE_REQUEST: [
    { key: 'requestedForId',        label: 'Requested For',        kind: 'user' },
    { key: 'approverId',            label: 'Approver',             kind: 'user' },
    { key: 'department',            label: 'Department',           kind: 'text' },
    { key: 'itemCategory',          label: 'Category',             kind: 'text', placeholder: 'e.g. Access Request' },
    { key: 'neededByDate',          label: 'Needed By',            kind: 'date' },
    { key: 'businessJustification', label: 'Business Justification', kind: 'textarea' },
  ],
  IT_SERVICE_REQUEST: [
    { key: 'requestedForId',        label: 'Requested For',        kind: 'user' },
    { key: 'approverId',            label: 'Approver',             kind: 'user' },
    { key: 'affectedSystem',        label: 'Affected System',      kind: 'text' },
    { key: 'itemCategory',          label: 'Category',             kind: 'text', placeholder: 'e.g. Access Request' },
    { key: 'neededByDate',          label: 'Needed By',            kind: 'date' },
    { key: 'businessJustification', label: 'Business Justification', kind: 'textarea' },
  ],
};

export const SECTION_LABELS = {
  BUG: 'Bug Details', RISK: 'Risk Details', ISSUE: 'Issue Details',
  ASSUMPTION: 'Assumption Details', DEPENDENCY: 'Dependency Details',
  INCIDENT: 'Incident Details', HR_SERVICE_REQUEST: 'HR Service Request Details',
  IT_SERVICE_REQUEST: 'IT Service Request Details',
};

/** Descriptors for a type (empty if the type has no type-specific fields). */
export function detailFieldsFor(typeKey) {
  return TYPE_DETAIL_FIELDS[(typeKey || '').toUpperCase()] || [];
}

/**
 * Order a list of {key,...} field descriptors by the saved sort_order in prefs (a Map of
 * fieldKey → {sortOrder}). Fields with a saved order come first (ascending); the rest keep their
 * registry order after them.
 */
export function orderByPrefs(fields, prefsMap) {
  if (!prefsMap || prefsMap.size === 0) return fields;
  const withIdx = fields.map((f, i) => {
    const p = prefsMap.get(f.key);
    return { f, i, ord: p && p.sortOrder != null ? p.sortOrder : null };
  });
  withIdx.sort((a, b) => {
    if (a.ord == null && b.ord == null) return a.i - b.i;
    if (a.ord == null) return 1;
    if (b.ord == null) return -1;
    return a.ord - b.ord || a.i - b.i;
  });
  return withIdx.map((x) => x.f);
}
