import { Button } from '../button';
import { PageHeader } from './page-header';

export default {
  title: 'Works/Atoms/PageHeader',
  component: PageHeader,
  tags: ['autodocs'],
  args: {
    title: 'Page title',
  },
};

export const Default = {
  name: 'Title only',
  args: { title: 'Work Items' },
};

export const WithDescription = {
  name: 'Title + description',
  args: {
    title: 'Work Items',
    description: 'Track and manage all work across your projects.',
  },
};

export const WithActions = {
  name: 'Title + actions',
  render: () => (
    <PageHeader
      title="Work Items"
      description="Track and manage all work across your projects."
      actions={
        <>
          <Button variant="secondary" size="sm">Export</Button>
          <Button size="sm">Create work item</Button>
        </>
      }
    />
  ),
};

export const WithBreadcrumb = {
  name: 'Title + breadcrumb + actions',
  render: () => (
    <PageHeader
      title="Sprint Planning"
      description="Plan and assign work for the current sprint."
      breadcrumb={<span>Projects / bSmart Works / Sprints</span>}
      actions={<Button size="sm">Start sprint</Button>}
    />
  ),
};

export const LongTitle = {
  name: 'Long title (truncates)',
  args: {
    title: 'A very long page title that should truncate gracefully when it reaches the edge of the container',
    description: 'Supporting description text.',
  },
};
