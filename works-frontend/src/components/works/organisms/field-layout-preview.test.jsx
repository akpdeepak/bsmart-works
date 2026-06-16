import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { FieldLayoutPreview } from './field-layout-preview';

describe('FieldLayoutPreview', () => {
  it('renders the type label and an empty hint when no fields are visible', () => {
    render(<FieldLayoutPreview typeLabel="Bug" fields={[]} />);
    expect(screen.getByRole('heading', { name: 'Bug' })).toBeInTheDocument();
    expect(screen.getByText(/no visible fields/i)).toBeInTheDocument();
  });

  it('renders visible fields in the given order', () => {
    const fields = [
      { key: 'priority', label: 'Priority' },
      { key: 'assignee', label: 'Assignee' },
      { key: 'cf_1', label: 'Customer', custom: true },
    ];
    render(<FieldLayoutPreview typeLabel="Story" fields={fields} />);
    const region = screen.getByRole('complementary', { name: /live preview/i });
    const labels = within(region).getAllByRole('term').map((el) => el.textContent);
    expect(labels).toEqual(['Priority', 'Assignee', 'Customer']);
  });
});
