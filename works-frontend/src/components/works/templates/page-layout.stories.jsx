import { PageLayout } from './page-layout';
import { Button } from '@/components/works/button';
import { Badge } from '@/components/works/atoms/badge';
import { Card } from '@/components/works/atoms/card';

export default {
  title: 'Works/Templates/PageLayout',
  component: PageLayout,
  tags: ['autodocs'],
  parameters: {
    a11y: { test: 'error' },
    layout: 'fullscreen',
  },
  argTypes: {
    width: { control: 'select', options: ['dashboard', 'reading'] },
  },
};

const PlaceholderContent = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <Card key={i} padding="md">
        <div className="h-24 flex items-center justify-center">
          <span className="text-sm text-neutral-400">Section {i + 1}</span>
        </div>
      </Card>
    ))}
  </div>
);

export const Dashboard = {
  name: 'Dashboard width (max-w-workspace) — default',
  render: () => (
    <div className="bg-neutral-50 min-h-screen">
      <PageLayout
        title="Sprint Cockpit"
        description="Current sprint progress and team health"
        width="dashboard"
        actions={
          <>
            <Button variant="secondary" size="sm">Export</Button>
            <Button variant="primary" size="sm">New item</Button>
          </>
        }
      >
        <PlaceholderContent />
      </PageLayout>
    </div>
  ),
};

export const Reading = {
  name: 'Reading width (max-w-reading = 880px)',
  render: () => (
    <div className="bg-neutral-50 min-h-screen">
      <PageLayout
        title="Project settings"
        description="Configure workspace and project preferences"
        width="reading"
        actions={<Button variant="primary" size="sm">Save changes</Button>}
      >
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} padding="md">
              <div className="h-16 flex items-center">
                <span className="text-sm text-neutral-400">Settings section {i + 1}</span>
              </div>
            </Card>
          ))}
        </div>
      </PageLayout>
    </div>
  ),
};

export const WithBreadcrumb = {
  name: 'With breadcrumb',
  render: () => (
    <div className="bg-neutral-50 min-h-screen">
      <PageLayout
        title="Work item #WI-1042"
        description="Bug — High priority"
        breadcrumb={
          <span className="flex items-center gap-1">
            <span className="text-neutral-400">Projects</span>
            <span className="text-neutral-300 mx-1">/</span>
            <span className="text-neutral-400">Alpha</span>
            <span className="text-neutral-300 mx-1">/</span>
            <span>WI-1042</span>
          </span>
        }
        width="reading"
        actions={<Button variant="secondary" size="sm">Edit</Button>}
      >
        <Card padding="md">
          <p className="text-sm text-neutral-600">Work item detail content.</p>
        </Card>
      </PageLayout>
    </div>
  ),
};

export const CustomHeader = {
  name: 'Custom header (escape hatch)',
  render: () => (
    <div className="bg-neutral-50 min-h-screen">
      <PageLayout
        header={
          <div className="mb-6 flex items-center gap-3">
            <h1 className="text-2xl font-bold text-neutral-900">Custom header</h1>
            <Badge tone="brand">Beta</Badge>
          </div>
        }
        width="dashboard"
      >
        <PlaceholderContent />
      </PageLayout>
    </div>
  ),
};

export const NoHeader = {
  name: 'No header (header={null})',
  render: () => (
    <div className="bg-neutral-50 min-h-screen">
      <PageLayout header={null} width="dashboard">
        <PlaceholderContent />
      </PageLayout>
    </div>
  ),
};

export const NoPadding = {
  name: 'noPadding — full-bleed content',
  render: () => (
    <div className="bg-neutral-50 min-h-screen">
      <PageLayout title="Board" noPadding>
        <div className="bg-neutral-200 h-64 flex items-center justify-center">
          <span className="text-sm text-neutral-500">Full-bleed board canvas — no padding</span>
        </div>
      </PageLayout>
    </div>
  ),
};
