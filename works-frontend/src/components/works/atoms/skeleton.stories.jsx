import { Skeleton, CardSkeleton, TableRowSkeleton, ChartSkeleton, AvatarSkeleton } from './skeleton';

export default {
  title: 'Works/Atoms/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  parameters: {
    // Skeletons are presentational loading placeholders — no meaningful a11y role.
    a11y: { test: 'todo' },
  },
};

export const Default = {
  name: 'Default (line)',
  args: { className: 'h-4 w-48' },
};

export const Card = {
  name: 'Card skeleton',
  render: () => (
    <div className="space-y-3 p-4 w-72">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  ),
};

export const AvatarAndText = {
  name: 'Avatar + text',
  render: () => (
    <div className="flex items-center gap-3 p-4">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
    </div>
  ),
};

export const Table = {
  name: 'Table rows',
  render: () => (
    <div className="space-y-2 p-4 w-full">
      {[1, 2, 3, 4, 5].map((n) => (
        <div key={n} className="flex gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  ),
};

export const KanbanColumn = {
  name: 'Kanban column',
  render: () => (
    <div className="w-56 bg-neutral-100 rounded-xl p-3 space-y-2">
      <div className="flex justify-between mb-3 px-1">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-6 rounded-full" />
      </div>
      {[1, 2, 3].map((n) => (
        <div key={n} className="bg-white rounded-lg p-3 border border-neutral-200 space-y-2">
          <Skeleton className="h-2 w-16" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <div className="flex justify-between pt-1">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-5 w-5 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  ),
};

export const CardVariant = {
  name: 'CardSkeleton',
  render: () => <CardSkeleton className="w-72" />,
};

export const TableRowVariant = {
  name: 'TableRowSkeleton',
  render: () => <TableRowSkeleton rows={4} cols={3} className="w-full max-w-lg" />,
};

export const ChartVariant = {
  name: 'ChartSkeleton',
  render: () => <ChartSkeleton className="w-96" />,
};

export const AvatarVariants = {
  name: 'AvatarSkeleton sizes',
  render: () => (
    <div className="flex items-center gap-3 p-4">
      <AvatarSkeleton size="sm" />
      <AvatarSkeleton size="md" />
      <AvatarSkeleton size="lg" />
    </div>
  ),
};

