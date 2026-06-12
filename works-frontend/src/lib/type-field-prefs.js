// Per-type field preferences — which fields show on the work item detail surface, per type.
// Server-persisted (GET/PUT /api/v1/type-field-prefs). A field is visible unless a pref row says
// otherwise, so the default (no rows) shows everything.

export function buildFieldPrefsResolver(prefs) {
  const byType = new Map(); // typeKey -> Map(fieldKey -> pref)
  (Array.isArray(prefs) ? prefs : []).forEach((p) => {
    if (!byType.has(p.typeKey)) byType.set(p.typeKey, new Map());
    byType.get(p.typeKey).set(p.fieldKey, p);
  });

  return {
    /** A field shows unless a pref explicitly hides it. */
    isVisible(typeKey, fieldKey) {
      const p = byType.get(typeKey)?.get(fieldKey);
      return p ? p.visible !== false : true;
    },
    /** The set of field keys explicitly hidden for a type. */
    hiddenKeys(typeKey) {
      const m = byType.get(typeKey);
      if (!m) return new Set();
      return new Set([...m.values()].filter((p) => p.visible === false).map((p) => p.fieldKey));
    },
  };
}

/** Replace one type's field prefs. prefList: [{ fieldKey, visible, sortOrder? }]. */
export function saveTypeFieldPrefs(api, workspaceId, typeKey, prefList) {
  return api.send(
    `/type-field-prefs?workspaceId=${encodeURIComponent(workspaceId)}&typeKey=${encodeURIComponent(typeKey)}`,
    { method: 'PUT', body: prefList }
  );
}
