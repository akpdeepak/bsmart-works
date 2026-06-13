import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BqlView from './bql-view';
import { rowToClause, quoteIfNeeded, suggestions, applySuggestion } from '@/lib/bql-builder';

const schema = {
  fields: [{ alias: 'status' }, { alias: 'priority' }, { alias: 'assignee' }],
  operators: ['=', '!=', 'IN', 'CONTAINS'],
  enums: { status: ['Open', 'In Progress', 'Done'], priority: ['High', 'Low'] },
};

const noop = () => {};
const baseProps = {
  bqlQuery: '',
  bqlError: '',
  bqlResults: [],
  workItems: [],
  setBqlQuery: noop,
  setSelectedItem: noop,
  runBql: noop,
};

describe('BqlView', () => {
  it('renders the editor with an associated query label', () => {
    render(<BqlView {...baseProps} />);
    // label-for association: getByLabelText resolves the textarea via htmlFor/id.
    expect(screen.getByLabelText('Query')).toBeInTheDocument();
    // Saving is now a single concept — "Save as View" (the redundant Save Filter input is gone).
    expect(screen.getByRole('button', { name: /Save as View/ })).toBeInTheDocument();
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

  it('resolves id columns to names in results (JIRA-style)', () => {
    render(
      <BqlView
        {...baseProps}
        bqlQuery="assignee = currentUser()"
        bqlResults={[{ id: 'WRK-1', title: 'A bug', assignee_id: 'USR-1' }]}
        nameMaps={{ users: { 'USR-1': 'Alice Smith' }, projects: {}, sprints: {} }}
      />,
    );
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
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

describe('suggestions (caret-aware autocomplete)', () => {
  it('suggests fields at the start and after a connector', () => {
    expect(suggestions('', schema).options).toContain('status');
    expect(suggestions('status = Open AND ', schema).options).toContain('priority');
  });

  it('filters fields by the partial token', () => {
    const r = suggestions('pri', schema);
    expect(r.partial).toBe('pri');
    expect(r.options).toEqual(['priority']);
  });

  it('suggests operators after a field', () => {
    expect(suggestions('status ', schema).kind).toBe('operator');
    expect(suggestions('status ', schema).options).toContain('=');
  });

  it('suggests enum values after an operator', () => {
    const r = suggestions('status = ', schema);
    expect(r.kind).toBe('value');
    expect(r.options).toEqual(['Open', 'In Progress', 'Done']);
  });
});

describe('applySuggestion', () => {
  it('replaces the partial token under the caret and trails a space', () => {
    const text = 'sta';
    const r = applySuggestion(text, 3, 'sta', 'status');
    expect(r.text).toBe('status ');
    expect(r.caret).toBe(7);
  });
});

describe('quoteIfNeeded', () => {
  it('quotes only when whitespace is present', () => {
    expect(quoteIfNeeded('High')).toBe('High');
    expect(quoteIfNeeded('In Progress')).toBe('"In Progress"');
    expect(quoteIfNeeded('"already quoted"')).toBe('"already quoted"');
  });
});
