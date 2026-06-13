import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BqlView from './bql-view';
import { rowToClause, quoteIfNeeded } from '@/lib/bql-builder';

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

  it('toggles the visual builder open', () => {
    render(<BqlView {...baseProps} />);
    expect(screen.queryByText('Visual builder', { selector: 'p' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Visual builder/ }));
    expect(screen.getByText('Visual builder', { selector: 'p' })).toBeInTheDocument();
  });
});

describe('rowToClause', () => {
  it('emits a simple comparison, quoting values with spaces', () => {
    expect(rowToClause({ field: 'priority', op: '=', value: 'High' })).toBe('priority = High');
    expect(rowToClause({ field: 'status', op: '=', value: 'In Progress' })).toBe('status = "In Progress"');
  });

  it('emits nullary operators without a value', () => {
    expect(rowToClause({ field: 'assignee', op: 'IS EMPTY', value: '' })).toBe('assignee IS EMPTY');
  });

  it('emits set operators as a parenthesized list', () => {
    expect(rowToClause({ field: 'status', op: 'NOT IN', value: 'Done, Cancelled' }))
      .toBe('status NOT IN (Done, Cancelled)');
  });

  it('returns empty for an incomplete row', () => {
    expect(rowToClause({ field: '', op: '=', value: 'x' })).toBe('');
    expect(rowToClause({ field: 'priority', op: '=', value: '' })).toBe('');
  });
});

describe('quoteIfNeeded', () => {
  it('quotes only when whitespace is present', () => {
    expect(quoteIfNeeded('High')).toBe('High');
    expect(quoteIfNeeded('In Progress')).toBe('"In Progress"');
    expect(quoteIfNeeded('"already quoted"')).toBe('"already quoted"');
  });
});
