// useCustomFieldsState.js — custom field definitions, values, layouts and visibility (GH-537)
// Extracted from AppShell as part of the EPIC-03 Phase 2 / W2 feature-state decomposition.
// Owns: field definitions and the create-field form, per-item field values, detail-surface layouts,
// per-role field visibility (RB-40 §1 field-level security is enforced server-side; this is the
// admin surface that configures it), and per-type field preferences.
import { useState, useMemo } from 'react';
import { buildFieldPrefsResolver, saveTypeFieldPrefs } from '@/lib/type-field-prefs';

const EMPTY_FIELD_FORM = { name: '', fieldType: 'TEXT', required: false, description: '' };
const EMPTY_FIELD_VIS_FORM = { fieldDefId: '', roleId: '', visibility: 'EDITABLE' };

/**
 * @param {Object}   api
 * @param {string}   activeWorkspaceId
 * @param {Function} showToast
 * @param {Function} reportError
 */
export function useCustomFieldsState(api, activeWorkspaceId, showToast, reportError) {
  const [fieldDefs, setFieldDefs] = useState([]);
  const [customFieldDefs, setCustomFieldDefs] = useState([]);
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [newFieldForm, setNewFieldForm] = useState(EMPTY_FIELD_FORM);
  const [fieldValues, setFieldValues] = useState({});
  const [fieldLayouts, setFieldLayouts] = useState([]);
  const [fieldVisibility, setFieldVisibility] = useState([]);
  const [newFieldVisForm, setNewFieldVisForm] = useState(EMPTY_FIELD_VIS_FORM);
  // Per-type field preferences — which fields show on the detail surface, per work-item type.
  const [typeFieldPrefs, setTypeFieldPrefs] = useState([]);
  const fieldPrefs = useMemo(() => buildFieldPrefsResolver(typeFieldPrefs), [typeFieldPrefs]);

  function fetchFieldDefs(projectId) {
    const q = projectId ? `?projectId=${projectId}` : '';
    api.send(`/field-defs${q}`)
      .then(d => setFieldDefs(Array.isArray(d) ? d : [])).catch(reportError);
  }

  function createFieldDef() {
    if (!newFieldForm.name.trim()) return;
    api.send(`/field-defs`, { method: 'POST', body: JSON.stringify({ ...newFieldForm, fieldKey: newFieldForm.name.toLowerCase().replace(/\s+/g, '_'), workspaceId: activeWorkspaceId }) })
      .then(() => { fetchFieldDefs(); setShowFieldForm(false); setNewFieldForm(EMPTY_FIELD_FORM); }).catch(reportError);
  }

  function fetchFieldValues(workItemId) {
    api.send(`/field-defs/values/${workItemId}`)
      .then(d => {
        const map = {};
        (Array.isArray(d) ? d : []).forEach(fv => { map[fv.fieldDefId] = fv.valueText ?? fv.valueNumber ?? fv.valueJson ?? ''; });
        setFieldValues(map);
      }).catch(reportError);
  }

  function saveFieldValue(workItemId, fieldDefId, value) {
    api.send(`/field-defs/values/${workItemId}/${fieldDefId}`, {
      method: 'PUT', body: JSON.stringify({ valueText: value })
    }).catch(reportError);
  }

  function fetchFieldLayouts() {
    api.send(`/field-layouts?workspaceId=${encodeURIComponent(activeWorkspaceId)}`)
      
      .then(d => {
        const arr = Array.isArray(d) ? d : [];
        setFieldLayouts(arr.map(fl => ({ ...fl, layout: fl.layoutJson || fl.layout })));
      })
      .catch(reportError);
  }

  function fetchFieldVisibility() {
    Promise.all((fieldDefs || []).map(fd =>
      api.send(`/permission-schemes/field-visibility/${fd.id}`)
        
        .then(rows => (Array.isArray(rows) ? rows : []).map(row => ({ ...row, roleId: row.roleId || row.roleDefId })))
    ))
      .then(groups => setFieldVisibility(groups.flat()))
      .catch(reportError);
  }

  function saveFieldVisibility() {
    if (!newFieldVisForm.fieldDefId || !newFieldVisForm.roleId) { showToast('Select field and role', 'error'); return; }
    api.send(`/permission-schemes/field-visibility/${newFieldVisForm.fieldDefId}/${newFieldVisForm.roleId}`, {
      method: 'PUT', body: JSON.stringify({ visibility: newFieldVisForm.visibility })
    })
      .then(() => { showToast('Visibility saved'); fetchFieldVisibility(); setNewFieldVisForm(EMPTY_FIELD_VIS_FORM); })
      .catch(() => showToast('Failed to save visibility', 'error'));
  }

  // Toggle a field's visibility for a type (bulk-replaces that type's prefs server-side).
  const handleToggleFieldPref = (typeKey, fieldKey, visible) => {
    const forType = typeFieldPrefs
      .filter(p => p.typeKey === typeKey && p.fieldKey !== fieldKey)
      .map(p => ({ fieldKey: p.fieldKey, visible: p.visible, sortOrder: p.sortOrder }));
    const next = [...forType, { fieldKey, visible }];
    saveTypeFieldPrefs(api, activeWorkspaceId, typeKey, next)
      .then(updated => setTypeFieldPrefs(Array.isArray(updated) ? updated : []))
      .catch(reportError);
  };

  // Bulk-replace a type's field prefs (visibility + order) — used by the Settings field editor.
  const handleSaveFieldPrefs = (typeKey, prefList) =>
    saveTypeFieldPrefs(api, activeWorkspaceId, typeKey, prefList)
      .then(updated => setTypeFieldPrefs(Array.isArray(updated) ? updated : []))
      .catch(reportError);

  return {
    fieldDefs, setFieldDefs,
    customFieldDefs, setCustomFieldDefs,
    showFieldForm, setShowFieldForm,
    newFieldForm, setNewFieldForm,
    fieldValues, setFieldValues,
    fieldLayouts, setFieldLayouts,
    fieldVisibility, setFieldVisibility,
    newFieldVisForm, setNewFieldVisForm,
    typeFieldPrefs, setTypeFieldPrefs, fieldPrefs,
    fetchFieldDefs, createFieldDef,
    fetchFieldValues, saveFieldValue,
    fetchFieldLayouts, fetchFieldVisibility, saveFieldVisibility,
    handleToggleFieldPref, handleSaveFieldPrefs,
  };
}
