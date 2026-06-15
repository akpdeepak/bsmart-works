import { FileText, Inbox, AlertCircle, Search, Users } from 'lucide-react';
import { Button } from '@/components/works/button';
import { EmptyState } from './empty-state';

export default {
  title: 'Works/Atoms/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export const Default = {
  args: {
    icon: FileText,
    title: 'No items yet',
    subtitle: 'Create your first item to get started.',
  },
};

export const WithAction = {
  args: {
    icon: Inbox,
    title: 'Your inbox is empty',
    subtitle: 'No notifications right now. Check back later.',
    action: <Button variant="action" size="sm">Create work item</Button>,
  },
};

export const SearchNoResults = {
  args: {
    icon: Search,
    title: 'No results found',
    subtitle: 'Try different keywords or clear the filters.',
    action: <Button variant="secondary" size="sm">Clear filters</Button>,
  },
};

export const ErrorState = {
  args: {
    icon: AlertCircle,
    title: "Couldn't load this view",
    subtitle: 'Something went wrong while fetching data. Try again.',
    action: <Button variant="secondary" size="sm">Try again</Button>,
  },
};

export const NoTeamMembers = {
  args: {
    icon: Users,
    title: 'No team members',
    subtitle: 'Invite your colleagues to collaborate on this workspace.',
    action: <Button variant="action" size="sm">Invite members</Button>,
  },
};

export const NoSubtitle = {
  args: {
    icon: FileText,
    title: 'Nothing here yet',
  },
};
