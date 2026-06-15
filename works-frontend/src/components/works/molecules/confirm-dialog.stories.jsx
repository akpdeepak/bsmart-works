import { useState } from 'react';
import { ConfirmDialog } from './confirm-dialog';
import { Button } from '@/components/works/button';

export default {
  title: 'Works/Molecules/ConfirmDialog',
  component: ConfirmDialog,
  tags: ['autodocs'],
  parameters: { a11y: { test: 'error' } },
};

export const Default = {
  name: 'Default confirm',
  render: () => {
    const [open, setOpen] = useState(false);
    const [result, setResult] = useState(null);
    return (
      <div className="space-y-2">
        <Button onClick={() => setOpen(true)}>Open confirm dialog</Button>
        {result && <p className="text-sm text-neutral-600">Result: <strong>{result}</strong></p>}
        <ConfirmDialog
          open={open}
          onClose={() => { setOpen(false); setResult('cancelled'); }}
          onConfirm={() => { setOpen(false); setResult('confirmed'); }}
          title="Confirm action"
          message="Are you sure you want to proceed? This will update the record."
        />
      </div>
    );
  },
};

export const Danger = {
  name: 'Danger variant (destructive)',
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button variant="danger" onClick={() => setOpen(true)}>Delete work item</Button>
        <ConfirmDialog
          open={open}
          onClose={() => setOpen(false)}
          onConfirm={() => setOpen(false)}
          variant="danger"
          title="Delete work item?"
          message="This will permanently delete the work item and all its history. This action cannot be undone."
          confirmLabel="Yes, delete"
        />
      </>
    );
  },
};

export const Loading = {
  name: 'Loading state (async confirm in flight)',
  render: () => {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const handleConfirm = () => {
      setLoading(true);
      setTimeout(() => { setLoading(false); setOpen(false); }, 2000);
    };
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open (simulate slow confirm)</Button>
        <ConfirmDialog
          open={open}
          onClose={() => !loading && setOpen(false)}
          onConfirm={handleConfirm}
          loading={loading}
          title="Save changes?"
          message="Your changes will be saved to the server."
          confirmLabel="Save"
        />
      </>
    );
  },
};

export const CustomLabels = {
  name: 'Custom labels',
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Archive sprint</Button>
        <ConfirmDialog
          open={open}
          onClose={() => setOpen(false)}
          onConfirm={() => setOpen(false)}
          title="Archive this sprint?"
          message="The sprint will be moved to the archive. You can restore it later."
          confirmLabel="Archive sprint"
          cancelLabel="Keep active"
        />
      </>
    );
  },
};
