import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/works/button';
import { StatusBadge, statusToCategory } from '@/components/works/status-badge';
import { Logo } from '@/components/works/logo';

const API = 'http://localhost:8080/api/v1';

function getInitials(name) {
  if (!name) return '??';
  const parts = name.split(' ');
  return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
}

function Avatar({ name, size = 8 }) {
  const sz = { 5: 'w-5 h-5 text-[9px]', 6: 'w-6 h-6 text-[10px]', 7: 'w-7 h-7 text-xs', 8: 'w-8 h-8 text-xs' };
  return (
    <div className={`${sz[size] || 'w-8 h-8 text-xs'} rounded-full bg-brand-navy text-white flex items-center justify-center font-semibold flex-shrink-0`}>
      {getInitials(name)}
    </div>
  );
}

const TYPES = {
  Task:            { color: 'bg-brand-navy-tint',      icon: '✓' },
  Story:           { color: 'bg-brand-teal',           icon: '📖' },
  Bug:             { color: 'bg-semantic-danger',       icon: '🐛' },
  Epic:            { color: 'bg-purple-700',            icon: '⚡' },
  'Sub-task':      { color: 'bg-neutral-600',          icon: '↳' },
  Incident:        { color: 'bg-semantic-warning',     icon: '🔥' },
  'Service Request': { color: 'bg-brand-navy',         icon: '🎫' },
};

