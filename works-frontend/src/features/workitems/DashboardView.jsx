import React from 'react';
import { StatusBadge } from '@/components/works/status-badge';
import { statusToCategory } from '@/components/works/status';
import { Avatar, TypeBadge, StatCard, PriorityBadge, RoleBadge, getTimeOfDay } from '@/components/works/ui';

export function DashboardView({ currentUser, workItems, projects, sprints, sprintItems, unreadCount, myItems, userRole, setView, setSelectedItem, fetchSprints, fetchNotifications }) {
  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-navy">Good {getTimeOfDay()}, {currentUser.fullName.split(' ')[0]} 👋</h1>
        <p className="text-sm text-neutral-400 mt-0.5">Here's what needs your attention today</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Assigned to me" value={myItems.filter(i => i.status !== 'Done').length} sub={`${myItems.length} total`} color="text-brand-navy" icon="👤" onClick={() => setView('myworks')} />
        <StatCard label="Active sprint items" value={sprints.find(s=>s.status==='ACTIVE') ? sprintItems.filter(i=>i.status!=='Done').length : '—'} sub={sprints.find(s=>s.status==='ACTIVE')?.name || 'No active sprint'} color="text-semantic-success" icon="⚡" onClick={() => { fetchSprints(); setView('sprint'); }} />
        <StatCard label="Unread notifications" value={unreadCount} sub="Click to view all" color="text-brand-orange" icon="🔔" onClick={() => { fetchNotifications(); setView('notifications'); }} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
          <h3 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2"><span>📅</span> Due Soon</h3>
          {workItems.filter(i => i.dueDate && i.status !== 'Done').sort((a,b) => new Date(a.dueDate)-new Date(b.dueDate)).slice(0,5).map(item => (
            <div key={item.id} onClick={() => setSelectedItem(item)} className="flex items-center gap-3 py-2 border-b border-neutral-50 dark:border-neutral-700 last:border-0 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700 -mx-2 px-2 rounded">
              <TypeBadge type={item.type} compact />
              <span className="flex-1 text-sm text-neutral-900 truncate">{item.title}</span>
              <span className={`text-xs font-medium ${new Date(item.dueDate) < new Date() ? 'text-semantic-danger' : 'text-semantic-warning'}`}>{item.dueDate}</span>
            </div>
          ))}
          {workItems.filter(i => i.dueDate && i.status !== 'Done').length === 0 && <p className="text-sm text-neutral-400 text-center py-4">No upcoming due dates 🎉</p>}
        </div>

        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
          <h3 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2"><span>🔥</span> High Priority Open</h3>
          {workItems.filter(i => (i.priority==='CRITICAL'||i.priority==='HIGH') && i.status!=='Done').slice(0,5).map(item => (
            <div key={item.id} onClick={() => setSelectedItem(item)} className="flex items-center gap-3 py-2 border-b border-neutral-50 dark:border-neutral-700 last:border-0 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700 -mx-2 px-2 rounded">
              <PriorityBadge priority={item.priority} />
              <span className="flex-1 text-sm text-neutral-900 truncate">{item.title}</span>
              <StatusBadge category={statusToCategory(item.status)}>{item.status}</StatusBadge>
            </div>
          ))}
          {workItems.filter(i => (i.priority==='CRITICAL'||i.priority==='HIGH') && i.status!=='Done').length === 0 && <p className="text-sm text-neutral-400 text-center py-4">No critical/high items 🎉</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
          <h3 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2"><span>📁</span> Project Health</h3>
          {projects.filter(p => !p.archived).map(p => {
            const items = workItems.filter(i => i.projectId === p.id);
            const done = items.filter(i => i.status==='Done').length;
            const pct = items.length > 0 ? Math.round((done/items.length)*100) : 0;
            return (
              <div key={p.id} className="mb-3 last:mb-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-neutral-900">{p.name}</span>
                  <span className="text-xs text-neutral-400">{done}/{items.length} done · {pct}%</span>
                </div>
                <div className="h-1.5 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <div className="h-full bg-semantic-success rounded-full" style={{width:`${pct}%`}}></div>
                </div>
              </div>
            );
          })}
          {projects.length===0 && <p className="text-sm text-neutral-400 text-center py-4">No projects yet</p>}
        </div>

        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
          <h3 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2"><span>🔐</span> Your Access</h3>
          <div className="flex items-center gap-3 mb-4">
            <Avatar name={currentUser.fullName} size={8} />
            <div>
              <p className="font-semibold text-neutral-900">{currentUser.fullName}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <RoleBadge role={userRole.role} tier={userRole.tier} />
                <span className="text-xs text-neutral-400">Tier {userRole.tier}/5</span>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            {[
              { perm: 'create_items',    label: 'Create work items' },
              { perm: 'manage_sprints',  label: 'Manage sprints' },
              { perm: 'manage_projects', label: 'Manage projects' },
              { perm: 'invite_members',  label: 'Invite members' },
              { perm: 'manage_roles',    label: 'Manage roles' },
            ].map(p => (
              <div key={p.perm} className="flex items-center justify-between py-1 border-b border-neutral-50 dark:border-neutral-700 last:border-0">
                <span className="text-sm text-neutral-700">{p.label}</span>
                <span className={`text-xs font-semibold ${userRole.permissions.includes(p.perm) ? 'text-semantic-success' : 'text-neutral-300'}`}>
                  {userRole.permissions.includes(p.perm) ? '✓' : '✕'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
