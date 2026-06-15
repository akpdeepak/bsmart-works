import { Breadcrumb } from './breadcrumb';

const ITEMS_SHORT = [
  { label: 'Home', href: '/' },
  { label: 'Projects', href: '/projects' },
  { label: 'Alpha Sprint' },
];

const ITEMS_LONG = [
  { label: 'Home', href: '/' },
  { label: 'Workspace', href: '/workspace' },
  { label: 'Projects', href: '/projects' },
  { label: 'Alpha Sprint', href: '/projects/alpha' },
  { label: 'WI-1042 — Fix login redirect loop' },
];

export default {
  title: 'Works/Atoms/Breadcrumb',
  component: Breadcrumb,
  tags: ['autodocs'],
  args: {
    items: ITEMS_SHORT,
  },
};

export const Default = {
  args: { items: ITEMS_SHORT },
};

export const LongPath = {
  name: 'Long path',
  args: { items: ITEMS_LONG },
};

export const NoLinks = {
  name: 'No links (spans only)',
  args: {
    items: [
      { label: 'Reports' },
      { label: 'Q2 Executive Summary' },
    ],
  },
};

export const SingleItem = {
  name: 'Single item (current page)',
  args: {
    items: [{ label: 'Dashboard' }],
  },
};
