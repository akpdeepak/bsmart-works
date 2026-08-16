import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FieldLayoutSettings } from './field-settings';

describe('FieldLayoutSettings keyboard reordering', () => {
  it('moves a field down with an accessible keyboard-operable control', () => {
    render(
      <FieldLayoutSettings
        fieldDefs={[
          { id: 'FD-1', name: 'Region', fieldType: 'TEXT' },
          { id: 'FD-2', name: 'Meter', fieldType: 'TEXT' },
        ]}
        fieldLayouts={[]}
        activeWorkspaceId="WS-1"
        fetchFieldLayouts={vi.fn()}
        showToast={vi.fn()}
        api={{ send: vi.fn() }}
      />,
    );

    const moveDown = screen.getAllByRole('button', { name: 'Move Region down' })[0];
    fireEvent.keyDown(moveDown, { key: 'Enter' });

    const fieldRows = screen.getAllByTestId('field-layout-row').slice(0, 2);
    expect(fieldRows[0]).toHaveTextContent('Meter');
    expect(fieldRows[1]).toHaveTextContent('Region');
  });
});
