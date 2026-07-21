import { useState } from 'react';
import { TIER } from '@/lib/nav-model';
import { MoreMenu } from './more-menu';
import { ShellBreadcrumbs } from './shell-breadcrumbs';

export default {
  title: 'Organisms/Navigation shell',
  parameters: { layout: 'fullscreen' },
};

function NavigationShellStory({ visibility }) {
  const [view, setView] = useState('account');
  return (
    <div className="min-h-48 bg-neutral-50 dark:bg-neutral-900">
      <div className="flex h-14 items-center bg-brand-navy px-4">
        <MoreMenu activeView={view} visibility={visibility} onNavigate={setView} />
      </div>
      <ShellBreadcrumbs view={view} />
    </div>
  );
}

export const Member = { render: () => <NavigationShellStory visibility={TIER.MEMBER} /> };
export const Admin = { render: () => <NavigationShellStory visibility={TIER.ADMIN} /> };
export const Owner = { render: () => <NavigationShellStory visibility={TIER.OWNER} /> };
