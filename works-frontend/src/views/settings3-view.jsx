import StatusManagementTab from '@/components/works/organisms/status-management-tab';
import FieldConfigEditor from '@/components/works/organisms/field-config-editor';
import WorkflowSettings from './settings3/workflow-settings';
import { CustomFieldsSettings, FieldLayoutSettings, FieldVisibilitySettings } from './settings3/field-settings';
import PermissionsSettings from './settings3/permissions-settings';
import ItemTypeSettings from './settings3/item-type-settings';
import TypeFieldsSettings from './settings3/type-fields-settings';

const SUB_TABS = [
  { key: 'workflows',   label: 'Workflows' },
  { key: 'statuses',    label: 'Status Management' },
  { key: 'fields',      label: 'Custom Fields' },
  { key: 'layout',      label: 'Field Layout' },
  { key: 'visibility',  label: 'Field Visibility' },
  { key: 'permissions', label: 'Permissions' },
  { key: 'types',       label: 'Item Types' },
  { key: 'type-fields', label: 'Fields' },
  { key: 'detail-fields', label: 'Detail Fields' },
];

/**
 * Settings3View — workspace configuration: workflows, custom fields, field layout,
 * field visibility, permissions matrix, and work item types.
 *
 * Thin tab router: renders the heading + sub-tab strip and dispatches the active
 * tab to its per-domain panel (views/settings3/*). All state lives in App; this
 * component is a pure rendering shell that accepts handlers as props and passes
 * the relevant subset to each panel.
 *
 * Extracted from App.jsx (TD-003).
 */
export default function Settings3View({
  settings3Tab,
  fieldPrefs,
  customFieldDefs,
  onSaveFieldPrefs,
  workflows,
  expandedWorkflowId,
  workflowDetail,
  newStatusForm,
  newTransitionForm,
  fieldDefs,
  showFieldForm,
  newFieldForm,
  fieldLayouts,
  fieldVisibility,
  newFieldVisForm,
  roles,
  permMatrix,
  showRoleForm,
  newRoleForm,
  workItemTypes,
  showTypeForm,
  newTypeForm,
  activeWorkspaceId,
  setSettings3Tab,
  setExpandedWorkflowId,
  setNewStatusForm,
  setNewTransitionForm,
  setShowFieldForm,
  setNewFieldForm,
  setNewFieldVisForm,
  setShowRoleForm,
  setNewRoleForm,
  setShowTypeForm,
  setNewTypeForm,
  fetchWorkflows,
  fetchFieldDefs,
  fetchFieldLayouts,
  fetchRoles,
  fetchFieldVisibility,
  fetchPermMatrix,
  fetchWorkItemTypes,
  expandWorkflow,
  addStatus,
  deleteStatus,
  addTransition,
  deleteTransition,
  createFieldDef,
  saveFieldVisibility,
  togglePermission,
  createRole,
  createWorkItemType,
  reportError,
  showToast,
  api,
}) {
  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-brand-navy dark:text-white mb-1">Workflows &amp; Fields</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-5">Configure workflows, custom fields, permissions, and work item types</p>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 border-b border-neutral-200 dark:border-neutral-700">
        {SUB_TABS.map(t => (
          <button key={t.key} onClick={() => {
            setSettings3Tab(t.key);
            if (t.key === 'permissions') fetchPermMatrix();
            if (t.key === 'layout') { fetchFieldDefs(); fetchFieldLayouts(); }
            if (t.key === 'visibility') { fetchFieldDefs(); fetchRoles(); fetchFieldVisibility(); }
          }}
            className={`text-sm font-medium px-4 py-2 border-b-2 transition-colors ${settings3Tab === t.key ? 'border-brand-navy text-brand-navy' : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* STATUS MANAGEMENT TAB */}
      {settings3Tab === 'statuses' && (
        <StatusManagementTab api={api} workspaceId={activeWorkspaceId} showToast={showToast} reportError={reportError} />
      )}

      {/* DETAIL FIELDS TAB — per-type visibility + order on the work item detail surface */}
      {settings3Tab === 'detail-fields' && (
        <FieldConfigEditor fieldPrefs={fieldPrefs} customFieldDefs={customFieldDefs || []} onSave={onSaveFieldPrefs} />
      )}

      {/* WORKFLOWS TAB */}
      {settings3Tab === 'workflows' && (
        <WorkflowSettings
          workflows={workflows}
          expandedWorkflowId={expandedWorkflowId}
          workflowDetail={workflowDetail}
          newStatusForm={newStatusForm}
          newTransitionForm={newTransitionForm}
          activeWorkspaceId={activeWorkspaceId}
          setExpandedWorkflowId={setExpandedWorkflowId}
          setNewStatusForm={setNewStatusForm}
          setNewTransitionForm={setNewTransitionForm}
          fetchWorkflows={fetchWorkflows}
          expandWorkflow={expandWorkflow}
          addStatus={addStatus}
          deleteStatus={deleteStatus}
          addTransition={addTransition}
          deleteTransition={deleteTransition}
          api={api}
        />
      )}

      {/* CUSTOM FIELDS TAB */}
      {settings3Tab === 'fields' && (
        <CustomFieldsSettings
          fieldDefs={fieldDefs}
          showFieldForm={showFieldForm}
          newFieldForm={newFieldForm}
          setShowFieldForm={setShowFieldForm}
          setNewFieldForm={setNewFieldForm}
          createFieldDef={createFieldDef}
          fetchFieldDefs={fetchFieldDefs}
          api={api}
        />
      )}

      {/* FIELD LAYOUT TAB */}
      {settings3Tab === 'layout' && (
        <FieldLayoutSettings
          fieldDefs={fieldDefs}
          fieldLayouts={fieldLayouts}
          activeWorkspaceId={activeWorkspaceId}
          fetchFieldLayouts={fetchFieldLayouts}
          showToast={showToast}
          api={api}
        />
      )}

      {/* FIELD VISIBILITY TAB */}
      {settings3Tab === 'visibility' && (
        <FieldVisibilitySettings
          fieldDefs={fieldDefs}
          fieldVisibility={fieldVisibility}
          newFieldVisForm={newFieldVisForm}
          roles={roles}
          setNewFieldVisForm={setNewFieldVisForm}
          saveFieldVisibility={saveFieldVisibility}
          fetchFieldVisibility={fetchFieldVisibility}
          showToast={showToast}
          reportError={reportError}
          api={api}
        />
      )}

      {/* PERMISSIONS MATRIX TAB */}
      {settings3Tab === 'permissions' && (
        <PermissionsSettings
          permMatrix={permMatrix}
          showRoleForm={showRoleForm}
          newRoleForm={newRoleForm}
          setShowRoleForm={setShowRoleForm}
          setNewRoleForm={setNewRoleForm}
          togglePermission={togglePermission}
          createRole={createRole}
        />
      )}

      {/* TYPE FIELDS TAB */}
      {settings3Tab === 'type-fields' && (
        <TypeFieldsSettings />
      )}

      {/* ITEM TYPES TAB */}
      {settings3Tab === 'types' && (
        <ItemTypeSettings
          workItemTypes={workItemTypes}
          showTypeForm={showTypeForm}
          newTypeForm={newTypeForm}
          setShowTypeForm={setShowTypeForm}
          setNewTypeForm={setNewTypeForm}
          createWorkItemType={createWorkItemType}
          fetchWorkItemTypes={fetchWorkItemTypes}
          api={api}
        />
      )}
    </div>
  );
}
