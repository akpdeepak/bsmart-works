import { beforeEach, describe, expect, it } from 'vitest';
import { FIELD_SCHEMAS, getEffectiveSchema, defaultFormData } from './type-field-schemas';

// The per-type field config used to be edited in a localStorage-backed "Fields" settings tab that
// told the admin "Changes are saved to this workspace" while writing only to that one browser
// profile. That tab is gone; per-type field visibility/order is owned by the server-backed
// `type_field_prefs` surface ("Detail Fields"). These tests pin the two properties that keep the
// false front from coming back: the schema is the baseline, and browser-local state cannot shape it.

const CONFIG_KEY = 'bsmart-field-config';

describe('getEffectiveSchema', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns the baseline schema for a known type', () => {
    expect(getEffectiveSchema('BUG')).toEqual(
      FIELD_SCHEMAS.BUG.map((f) => ({ ...f, _system: true })),
    );
  });

  it('returns an empty list for an unknown type', () => {
    expect(getEffectiveSchema('NOT_A_TYPE')).toEqual([]);
    expect(getEffectiveSchema(null)).toEqual([]);
  });

  it('ignores a stale browser-local field config rather than letting it rename fields', () => {
    window.localStorage.setItem(CONFIG_KEY, JSON.stringify({
      BUG: { overrides: { title: { label: 'HIJACKED' } } },
    }));

    const titleField = getEffectiveSchema('BUG').find((f) => f.key === 'title');
    expect(titleField.label).toBe('Summary');
  });

  it('ignores a stale browser-local config rather than letting it hide fields', () => {
    window.localStorage.setItem(CONFIG_KEY, JSON.stringify({
      BUG: { hidden: ['severity'] },
    }));

    expect(getEffectiveSchema('BUG').map((f) => f.key)).toContain('severity');
  });

  it('ignores a stale browser-local config rather than letting it inject custom fields', () => {
    window.localStorage.setItem(CONFIG_KEY, JSON.stringify({
      BUG: { custom: [{ key: 'custom_ghost', label: 'Ghost', type: 'text' }] },
    }));

    expect(getEffectiveSchema('BUG').map((f) => f.key)).not.toContain('custom_ghost');
  });

  it('ignores a stale browser-local config rather than letting it flip required', () => {
    window.localStorage.setItem(CONFIG_KEY, JSON.stringify({
      BUG: { overrides: { affectedVersion: { required: true } } },
    }));

    const field = getEffectiveSchema('BUG').find((f) => f.key === 'affectedVersion');
    expect(field.required).toBeUndefined();
  });
});

describe('defaultFormData', () => {
  it('supplies the per-type creation defaults', () => {
    expect(defaultFormData('BUG')).toMatchObject({
      severity: 'MEDIUM',
      regressionRisk: 'NOT_ASSESSED',
      environmentDetail: 'PRODUCTION',
    });
    expect(defaultFormData('TASK')).toEqual({ priority: 'MEDIUM' });
  });
});
