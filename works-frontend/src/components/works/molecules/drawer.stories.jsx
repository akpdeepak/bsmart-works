import { useState } from 'react';
import { Drawer } from './drawer';
import { Button } from '@/components/works/button';

export default {
  title: 'Works/Molecules/Drawer',
  component: Drawer,
  tags: ['autodocs'],
  parameters: { a11y: { test: 'error' } },
};

export const Default = {
  name: 'Right drawer (default)',
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open drawer</Button>
        <Drawer open={open} onClose={() => setOpen(false)} title="Edit profile">
          <p className="text-sm text-neutral-600">Drawer body content goes here.</p>
        </Drawer>
      </>
    );
  },
};

export const Left = {
  name: 'Left drawer',
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open left drawer</Button>
        <Drawer open={open} onClose={() => setOpen(false)} title="Navigation" side="left">
          <p className="text-sm text-neutral-600">Left side panel content.</p>
        </Drawer>
      </>
    );
  },
};

export const WithFooter = {
  name: 'With footer actions',
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open with footer</Button>
        <Drawer
          open={open}
          onClose={() => setOpen(false)}
          title="Edit work item"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setOpen(false)}>Save changes</Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              Edit form fields would appear here. The footer stays pinned at the bottom
              while the body scrolls.
            </p>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-neutral-100 animate-pulse" />
            ))}
          </div>
        </Drawer>
      </>
    );
  },
};

export const Sizes = {
  name: 'All sizes (sm · md · lg · xl)',
  render: () => {
    const [size, setSize] = useState(null);
    return (
      <div className="flex gap-2 flex-wrap">
        {['sm', 'md', 'lg', 'xl'].map((s) => (
          <Button key={s} variant="secondary" onClick={() => setSize(s)}>
            {s.toUpperCase()}
          </Button>
        ))}
        <Drawer
          open={!!size}
          onClose={() => setSize(null)}
          title={`Drawer — ${size}`}
          size={size}
        >
          <p className="text-sm text-neutral-600">Size: <strong>{size}</strong></p>
        </Drawer>
      </div>
    );
  },
};
