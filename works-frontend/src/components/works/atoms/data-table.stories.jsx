import { useState } from 'react';
import { DataTable } from './data-table';

export default {
  title: 'Works/Atoms/DataTable',
  component: DataTable,
  tags: ['autodocs'],
  parameters: { a11y: { test: 'error' } },
};

const COLUMNS = [
  { key: 'name',   label: 'Name',   sortable: true },
  { key: 'role',   label: 'Role',   sortable: true },
  { key: 'status', label: 'Status', align: 'center' },
  { key: 'joined', label: 'Joined', sortable: true, align: 'right' },
];

const ROWS = [
  { id: '1', name: 'Alice Patel',   role: 'Owner',  status: 'Active',   joined: '2024-01-10' },
  { id: '2', name: 'Bob Kumar',     role: 'Admin',  status: 'Active',   joined: '2024-03-05' },
  { id: '3', name: 'Carol Singh',   role: 'Member', status: 'Inactive', joined: '2024-05-20' },
  { id: '4', name: 'David Sharma',  role: 'Viewer', status: 'Active',   joined: '2024-07-14' },
  { id: '5', name: 'Eva Krishnan',  role: 'Lead',   status: 'Active',   joined: '2024-09-02' },
];

export const Default = {
  render: () => <DataTable columns={COLUMNS} rows={ROWS} caption="Team members" />,
};

export const WithSort = {
  name: 'Controlled sort',
  render: () => {
    const [sortKey, setSortKey] = useState('name');
    const [sortDir, setSortDir] = useState('asc');
    const sorted = [...ROWS].sort((a, b) => {
      const v = a[sortKey] < b[sortKey] ? -1 : a[sortKey] > b[sortKey] ? 1 : 0;
      return sortDir === 'asc' ? v : -v;
    });
    return (
      <DataTable
        columns={COLUMNS}
        rows={sorted}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={(key, dir) => { setSortKey(key); setSortDir(dir); }}
        caption="Sortable team members"
      />
    );
  },
};

export const Loading = {
  render: () => <DataTable columns={COLUMNS} rows={[]} loading caption="Loading…" />,
};

export const Empty = {
  render: () => (
    <DataTable
      columns={COLUMNS}
      rows={[]}
      empty="No team members found. Invite someone to get started."
      caption="Empty table"
    />
  ),
};

export const ClickableRows = {
  name: 'Clickable rows',
  render: () => {
    const [clicked, setClicked] = useState(null);
    return (
      <div className="space-y-3">
        <DataTable
          columns={COLUMNS}
          rows={ROWS}
          caption="Click a row"
          onRowClick={(row) => setClicked(row.name)}
        />
        {clicked && (
          <p className="text-sm text-neutral-600">
            Clicked: <strong>{clicked}</strong>
          </p>
        )}
      </div>
    );
  },
};