function TypeBadge({ type, compact = false }) {
  const t = TYPES[type] || TYPES.Task;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-white px-1.5 py-0.5 rounded-sm ${t.color}`}>
      {!compact && <span>{t.icon}</span>}
      {type}
    </span>
  );
}

// Empty state helper
function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center text-3xl mb-4">{icon}</div>
      <h3 className="text-base font-semibold text-neutral-700 mb-1">{title}</h3>
      <p className="text-sm text-neutral-400 mb-5 max-w-xs">{subtitle}</p>
      {action}
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser]   = useState(null);
  const [token, setToken]               = useState(null);
  const [authMode, setAuthMode]         = useState('login');
  const [authForm, setAuthForm]         = useState({ email: '', password: '', fullName: '' });
  const [authError, setAuthError]       = useState('');
  const [forgotMode, setForgotMode]     = useState(false);
  const [forgotEmail, setForgotEmail]   = useState('');
  const [forgotMsg, setForgotMsg]       = useState('');

  const [view, setView]                 = useState('board');
  const [workItems, setWorkItems]       = useState([]);
  const [projects, setProjects]         = useState([]);
  const [users, setUsers]               = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]   = useState(0);
  const [loading, setLoading]           = useState(true);

  const [selectedItem, setSelectedItem] = useState(null);
  const [comments, setComments]         = useState([]);
  const [newComment, setNewComment]     = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const [newItem, setNewItem]           = useState({ title: '', type: 'Task', description: '', assigneeId: '', dueDate: '', tags: '' });
  const [newProject, setNewProject]     = useState({ name: '', keyPrefix: '', description: '' });
  const [createError, setCreateError]   = useState('');

  const [searchQuery, setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen]     = useState(false);
  const searchRef                       = useRef(null);

  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [inviteEmail, setInviteEmail]   = useState('');
  const [inviteMsg, setInviteMsg]       = useState('');

  // Kanban density: compact | comfortable | spacious
  const [density, setDensity]           = useState('comfortable');

  // Workspace switcher dropdown
  const [wsOpen, setWsOpen]             = useState(false);
  const wsRef                           = useRef(null);

  const workspace = { id: 'WS-001', name: 'BCITS Master Workspace' };

  const headers = (extra = {}) => ({
    'Content-Type': 'application/json',
    ...(currentUser ? { 'X-User-Id': currentUser.id } : {}),
    ...extra
  });

  useEffect(() => {
    const saved = localStorage.getItem('bSmartSession');
    if (saved) {
      const { user, token } = JSON.parse(saved);
      setCurrentUser(user); setToken(token);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchAll();
      const iv = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(iv);
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedItem) {
      fetch(`${API}/work-items/${selectedItem.id}/comments`)
        .then(r => r.json()).then(setComments).catch(() => {});
    }
  }, [selectedItem?.id]);

  // Close workspace dropdown on outside click
  useEffect(() => {
    function handler(e) { if (wsRef.current && !wsRef.current.contains(e.target)) setWsOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function fetchAll() {
    setLoading(true);
    Promise.all([
      fetch(`${API}/work-items`).then(r => r.json()),
      fetch(`${API}/projects`).then(r => r.json()),
      fetch(`${API}/users`).then(r => r.json()),
    ]).then(([items, projs, usrs]) => {
      setWorkItems(Array.isArray(items) ? items : []);
      setProjects(Array.isArray(projs) ? projs : []);
      setUsers(Array.isArray(usrs) ? usrs : []);
      setLoading(false);
    }).catch(() => setLoading(false));
    fetchUnreadCount();
  }

  function fetchUnreadCount() {
    if (!currentUser) return;
    fetch(`${API}/notifications/unread-count?userId=${currentUser.id}`)
      .then(r => r.json()).then(d => setUnreadCount(d.count || 0)).catch(() => {});
  }

  function fetchNotifications() {
    fetch(`${API}/notifications?userId=${currentUser.id}`)
      .then(r => r.json()).then(d => setNotifications(Array.isArray(d) ? d : [])).catch(() => {});
  }

  // AUTH
  const handleAuthSubmit = (e) => {
    e.preventDefault(); setAuthError('');
    fetch(`${API}/auth${authMode === 'login' ? '/login' : '/signup'}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authForm)
    }).then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      return data;
    }).then(data => {
      setCurrentUser(data.user); setToken(data.token);
      localStorage.setItem('bSmartSession', JSON.stringify({ user: data.user, token: data.token }));
    }).catch(err => setAuthError(err.message));
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    fetch(`${API}/auth/forgot-password`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: forgotEmail })
    }).then(r => r.json()).then(d => setForgotMsg(d.message)).catch(() => setForgotMsg('Error. Please try again.'));
  };

  const handleLogout = () => {
    setCurrentUser(null); setToken(null);
    localStorage.removeItem('bSmartSession');
  };

  // WORK ITEMS
  const handleCreate = () => {
    if (!newItem.title || newItem.title.length < 3) { setCreateError('Title must be at least 3 characters.'); return; }
    setCreateError('');
    const tags = newItem.tags ? newItem.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    fetch(`${API}/work-items`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ ...newItem, tags, dueDate: newItem.dueDate || null, assigneeId: newItem.assigneeId || null })
    }).then(r => r.json()).then(saved => {
      setWorkItems(prev => [...prev, saved]);
      setNewItem({ title: '', type: 'Task', description: '', assigneeId: '', dueDate: '', tags: '' });
      setIsCreateOpen(false);
    });
  };

  const handleDelete = (id) => {
    if (!window.confirm('Delete this work item?')) return;
    fetch(`${API}/work-items/${id}`, { method: 'DELETE', headers: headers() })
      .then(() => { setWorkItems(prev => prev.filter(i => i.id !== id)); if (selectedItem?.id === id) setSelectedItem(null); });
  };

  const handleDragStart = (e, id) => e.dataTransfer.setData('itemId', id);
  const handleDragOver  = (e) => e.preventDefault();
  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('itemId');
    const item = workItems.find(i => i.id === itemId);
    if (!item || item.status === newStatus) return;
    setWorkItems(prev => prev.map(i => i.id === itemId ? { ...i, status: newStatus } : i));
    fetch(`${API}/work-items/${itemId}`, {
      method: 'PUT', headers: headers(),
      body: JSON.stringify({ ...item, status: newStatus })
    }).catch(() => {});
  };

  const handleUpdateItem = (updated) => {
    fetch(`${API}/work-items/${updated.id}`, {
      method: 'PUT', headers: headers(),
      body: JSON.stringify({ ...updated, tags: updated.tags || [] })
    }).then(r => r.json()).then(saved => {
      setWorkItems(prev => prev.map(i => i.id === saved.id ? saved : i));
      setSelectedItem(saved);
    });
  };

  // COMMENTS
  const handleAddComment = () => {
    if (!newComment.trim()) return;
    fetch(`${API}/work-items/${selectedItem.id}/comments`, {
      method: 'POST', headers: headers(), body: JSON.stringify({ body: newComment })
    }).then(r => r.json()).then(c => { setComments(prev => [...prev, c]); setNewComment(''); });
  };

  // SEARCH
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      fetch(`${API}/work-items/search?q=${encodeURIComponent(searchQuery)}`)
        .then(r => r.json()).then(d => setSearchResults(Array.isArray(d) ? d : [])).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // PROJECTS
  const handleCreateProject = () => {
    if (!newProject.name || !newProject.keyPrefix) { setCreateError('Name and key prefix required.'); return; }
    fetch(`${API}/projects`, { method: 'POST', headers: headers(), body: JSON.stringify(newProject) })
      .then(r => r.json()).then(p => {
        setProjects(prev => [...prev, p]);
        setNewProject({ name: '', keyPrefix: '', description: '' });
        setIsProjectOpen(false);
      });
  };

  // WORKSPACE
  const fetchMembers = () => {
    fetch(`${API}/workspaces/WS-001/members`)
      .then(r => r.json()).then(d => setWorkspaceMembers(Array.isArray(d) ? d : [])).catch(() => {});
  };

  const handleInvite = () => {
    fetch(`${API}/workspaces/WS-001/members`, {
      method: 'POST', headers: headers(), body: JSON.stringify({ email: inviteEmail, role: 'MEMBER' })
    }).then(r => r.json()).then(d => { setInviteMsg(d.message || 'Added!'); setInviteEmail(''); fetchMembers(); })
      .catch(() => setInviteMsg('Error — user may not exist.'));
  };

  const handleRemoveMember = (userId) => {
    fetch(`${API}/workspaces/WS-001/members/${userId}`, { method: 'DELETE', headers: headers() })
      .then(() => fetchMembers());
  };

  const columns = [
    { name: 'Todo',        dot: 'bg-neutral-400' },
    { name: 'In Progress', dot: 'bg-brand-navy-tint' },
    { name: 'Done',        dot: 'bg-brand-teal' },
  ];

  const densityPad = { compact: 'p-2', comfortable: 'p-3', spacious: 'p-4' };
  const userName = u => users.find(x => x.id === u)?.fullName || '';
  const myItems  = workItems.filter(i => i.assigneeId === currentUser?.id);

  // ==========================================
  // AUTH SCREENS
  // ==========================================
  if (!currentUser) {
    if (forgotMode) return (
      <div className="flex h-screen bg-neutral-100 items-center justify-center font-sans">
        <div className="bg-white p-8 rounded-xl shadow-xl w-96 border border-neutral-200">
          <div className="flex justify-center mb-6"><Logo /></div>
          <h2 className="text-xl font-bold text-brand-navy text-center mb-4">Reset Password</h2>
          {forgotMsg
            ? <div className="text-semantic-success bg-semantic-success-surface p-3 rounded text-sm text-center mb-4">{forgotMsg}</div>
            : <form onSubmit={handleForgotPassword} className="space-y-4">
                <input type="email" required placeholder="Your email address" value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)} className="input" />
                <Button type="submit" fullWidth>Send Reset Link</Button>
              </form>
          }
          <div className="mt-4 text-center">
            <button onClick={() => { setForgotMode(false); setForgotMsg(''); }}
              className="text-brand-orange text-sm font-bold hover:underline">← Back to Sign In</button>
          </div>
        </div>
      </div>
    );

    return (
      <div className="flex h-screen bg-neutral-100 items-center justify-center font-sans">
        <div className="bg-white p-8 rounded-xl shadow-xl w-96 border border-neutral-200">
          <div className="flex justify-center mb-8"><Logo /></div>
          <h2 className="text-xl font-bold text-brand-navy text-center mb-6">
            {authMode === 'login' ? 'Sign in to your account' : 'Create your account'}
          </h2>
          {authError && <div className="bg-semantic-danger-surface text-semantic-danger text-sm p-3 rounded-md mb-4 text-center">{authError}</div>}
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === 'signup' && (
              <Field label="Full Name">
                <input type="text" required value={authForm.fullName}
                  onChange={e => setAuthForm({ ...authForm, fullName: e.target.value })} className="input" />
              </Field>
            )}
            <Field label="Email">
              <input type="email" required value={authForm.email}
                onChange={e => setAuthForm({ ...authForm, email: e.target.value })} className="input" />
            </Field>
            <Field label="Password">
              <input type="password" required value={authForm.password}
                onChange={e => setAuthForm({ ...authForm, password: e.target.value })} className="input" />
            </Field>
            <Button type="submit" variant="action" fullWidth>
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>
          {authMode === 'login' && (
            <div className="mt-3 text-center">
              <button onClick={() => setForgotMode(true)} className="text-neutral-400 text-sm hover:underline">Forgot password?</button>
            </div>
          )}
          <div className="mt-4 text-center text-sm text-neutral-600">
            {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); }}
              className="text-brand-orange font-bold hover:underline">
              {authMode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // MAIN APP
  // ==========================================
  return (
    <div className="flex h-screen bg-neutral-50 font-sans text-neutral-900">

      {/* SIDEBAR */}
      <aside className="w-60 bg-white border-r border-neutral-200 flex flex-col z-10 flex-shrink-0">
        {/* Workspace switcher */}
        <div className="h-14 flex items-center px-3 border-b border-neutral-200 relative" ref={wsRef}>
          <button onClick={() => setWsOpen(o => !o)}
            className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-neutral-100 transition-colors text-left">
            <div className="w-6 h-6 rounded bg-brand-navy flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[10px] font-bold">BC</span>
            </div>
            <span className="text-sm font-semibold text-neutral-900 truncate flex-1">{workspace.name}</span>
            <span className="text-neutral-400 text-xs">⌄</span>
          </button>
          {wsOpen && (
            <div className="absolute top-full left-3 right-3 mt-1 bg-white rounded-lg shadow-xl border border-neutral-200 z-50 py-1">
              <div className="px-3 py-2 border-b border-neutral-100">
                <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Workspaces</p>
              </div>
              <button className="w-full flex items-center gap-2 px-3 py-2 hover:bg-neutral-50 text-left">
                <div className="w-5 h-5 rounded bg-brand-navy flex items-center justify-center">
                  <span className="text-white text-[9px] font-bold">BC</span>
                </div>
                <span className="text-sm font-medium text-neutral-900">{workspace.name}</span>
                <span className="ml-auto text-brand-orange text-xs">✓</span>
              </button>
              <div className="border-t border-neutral-100 mt-1 pt-1">
                <button onClick={() => { setView('workspace'); fetchMembers(); setWsOpen(false); }}
                  className="w-full px-3 py-2 text-xs text-neutral-400 hover:text-brand-navy hover:bg-neutral-50 text-left">
                  ⚙ Workspace Settings
                </button>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-0.5 text-sm overflow-y-auto">
          <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-3 pt-3 pb-1">My Work</p>
          <NavItem active={view === 'myworks'} onClick={() => setView('myworks')} icon="👤">
            My Works
            {myItems.length > 0 && <span className="ml-auto text-[10px] bg-neutral-100 text-neutral-600 rounded-full px-1.5 py-0.5">{myItems.length}</span>}
          </NavItem>
          <NavItem active={view === 'notifications'} onClick={() => { setView('notifications'); fetchNotifications(); }} icon="🔔">
            Notifications
            {unreadCount > 0 && <span className="ml-auto text-[10px] bg-brand-orange text-white rounded-full px-1.5 py-0.5">{unreadCount}</span>}
          </NavItem>

          <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-3 pt-3 pb-1">Projects</p>
          <NavItem active={view === 'board'} onClick={() => setView('board')} icon="📋">Board</NavItem>
          <NavItem active={view === 'projects'} onClick={() => setView('projects')} icon="📁">
            Projects
            {projects.length > 0 && <span className="ml-auto text-[10px] bg-neutral-100 text-neutral-600 rounded-full px-1.5 py-0.5">{projects.length}</span>}
          </NavItem>

          <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-3 pt-3 pb-1">Workspace</p>
          <NavItem active={view === 'workspace'} onClick={() => { setView('workspace'); fetchMembers(); }} icon="⚙️">Settings</NavItem>
        </nav>

        <div className="p-3 border-t border-neutral-200">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-neutral-50 cursor-pointer">
            <Avatar name={currentUser.fullName} size={7} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-neutral-900 truncate">{currentUser.fullName}</p>
              <p className="text-[10px] text-neutral-400 truncate">{currentUser.email}</p>
            </div>
            <button onClick={handleLogout} title="Sign out" className="text-neutral-400 hover:text-brand-orange text-sm">↩</button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* TOPBAR */}
        <header className="h-14 bg-white border-b border-neutral-200 flex items-center justify-between px-6 flex-shrink-0 relative">
          <div className="relative" ref={searchRef}>
            <input type="text" placeholder="Search work items..."
              value={searchQuery}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-neutral-100 rounded-md px-3 py-1.5 w-72 text-sm focus:outline-none focus:ring-1 focus:ring-brand-navy" />
            {searchOpen && searchResults.length > 0 && (
              <div className="absolute top-full mt-1 w-80 bg-white rounded-lg shadow-xl border border-neutral-200 z-50 max-h-64 overflow-y-auto">
                {searchResults.map(item => (
                  <button key={item.id} onClick={() => { setSelectedItem(item); setSearchQuery(''); setSearchOpen(false); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-neutral-50 border-b border-neutral-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <TypeBadge type={item.type} compact />
                      <span className="font-mono text-[10px] text-neutral-400">{item.id}</span>
                    </div>
                    <div className="text-sm text-neutral-900 font-medium mt-0.5">{item.title}</div>
                  </button>
                ))}
              </div>
            )}
            {searchOpen && searchQuery.trim() && searchResults.length === 0 && (
              <div className="absolute top-full mt-1 w-80 bg-white rounded-lg shadow-xl border border-neutral-200 z-50 px-4 py-6 text-center">
                <p className="text-sm text-neutral-400">No results for "<span className="text-neutral-700">{searchQuery}</span>"</p>
              </div>
            )}
          </div>
          <Button variant="action" onClick={() => { setView('board'); setIsCreateOpen(true); }}>
            + Create
          </Button>
        </header>

        {/* CONTENT */}
        <div className="flex-1 overflow-auto">

          {/* MY WORKS */}
          {view === 'myworks' && (
            <div className="p-8 max-w-4xl">
              <h1 className="text-2xl font-bold text-brand-navy mb-1">My Works</h1>
              <p className="text-sm text-neutral-400 mb-6">Items assigned to you across all projects</p>
              {myItems.length === 0
                ? <EmptyState icon="👤" title="Nothing assigned to you"
                    subtitle="Work items assigned to you will appear here. Ask your team lead to assign some tasks."
                    action={<Button variant="secondary" size="sm" onClick={() => setIsCreateOpen(true)}>Create a work item</Button>} />
                : (
                  <div className="space-y-2">
                    {myItems.map(item => (
                      <div key={item.id} onClick={() => setSelectedItem(item)}
                        className="bg-white border border-neutral-200 rounded-lg p-4 flex items-center gap-4 hover:shadow-sm cursor-pointer transition-shadow">
                        <TypeBadge type={item.type} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 truncate">{item.title}</p>
                          <p className="text-xs text-neutral-400 font-mono">{item.id}</p>
                        </div>
                        <StatusBadge category={statusToCategory(item.status)}>{item.status}</StatusBadge>
                        {item.dueDate && (
                          <span className="text-xs text-semantic-warning font-medium whitespace-nowrap">Due {item.dueDate}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
          )}

          {/* BOARD */}
          {view === 'board' && (
            <div className="p-6 h-full flex flex-col">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h1 className="text-xl font-bold text-brand-navy">Board</h1>
                  <p className="text-xs text-neutral-400 mt-0.5">{workItems.length} items total</p>
                </div>
                {/* Density toggle */}
                <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-1">
                  {['compact', 'comfortable', 'spacious'].map(d => (
                    <button key={d} onClick={() => setDensity(d)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${density === d ? 'bg-white shadow-sm text-brand-navy' : 'text-neutral-400 hover:text-neutral-700'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              {loading
                ? <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-brand-navy border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                      <p className="text-sm text-neutral-400">Loading board...</p>
                    </div>
                  </div>
                : (
                  <div className="flex gap-4 flex-1 overflow-x-auto pb-4">
                    {columns.map(col => {
                      const colItems = workItems.filter(i => i.status === col.name);
                      return (
                        <div key={col.name}
                          className="flex-1 min-w-56 flex flex-col bg-neutral-100 rounded-xl p-3"
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, col.name)}>
                          <div className="flex items-center justify-between mb-3 px-1">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${col.dot}`}></span>
                              <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">{col.name}</h3>
                            </div>
                            <span className="text-xs bg-white text-neutral-500 px-2 py-0.5 rounded-full shadow-sm">{colItems.length}</span>
                          </div>
                          <div className="space-y-2 flex-1">
                            {colItems.length === 0 && (
                              <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-neutral-200 rounded-lg">
                                <p className="text-xs text-neutral-400">Drop items here</p>
                              </div>
                            )}
                            {colItems.map(item => (
                              <div key={item.id} draggable
                                onDragStart={(e) => handleDragStart(e, item.id)}
                                className={`bg-white rounded-lg shadow-sm border border-neutral-200 cursor-grab hover:shadow-md transition-shadow group ${densityPad[density]}`}>
                                <div className="flex items-start justify-between mb-1.5">
                                  <span className="font-mono text-[10px] text-neutral-400">{item.id}</span>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setSelectedItem(item)} className="text-neutral-400 hover:text-brand-navy text-xs p-0.5">✏</button>
                                    <button onClick={() => handleDelete(item.id)} className="text-neutral-400 hover:text-semantic-danger text-xs p-0.5">✕</button>
                                  </div>
                                </div>
                                <p className="text-sm font-medium text-neutral-900 leading-snug mb-2 cursor-pointer"
                                  onClick={() => setSelectedItem(item)}>{item.title}</p>
                                {density !== 'compact' && item.description && (
                                  <p className="text-xs text-neutral-400 mb-2 line-clamp-2">{item.description}</p>
                                )}
                                <div className="flex items-center justify-between">
                                  <TypeBadge type={item.type} compact={density === 'compact'} />
                                  <div className="flex items-center gap-1.5">
                                    {item.dueDate && <span className="text-[10px] text-semantic-warning font-medium">{item.dueDate}</span>}
                                    {item.assigneeId && <Avatar name={userName(item.assigneeId)} size={5} />}
                                  </div>
                                </div>
                                {density !== 'compact' && item.tags && item.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {item.tags.map(t => (
                                      <span key={t} className="text-[10px] bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded">{t}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          {/* Add item shortcut */}
                          <button onClick={() => { setNewItem(p => ({ ...p, status: col.name })); setIsCreateOpen(true); }}
                            className="mt-2 w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-neutral-400 hover:text-neutral-700 hover:bg-white rounded-lg transition-colors">
                            <span>+</span> Add item
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )
              }
            </div>
          )}

          {/* PROJECTS */}
          {view === 'projects' && (
            <div className="p-8 max-w-4xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-brand-navy">Projects</h1>
                  <p className="text-sm text-neutral-400 mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''} in this workspace</p>
                </div>
                <Button variant="action" onClick={() => setIsProjectOpen(true)}>+ New Project</Button>
              </div>
              {projects.length === 0
                ? <EmptyState icon="📁" title="No projects yet"
                    subtitle="Projects help you organise work items into focused areas. Create your first project to get started."
                    action={<Button variant="action" onClick={() => setIsProjectOpen(true)}>Create first project</Button>} />
                : (
                  <div className="space-y-3">
                    {projects.map(p => {
                      const count = workItems.filter(i => i.projectId === p.id).length;
                      const done  = workItems.filter(i => i.projectId === p.id && i.status === 'Done').length;
                      return (
                        <div key={p.id} className="bg-white border border-neutral-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-brand-navy rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{p.keyPrefix}</div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-neutral-900">{p.name}</h3>
                              <p className="text-xs text-neutral-400 mt-0.5">{p.description || 'No description'}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-semibold text-neutral-900">{count} items</p>
                              {count > 0 && <p className="text-xs text-semantic-success">{done} done</p>}
                              {p.leadUserId && <p className="text-xs text-neutral-400 mt-0.5">Lead: {userName(p.leadUserId)}</p>}
                            </div>
                          </div>
                          {count > 0 && (
                            <div className="mt-3">
                              <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                                <div className="h-full bg-brand-teal rounded-full transition-all" style={{ width: `${Math.round((done / count) * 100)}%` }}></div>
                              </div>
                              <p className="text-[10px] text-neutral-400 mt-1">{Math.round((done / count) * 100)}% complete</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              }
            </div>
          )}

          {/* NOTIFICATIONS */}
          {view === 'notifications' && (
            <div className="p-8 max-w-2xl">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-brand-navy">Notifications</h1>
                {unreadCount > 0 && (
                  <button onClick={() => {
                    fetch(`${API}/notifications/mark-all-read?userId=${currentUser.id}`, { method: 'PUT' })
                      .then(() => { fetchNotifications(); setUnreadCount(0); });
                  }} className="text-sm text-brand-navy-tint hover:underline">Mark all as read</button>
                )}
              </div>
              {notifications.length === 0
                ? <EmptyState icon="🔔" title="You're all caught up"
                    subtitle="Notifications about assignments, comments, and mentions will appear here." />
                : (
                  <div className="space-y-2">
                    {notifications.map(n => (
                      <div key={n.id}
                        className={`bg-white border rounded-xl p-4 flex gap-3 items-start transition-colors ${!n.read ? 'border-brand-navy-tint/30 bg-semantic-info-surface/30' : 'border-neutral-200'}`}>
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!n.read ? 'bg-brand-orange' : 'bg-transparent'}`}></div>
                        <div className="flex-1">
                          <p className="text-sm text-neutral-900">{n.message}</p>
                          <p className="text-xs text-neutral-400 mt-1">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</p>
                        </div>
                        {!n.read && (
                          <button onClick={() => {
                            fetch(`${API}/notifications/${n.id}/read`, { method: 'PUT' })
                              .then(() => { fetchNotifications(); fetchUnreadCount(); });
                          }} className="text-xs text-neutral-400 hover:text-brand-navy mt-0.5">✓</button>
                        )}
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
          )}

          {/* WORKSPACE SETTINGS */}
          {view === 'workspace' && (
            <div className="p-8 max-w-3xl">
              <h1 className="text-2xl font-bold text-brand-navy mb-1">Workspace Settings</h1>
              <p className="text-sm text-neutral-400 mb-6">BCITS Master Workspace</p>
              <div className="bg-white rounded-xl border border-neutral-200 p-6 mb-6">
                <h2 className="font-semibold text-neutral-900 mb-1">Members</h2>
                <p className="text-sm text-neutral-400 mb-4">People who have access to this workspace</p>
                <div className="space-y-1 mb-5">
                  {workspaceMembers.length === 0
                    ? <p className="text-sm text-neutral-400 py-4 text-center">Loading members...</p>
                    : workspaceMembers.map(m => (
                      <div key={m.id} className="flex items-center gap-3 py-2.5 border-b border-neutral-100 last:border-0">
                        <Avatar name={m.fullName} size={8} />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-neutral-900">{m.fullName}</p>
                          <p className="text-xs text-neutral-400">{m.email}</p>
                        </div>
                        <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">{m.role}</span>
                        {m.id !== currentUser.id && (
                          <button onClick={() => handleRemoveMember(m.id)}
                            className="text-xs text-neutral-400 hover:text-semantic-danger transition-colors">Remove</button>
                        )}
                      </div>
                    ))
                  }
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-700 mb-2">Invite a member</h3>
                  <div className="flex gap-2">
                    <input type="email" placeholder="colleague@bcits.com"
                      value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleInvite()}
                      className="input flex-1" />
                    <Button onClick={handleInvite}>Invite</Button>
                  </div>
                  {inviteMsg && <p className="text-xs text-semantic-success mt-2">{inviteMsg}</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* DETAIL PANEL */}
      {selectedItem && (
        <div className="w-[480px] bg-white border-l border-neutral-200 flex flex-col h-screen overflow-hidden flex-shrink-0">
          <div className="h-14 flex items-center justify-between px-5 border-b border-neutral-200">
            <div className="flex items-center gap-2">
              <TypeBadge type={selectedItem.type} compact />
              <span className="font-mono text-xs text-neutral-400">{selectedItem.id}</span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => handleDelete(selectedItem.id)}
                className="text-xs text-neutral-400 hover:text-semantic-danger px-2 py-1 rounded hover:bg-neutral-50 transition-colors">Delete</button>
              <button onClick={() => setSelectedItem(null)}
                className="text-neutral-400 hover:text-neutral-900 p-1 rounded hover:bg-neutral-50 transition-colors">✕</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <input className="w-full text-lg font-bold text-neutral-900 focus:outline-none border-b border-transparent focus:border-neutral-200 pb-1 bg-transparent"
              value={selectedItem.title}
              onChange={e => setSelectedItem({ ...selectedItem, title: e.target.value })}
              onBlur={() => handleUpdateItem(selectedItem)} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-neutral-400 mb-1 font-medium">Status</label>
                <select value={selectedItem.status}
                  onChange={e => { const u = { ...selectedItem, status: e.target.value }; setSelectedItem(u); handleUpdateItem(u); }}
                  className="input">
                  <option>Todo</option><option>In Progress</option><option>Done</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1 font-medium">Type</label>
                <select value={selectedItem.type}
                  onChange={e => { const u = { ...selectedItem, type: e.target.value }; setSelectedItem(u); handleUpdateItem(u); }}
                  className="input">
                  {Object.keys(TYPES).map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1 font-medium">Assignee</label>
                <select value={selectedItem.assigneeId || ''}
                  onChange={e => { const u = { ...selectedItem, assigneeId: e.target.value || null }; setSelectedItem(u); handleUpdateItem(u); }}
                  className="input">
                  <option value="">Unassigned</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1 font-medium">Due Date</label>
                <input type="date" value={selectedItem.dueDate || ''}
                  onChange={e => { const u = { ...selectedItem, dueDate: e.target.value || null }; setSelectedItem(u); handleUpdateItem(u); }}
                  className="input" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-1 font-medium">Tags</label>
              <input type="text" value={(selectedItem.tags || []).join(', ')}
                onChange={e => setSelectedItem({ ...selectedItem, tags: e.target.value.split(',').map(t => t.trim()) })}
                onBlur={() => handleUpdateItem(selectedItem)}
                placeholder="frontend, urgent, api"
                className="input" />
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-1 font-medium">Description</label>
              <textarea rows={4} value={selectedItem.description || ''}
                onChange={e => setSelectedItem({ ...selectedItem, description: e.target.value })}
                onBlur={() => handleUpdateItem(selectedItem)}
                placeholder="Add a description..."
                className="input resize-none" />
            </div>

            <div>
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
                Activity · {comments.length} comment{comments.length !== 1 ? 's' : ''}
              </h3>
              {comments.length === 0 && (
                <p className="text-xs text-neutral-400 text-center py-3">No comments yet. Be the first to comment.</p>
              )}
              <div className="space-y-3 mb-4">
                {comments.map(c => (
                  <div key={c.id} className="flex gap-2.5">
                    <Avatar name={c.authorName || '?'} size={7} />
                    <div className="flex-1 bg-neutral-50 rounded-xl px-3 py-2.5 border border-neutral-100">
                      <p className="text-xs font-semibold text-neutral-900 mb-0.5">{c.authorName}</p>
                      <p className="text-sm text-neutral-700 leading-relaxed">{c.body}</p>
                      <p className="text-[10px] text-neutral-400 mt-1.5">{c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2.5">
                <Avatar name={currentUser.fullName} size={7} />
                <div className="flex-1 flex gap-2">
                  <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                    placeholder="Write a comment... (Enter to send)"
                    className="flex-1 border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-navy" />
                  <Button size="sm" onClick={handleAddComment}>Send</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE WORK ITEM MODAL */}
      {isCreateOpen && (
        <Modal title="New Work Item" onClose={() => { setIsCreateOpen(false); setCreateError(''); }}>
          {createError && <div className="text-semantic-danger bg-semantic-danger-surface p-2 text-sm rounded mb-3">{createError}</div>}
          <div className="space-y-3">
            <Field label="Title *">
              <input type="text" value={newItem.title} onChange={e => setNewItem({ ...newItem, title: e.target.value })}
                className="input" placeholder="What needs to be done?" autoFocus />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select value={newItem.type} onChange={e => setNewItem({ ...newItem, type: e.target.value })} className="input">
                  {Object.keys(TYPES).map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Assignee">
                <select value={newItem.assigneeId} onChange={e => setNewItem({ ...newItem, assigneeId: e.target.value })} className="input">
                  <option value="">Unassigned</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Due Date">
              <input type="date" value={newItem.dueDate} onChange={e => setNewItem({ ...newItem, dueDate: e.target.value })} className="input" />
            </Field>
            <Field label="Tags (comma separated)">
              <input type="text" value={newItem.tags} onChange={e => setNewItem({ ...newItem, tags: e.target.value })}
                className="input" placeholder="frontend, urgent" />
            </Field>
            <Field label="Description">
              <textarea rows={3} value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                className="input resize-none" placeholder="Optional description..." />
            </Field>
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button variant="action" onClick={handleCreate}>Create Item</Button>
          </div>
        </Modal>
      )}

      {/* CREATE PROJECT MODAL */}
      {isProjectOpen && (
        <Modal title="New Project" onClose={() => { setIsProjectOpen(false); setCreateError(''); }}>
          {createError && <div className="text-semantic-danger bg-semantic-danger-surface p-2 text-sm rounded mb-3">{createError}</div>}
          <div className="space-y-3">
            <Field label="Project Name *">
              <input type="text" value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })}
                className="input" placeholder="e.g. WEB Portal" autoFocus />
            </Field>
            <Field label="Key Prefix *">
              <input type="text" maxLength={5} value={newProject.keyPrefix}
                onChange={e => setNewProject({ ...newProject, keyPrefix: e.target.value.toUpperCase() })}
                className="input" placeholder="e.g. WEB" />
              <p className="text-xs text-neutral-400 mt-1">3–5 uppercase letters used as item prefix (e.g. WEB-1234)</p>
            </Field>
            <Field label="Description">
              <textarea rows={2} value={newProject.description} onChange={e => setNewProject({ ...newProject, description: e.target.value })}
                className="input resize-none" placeholder="What is this project about?" />
            </Field>
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <Button variant="ghost" onClick={() => setIsProjectOpen(false)}>Cancel</Button>
            <Button variant="action" onClick={handleCreateProject}>Create Project</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function NavItem({ active, onClick, icon, children }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${active ? 'bg-neutral-100 text-brand-navy font-semibold' : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'}`}>
      <span className="text-base leading-none">{icon}</span>
      <span className="flex-1 text-left flex items-center">{children}</span>
    </button>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-neutral-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-neutral-200 flex justify-between items-center">
          <h2 className="text-lg font-bold text-brand-navy">{title}</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900 text-xl leading-none">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
