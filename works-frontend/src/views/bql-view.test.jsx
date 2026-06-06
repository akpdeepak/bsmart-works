import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BqlView from './bql-view';

const noop = () => {};
const baseProps = {
  bqlQuery: '',
  bqlError: '',
  bqlFilterName: '',
  bqlFilters: [],
  bqlResults: [],
  workItems: [],
  setBqlQuery: noop,
  setBqlFilterName: noop,
  setSelectedItem: noop,
  runBql: noop,
  saveBqlFilter: noop,
  fetchBqlFilters: noop,
};

describe('BqlView', () => {
  it('renders the editor with an associated query label', () => {
    render(<BqlView {...baseProps} />);
    // label-for association: getByLabelText resolves the textarea via htmlFor/id.
    expect(screen.getByLabelText('Query')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter name')).toBeInTheDocument();
  });

  it('runs the query when Run is clicked', () => {
    const runBql = vi.fn();
    render(<BqlView {...baseProps} runBql={runBql} />);
    fireEvent.click(screen.getByRole('button', { name: /Run Query/ }));
    expect(runBql).toHaveBeenCalled();
  });

  it('renders results with status and priority badges', () => {
    render(
      <BqlView
        {...baseProps}
        bqlQuery="priority = High"
        bqlResults={[{ id: 'WRK-1', title: 'A bug', status: 'In Progress', priority: 'HIGH' }]}
      />,
    );
    expect(screen.getByText('1 result')).toBeInTheDocument();
    expect(screen.getByText('A bug')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });
});
