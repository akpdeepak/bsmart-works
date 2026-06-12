import { useState, useCallback } from 'react';

const STORAGE_KEY = 'bsw_card_prefs_v1';

// Fields shown by default on every card. ID/type/title are never toggled (always visible).
const DEFAULT_VISIBLE = ['status', 'priority', 'assignee', 'dueDate'];

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.visibleFields)) return parsed;
    }
  } catch { /* ignore */ }
  return { visibleFields: DEFAULT_VISIBLE };
}

function save(prefs) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
}

/**
 * Manages which fields appear on work item cards.
 * State is stored in localStorage so it persists across sessions.
 *
 * visibleFields is an array of field keys, e.g.:
 *   built-in: 'status' | 'priority' | 'assignee' | 'dueDate' |
 *             'storyPoints' | 'tags' | 'description' | 'startDate' |
 *             'reporter' | 'severity' | 'environment' | 'fixedInVersion' |
 *             'regressionRisk' | 'slaTarget' | 'slaBreachFlag' | 'businessImpact'
 *   custom:   'cfd_<id>'
 */
export function useCardPrefs() {
  const [prefs, setPrefs] = useState(load);

  const update = useCallback((next) => {
    setPrefs(next);
    save(next);
  }, []);

  const isVisible = useCallback(
    (key) => prefs.visibleFields.includes(key),
    [prefs.visibleFields]
  );

  const toggleField = useCallback((key) => {
    update({
      ...prefs,
      visibleFields: prefs.visibleFields.includes(key)
        ? prefs.visibleFields.filter(f => f !== key)
        : [...prefs.visibleFields, key],
    });
  }, [prefs, update]);

  const addField = useCallback((key) => {
    if (prefs.visibleFields.includes(key)) return;
    update({ ...prefs, visibleFields: [...prefs.visibleFields, key] });
  }, [prefs, update]);

  const removeField = useCallback((key) => {
    update({ ...prefs, visibleFields: prefs.visibleFields.filter(f => f !== key) });
  }, [prefs, update]);

  const resetPrefs = useCallback(() => {
    update({ visibleFields: DEFAULT_VISIBLE });
  }, [update]);

  return { prefs, isVisible, toggleField, addField, removeField, resetPrefs };
}
