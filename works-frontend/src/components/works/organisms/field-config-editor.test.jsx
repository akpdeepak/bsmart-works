import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import FieldConfigEditor from './field-config-editor';

describe('FieldConfigEditor — live preview (WI-32b)', () => {
  const customFieldDefs = [{ id: '1', name: 'Customer' }];

  it('shows a custom field in the editor list but omits it from the preview when hidden', () => {
    const fieldPrefs = { prefsMapForType: () => new Map([['cf_1', { visible: false, sortOrder: 99 }]]) };
    render(<FieldConfigEditor fieldPrefs={fieldPrefs} customFieldDefs={customFieldDefs} onSave={vi.fn()} />);

    // The field is listed in the editor (left/main column) even when hidden.
    expect(screen.getByText('Customer')).toBeInTheDocument();
    // …but it is absent from the live preview because it is toggled off.
    const preview = screen.getByRole('complementary', { name: /live preview/i });
    expect(within(preview).queryByText('Customer')).not.toBeInTheDocument();
  });

  it('includes a visible custom field in the preview', () => {
    const fieldPrefs = { prefsMapForType: () => new Map([['cf_1', { visible: true, sortOrder: 0 }]]) };
    render(<FieldConfigEditor fieldPrefs={fieldPrefs} customFieldDefs={customFieldDefs} onSave={vi.fn()} />);
    const preview = screen.getByRole('complementary', { name: /live preview/i });
    expect(within(preview).getByText('Customer')).toBeInTheDocument();
  });
});
