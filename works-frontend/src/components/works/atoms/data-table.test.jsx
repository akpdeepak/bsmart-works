import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable } from './data-table';

const COLS = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'status', label: 'Status' },
];

const ROWS = [
  { id: '1', name: 'Alice', status: 'Active' },
  { id: '2', name: 'Bob', status: 'Inactive' },
];

describe('DataTable', () => {
  it('renders column headers', () => {
    render(<DataTable columns={COLS} rows={ROWS} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders row data', () => {
    render(<DataTable columns={COLS} rows={ROWS} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows default empty state when rows is empty', () => {
    render(<DataTable columns={COLS} rows={[]} />);
    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  it('shows custom empty message', () => {
    render(<DataTable columns={COLS} rows={[]} empty="Nothing to show" />);
    expect(screen.getByText('Nothing to show')).toBeInTheDocument();
  });

  it('renders skeleton rows when loading', () => {
    const { container } = render(<DataTable columns={COLS} rows={[]} loading />);
    expect(container.querySelectorAll('tbody tr[aria-hidden="true"]')).toHaveLength(4);
  });

  it('has aria-busy on table when loading', () => {
    const { container } = render(<DataTable columns={COLS} rows={[]} loading />);
    expect(container.querySelector('table')).toHaveAttribute('aria-busy', 'true');
  });

  it('renders a caption as sr-only text', () => {
    render(<DataTable columns={COLS} rows={ROWS} caption="User list" />);
    expect(screen.getByText('User list')).toBeInTheDocument();
  });

  it('sortable column has aria-sort="none" when not active', () => {
    render(<DataTable columns={COLS} rows={ROWS} />);
    const th = screen.getByRole('columnheader', { name: /name/i });
    expect(th).toHaveAttribute('aria-sort', 'none');
  });

  it('active sort column has aria-sort="ascending"', () => {
    render(<DataTable columns={COLS} rows={ROWS} sortKey="name" sortDir="asc" />);
    const th = screen.getByRole('columnheader', { name: /name/i });
    expect(th).toHaveAttribute('aria-sort', 'ascending');
  });

  it('active sort column toggles to descending on second click', () => {
    const fn = vi.fn();
    render(<DataTable columns={COLS} rows={ROWS} sortKey="name" sortDir="asc" onSort={fn} />);
    fireEvent.click(screen.getByRole('columnheader', { name: /name/i }));
    expect(fn).toHaveBeenCalledWith('name', 'desc');
  });

  it('calls onSort with asc on first click of unsorted column', () => {
    const fn = vi.fn();
    render(<DataTable columns={COLS} rows={ROWS} onSort={fn} />);
    fireEvent.click(screen.getByRole('columnheader', { name: /name/i }));
    expect(fn).toHaveBeenCalledWith('name', 'asc');
  });

  it('calls onRowClick with the row object when row is clicked', () => {
    const fn = vi.fn();
    render(<DataTable columns={COLS} rows={ROWS} onRowClick={fn} />);
    fireEvent.click(screen.getByText('Alice'));
    expect(fn).toHaveBeenCalledWith(ROWS[0]);
  });

  it('uses renderCell to render cell content', () => {
    render(
      <DataTable
        columns={COLS}
        rows={ROWS}
        renderCell={(key, row) => key === 'name' ? `Mr. ${row.name}` : row[key]}
      />
    );
    expect(screen.getByText('Mr. Alice')).toBeInTheDocument();
  });

  // ── Premium upgrade (WI-33) ───────────────────────────────────────────────
  it('multiSort: plain click drives the sort model, shift-click adds a secondary sort', () => {
    const cols = [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'status', label: 'Status', sortable: true },
    ];
    const onModel = vi.fn();
    const { rerender } = render(<DataTable columns={cols} rows={ROWS} multiSort sortModel={[]} onSortModelChange={onModel} />);
    fireEvent.click(screen.getByRole('columnheader', { name: /name/i }));
    expect(onModel).toHaveBeenLastCalledWith([{ key: 'name', dir: 'asc' }]);

    rerender(<DataTable columns={cols} rows={ROWS} multiSort sortModel={[{ key: 'name', dir: 'asc' }]} onSortModelChange={onModel} />);
    fireEvent.click(screen.getByRole('columnheader', { name: /status/i }), { shiftKey: true });
    expect(onModel).toHaveBeenLastCalledWith([{ key: 'name', dir: 'asc' }, { key: 'status', dir: 'asc' }]);
  });

  it('columnControls: hides a column via the Columns menu', () => {
    render(<DataTable columns={COLS} rows={ROWS} columnControls />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /columns/i }));
    // Uncheck "Name" in the menu
    const nameCheckbox = screen.getByRole('checkbox', { name: /name/i });
    fireEvent.click(nameCheckbox);
    // The Name column (and its cells) are gone; Status remains.
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('inline edit: click-to-edit commits a new value on Enter', () => {
    const onCellEdit = vi.fn();
    const cols = [{ key: 'name', label: 'Name', editable: true }, { key: 'status', label: 'Status' }];
    render(<DataTable columns={cols} rows={ROWS} onCellEdit={onCellEdit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Alice' }));
    const input = screen.getByDisplayValue('Alice');
    fireEvent.change(input, { target: { value: 'Alicia' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCellEdit).toHaveBeenCalledWith(ROWS[0], 'name', 'Alicia');
  });

  it('density: spacious rows use more vertical padding than compact', () => {
    const { container, rerender } = render(<DataTable columns={COLS} rows={ROWS} density="compact" />);
    expect(container.querySelector('tbody td')).toHaveClass('py-1');
    rerender(<DataTable columns={COLS} rows={ROWS} density="spacious" />);
    expect(container.querySelector('tbody td')).toHaveClass('py-3');
  });
});
