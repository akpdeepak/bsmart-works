import React from 'react';
import { Button } from '@/components/works/button';
import { StatusBadge } from '@/components/works/status-badge';
import { statusToCategory } from '@/components/works/status';
import { TypeBadge, EmptyState } from '@/components/works/ui';

export function MyWorksView({ myItems, workItems, notifications, myWorksTab, setMyWorksTab, setSelectedItem, setIsCreateOpen }) {
  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-brand-navy mb-1">My Works</h1>
      <p className="text-sm text-neutral-400 mb-4">Your personal workspace</p>
      <div className="flex gap-1 mb-5 border-b border-neutral-200 dark:border-neutral-700">
        {[
          { key: 'assigned', label: `Assigned (${myItems.length})` },
          { key: 'starred',  label: `Starred (${workItems.filter(i => i.starred).length})` },
          { key: 'mentions', label: `Mentions (${notifications.filter(n => n.type === 'MENTION').length})` },
          { key: 'activity', label: 'Recent Activity' },
        ].map(t => (
          <button key={t.key} onClick={() => setMyWorksTab(t.key)}
            className={`text-sm font-medium px-4 py-2 border-b-2 transition-colors ${myWorksTab === t.key ? 'border-brand-navy text-brand-navy' : 'border-transparent text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {myWorksTab === 'assigned' && (myItems.length === 0
        ? <EmptyState icon="👤" title="Nothing assigned to you"
            subtitle="Work items assigned to you will appear here."
            action={<Button variant="secondary" size="sm" onClick={() => setIsCreateOpen(true)}>Create a work item</Button>} />
        : <div className="space-y-2">
            {myItems.map(item => (
              <div key={item.id} onClick={() => setSelectedItem(item)}
                className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 flex items-center gap-4 hover:shadow-sm cursor-pointer transition-shadow">
                <TypeBadge type={item.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">{item.title}</p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 font-mono">{item.id}</p>
                </div>
                <StatusBadge category={statusToCategory(item.status)}>{item.status}</StatusBadge>
                {item.dueDate && <span className="text-xs text-semantic-warning font-medium whitespace-nowrap">Due {item.dueDate}</span>}
              </div>
            ))}
          </div>
      )}

      {myWorksTab === 'starred' && (() => {
        const starredItems = workItems.filter(i => i.starred);
        return starredItems.length === 0
          ? <EmptyState icon="★" title="No starred items" subtitle="Star work items to keep them handy. Click ★ on any card or in the detail panel." />
          : <div className="space-y-2">
              {starredItems.map(item => (
                <div key={item.id} onClick={() => setSelectedItem(item)}
                  className="bg-white dark:bg-neutral-800 border border-brand-orange/30 rounded-lg p-4 flex items-center gap-4 hover:shadow-sm cursor-pointer transition-shadow">
                  <span className="text-brand-orange text-sm">★</span>
                  <TypeBadge type={item.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">{item.title}</p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 font-mono">{item.id}</p>
                  </div>
                  <StatusBadge category={statusToCategory(item.status)}>{item.status}</StatusBadge>
                </div>
              ))}
            </div>;
      })()}

      {myWorksTab === 'mentions' && (() => {
        const mentions = notifications.filter(n => n.type === 'MENTION');
        return mentions.length === 0
          ? <EmptyState icon="@" title="No mentions yet" subtitle="When someone @mentions you in a comment, it will appear here." />
          : <div className="space-y-2">
              {mentions.map(n => (
                <div key={n.id} className={`bg-white dark:bg-neutral-800 border rounded-lg p-4 ${!n.read ? 'border-brand-navy-tint/30' : 'border-neutral-200 dark:border-neutral-700'}`}>
                  <p className="text-sm text-neutral-900">{n.message}</p>
                  <p className="text-xs text-neutral-400 mt-1">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</p>
                </div>
              ))}
            </div>;
      })()}

      {myWorksTab === 'activity' && (
        <div className="space-y-2">
          {workItems.filter(i => i.assigneeId === workItems._currentUserId).slice(0, 20).map(i => (
            <div key={i.id} onClick={() => setSelectedItem(i)}
              className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 flex items-center gap-3 hover:shadow-sm cursor-pointer">
              <TypeBadge type={i.type} compact />
              <span className="text-xs font-mono text-neutral-400">{i.id}</span>
              <span className="flex-1 text-sm text-neutral-900 truncate">{i.title}</span>
              <StatusBadge category={statusToCategory(i.status)}>{i.status}</StatusBadge>
            </div>
          ))}
          {workItems.filter(i => i.assigneeId === workItems._currentUserId).length === 0 &&
            <EmptyState icon="📋" title="No recent activity" subtitle="Items you create or are assigned to will show here." />}
        </div>
      )}
    </div>
  );
}
