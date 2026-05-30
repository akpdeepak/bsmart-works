import React, { useState, useEffect, useRef } from 'react';

const API = 'http://localhost:8080/api/v1';

function Logo({ size = 'md' }) {
  const s = size === 'sm' ? { box: 'w-6 h-6', text: 'text-lg' } : { box: 'w-8 h-8', text: 'text-2xl' };
  return (
    <div className="flex items-center gap-2">
      <div className={`${s.box} bg-[#0B2F5C] rounded-md flex items-end p-1 relative overflow-hidden`}>
        <div className="w-1.5 h-2 bg-white absolute bottom-1 left-1"></div>
        <div className="w-1.5 h-3 bg-white absolute bottom-1 left-3"></div>
        <div className="w-2 h-2 bg-[#E94E1B] absolute top-0 right-0 transform rotate-45 translate-x-1 -translate-y-1"></div>
      </div>
      <span className={`font-light text-[#5A6B7E] ${s.text} leading-none tracking-tight`}>bSmart</span>
      <span className={`font-bold text-[#0B2F5C] ${s.text} leading-none tracking-tight`}>Works</span>
    </div>
  );
}

function getInitials(name) {
  if (!name) return '??';
  const parts = name.split(' ');
  return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
}

function Avatar({ name, size = 8 }) {
  return (
    <div className={`w-${size} h-${size} rounded-full bg-[#0B2F5C] text-white flex items-center justify-center text-xs font-semibold flex-shrink-0`}>
      {getInitials(name)}
    </div>
  );
}

const TYPE_COLORS = {
  Task: 'bg-[#1E4D8C]', Story: 'bg-[#0E7C5E]', Bug: 'bg-[#C0392B]',
  Epic: 'bg-[#6B21A8]', 'Sub-task': 'bg-[#5A6B7E]',
  Incident: 'bg-[#B97A00]', 'Service Request': 'bg-[#0B2F5C]'
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', fullName: '' });
  const [authError, setAuthError] = useState('');
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');

  const [view, setView] = useState('board'); // board | myworks | projects | workspace | notifications
  const [workItems, setWorkItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [selectedItem, setSelectedItem] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', type: 'Task', description: '', assigneeId: '', dueDate: '', tags: '' });
  const [newProject, setNewProject] = useState({ name: '', keyPrefix: '', description: '' });
  const [createError, setCreateError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);

  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMsg, setInviteMsg] = useState('');

  const headers = (extra = {}) => ({
    'Content-Type': 'application/json',
    ...(currentUser ? { 'X-User-Id': currentUser.id } : {}),
    ...extra
  });

  useEffect(() => {
    const saved = localStorage.getItem('bSmartSession');
    if (saved) {
      const { user, token } = JSON.parse(saved);
      setCurrentUser(user);
      setToken(token);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchAll();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedItem) {
      fetch(`${API}/work-items/${selectedItem.id}/comments`)
        .then(r => r.json()).then(setComments).catch(() => {});
    }
  }, [selectedItem]);

  function fetchAll() {
    setLoading(true);
    Promise.all([
      fetch(`${API}/work-items`).then(r => r.json()),
      fetch(`${API}/projects`).then(r => r.json()),
      fetch(`${API}/users`).then(r => r.json()),
    ]).then(([items, projs, usrs]) => {
      setWorkItems(items);
      setProjects(projs);
      setUsers(usrs);
      setLoading(false);
    }).catch(() => setLoading(false));
    fetchUnreadCount();
  }

  function fetchUnreadCount() {
    if (!currentUser) return;
    fetch(`${API}/notifications/unread-count?userId=${currentUser.id}`)
      .then(r => r.json()).then(d => setUnreadCount(d.count)).catch(() => {});
  }

  function fetchNotifications() {
    fetch(`${API}/notifications?userId=${currentUser.id}`)
      .then(r => r.json()).then(setNotifications).catch(() => {});
  }

  // --- AUTH ---
  const handleAuthSubmit = (e) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = authMode === 'login' ? '/login' : '/signup';
    fetch(`${API}/auth${endpoint}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authForm)
    }).then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      return data;
    }).then(data => {
      setCurrentUser(data.user);
      setToken(data.token);
      localStorage.setItem('bSmartSession', JSON.stringify({ user: data.user, token: data.token }));
    }).catch(err => setAuthError(err.message));
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    fetch(`${API}/auth/forgot-password`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: forgotEmail })
    }).then(r => r.json()).then(d => setForgotMsg(d.message)).catch(() => setForgotMsg('Error sending reset link.'));
  };

  const handleLogout = () => {
    setCurrentUser(null); setToken(null);
    localStorage.removeItem('bSmartSession');
  };

  // --- WORK ITEMS ---
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
      .then(() => {
        setWorkItems(prev => prev.filter(i => i.id !== id));
        if (selectedItem?.id === id) setSelectedItem(null);
      });
  };

  const handleDragStart = (e, id) => e.dataTransfer.setData('itemId', id);
  const handleDragOver = (e) => e.preventDefault();
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
    const tags = updated.tags || [];
    fetch(`${API}/work-items/${updated.id}`, {
      method: 'PUT', headers: headers(),
      body: JSON.stringify({ ...updated, tags })
    }).then(r => r.json()).then(saved => {
      setWorkItems(prev => prev.map(i => i.id === saved.id ? saved : i));
      setSelectedItem(saved);
    });
  };

  // --- COMMENTS ---
  const handleAddComment = () => {
    if (!newComment.trim()) return;
    fetch(`${API}/work-items/${selectedItem.id}/comments`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ body: newComment })
    }).then(r => r.json()).then(c => {
      setComments(prev => [...prev, c]);
      setNewComment('');
    });
  };

  // --- SEARCH ---
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      fetch(`${API}/work-items/search?q=${encodeURIComponent(searchQuery)}`)
        .then(r => r.json()).then(setSearchResults).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // --- PROJECTS ---
  const handleCreateProject = () => {
    if (!newProject.name || !newProject.keyPrefix) { setCreateError('Name and key prefix required.'); return; }
    fetch(`${API}/projects`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify(newProject)
    }).then(r => r.json()).then(p => {
      setProjects(prev => [...prev, p]);
      setNewProject({ name: '', keyPrefix: '', description: '' });
      setIsProjectOpen(false);
    });
  };

  // --- WORKSPACE ---
  const fetchMembers = () => {
    fetch(`${API}/workspaces/WS-001/members`)
      .then(r => r.json()).then(setWorkspaceMembers).catch(() => {});
  };

  const handleInvite = () => {
    fetch(`${API}/workspaces/WS-001/members`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ email: inviteEmail, role: 'MEMBER' })
    }).then(r => r.json()).then(d => {
      setInviteMsg(d.message || 'Added!');
      setInviteEmail('');
      fetchMembers();
    }).catch(() => setInviteMsg('Error adding member.'));
  };

  const handleRemoveMember = (userId) => {
    fetch(`${API}/workspaces/WS-001/members/${userId}`, { method: 'DELETE', headers: headers() })
      .then(() => fetchMembers());
  };

  const columns = [
    { name: 'Todo', color: 'bg-[#5A6B7E]' },
    { name: 'In Progress', color: 'bg-[#1E4D8C]' },
    { name: 'Done', color: 'bg-[#0E7C5E]' }
  ];

  // ==========================================
  // LOGIN / SIGNUP SCREEN
  // ==========================================
  if (!currentUser) {
    if (forgotMode) {
      return (
        <div className="flex h-screen bg-[#F2F4F8] items-center justify-center font-sans">
          <div className="bg-white p-8 rounded-lg shadow-xl w-96 border border-[#E5E9EF]">
            <div className="flex justify-center mb-6"><Logo /></div>
            <h2 className="text-xl font-bold text-[#0B2F5C] text-center mb-4">Reset Password</h2>
            {forgotMsg ? (
              <div className="text-green-700 bg-green-50 p-3 rounded text-sm text-center mb-4">{forgotMsg}</div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <input type="email" required placeholder="Your email address"
                  value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                  className="w-full border border-[#E5E9EF] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#0B2F5C]" />
                <button type="submit" className="w-full bg-[#0B2F5C] text-white py-2.5 rounded-md text-sm font-bold">Send Reset Link</button>
              </form>
            )}
            <div className="mt-4 text-center">
              <button onClick={() => { setForgotMode(false); setForgotMsg(''); }} className="text-[#E94E1B] text-sm font-bold hover:underline">Back to Sign In</button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-screen bg-[#F2F4F8] items-center justify-center font-sans">
        <div className="bg-white p-8 rounded-lg shadow-xl w-96 border border-[#E5E9EF]">
          <div className="flex justify-center mb-8"><Logo /></div>
          <h2 className="text-xl font-bold text-[#0B2F5C] text-center mb-6">
            {authMode === 'login' ? 'Sign in to your account' : 'Create your account'}
          </h2>
          {authError && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md mb-4 border border-red-100 text-center">{authError}</div>}
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-[#2A3B52] mb-1">Full Name</label>
                <input type="text" required value={authForm.fullName}
                  onChange={e => setAuthForm({ ...authForm, fullName: e.target.value })}
                  className="w-full border border-[#E5E9EF] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#0B2F5C]" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-[#2A3B52] mb-1">Email</label>
              <input type="email" required value={authForm.email}
                onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
                className="w-full border border-[#E5E9EF] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#0B2F5C]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2A3B52] mb-1">Password</label>
              <input type="password" required value={authForm.password}
                onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                className="w-full border border-[#E5E9EF] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#0B2F5C]" />
            </div>
            <button type="submit" className="w-full bg-[#E94E1B] text-white py-2.5 rounded-md text-sm font-bold hover:bg-[#d44315] transition-colors mt-2">
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
          {authMode === 'login' && (
            <div className="mt-3 text-center">
              <button onClick={() => setForgotMode(true)} className="text-[#5A6B7E] text-sm hover:underline">Forgot password?</button>
            </div>
          )}
          <div className="mt-4 text-center text-sm text-[#5A6B7E]">
            {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); }}
              className="text-[#E94E1B] font-bold hover:underline">
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
  const myItems = workItems.filter(i => i.assigneeId === currentUser.id);
  const userName = u => users.find(x => x.id === u)?.fullName || u;

  return (
    <div className="flex h-screen bg-[#F7F9FC] font-sans text-[#0F1A2A]">
      {/* SIDEBAR */}
      <aside className="w-60 bg-white border-r border-[#E5E9EF] flex flex-col z-10 flex-shrink-0">
        <div className="h-14 flex items-center px-4 border-b border-[#E5E9EF]">
          <Logo size="sm" />
        </div>
        <nav className="flex-1 p-3 space-y-0.5 text-sm overflow-y-auto">
          <p className="text-[10px] font-semibold text-[#9AA8BC] uppercase tracking-wider px-3 pt-3 pb-1">My Work</p>
          <NavItem active={view === 'myworks'} onClick={() => setView('myworks')} icon="👤">My Works</NavItem>
          <NavItem active={view === 'notifications'} onClick={() => { setView('notifications'); fetchNotifications(); }} icon="🔔">
            Notifications {unreadCount > 0 && <span className="ml-auto bg-[#E94E1B] text-white text-[10px] rounded-full px-1.5 py-0.5">{unreadCount}</span>}
          </NavItem>
          <p className="text-[10px] font-semibold text-[#9AA8BC] uppercase tracking-wider px-3 pt-3 pb-1">Projects</p>
          <NavItem active={view === 'board'} onClick={() => setView('board')} icon="📋">Board</NavItem>
          <NavItem active={view === 'projects'} onClick={() => setView('projects')} icon="📁">Projects</NavItem>
          <p className="text-[10px] font-semibold text-[#9AA8BC] uppercase tracking-wider px-3 pt-3 pb-1">Workspace</p>
          <NavItem active={view === 'workspace'} onClick={() => { setView('workspace'); fetchMembers(); }} icon="⚙️">Settings</NavItem>
        </nav>
        <div className="p-3 border-t border-[#E5E9EF]">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Avatar name={currentUser.fullName} size={7} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#0F1A2A] truncate">{currentUser.fullName}</p>
              <p className="text-[10px] text-[#9AA8BC] truncate">{currentUser.email}</p>
            </div>
            <button onClick={handleLogout} title="Logout" className="text-[#9AA8BC] hover:text-[#E94E1B] text-xs">↩</button>
          </div>
        </div>
      </aside>

      {/* MAIN AREA */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* TOPBAR */}
        <header className="h-14 bg-white border-b border-[#E5E9EF] flex items-center justify-between px-6 flex-shrink-0 relative">
          <div className="relative" ref={searchRef}>
            <input
              type="text"
              placeholder="Search work items... (Ctrl+K)"
              value={searchQuery}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-[#F2F4F8] rounded-md px-3 py-1.5 w-72 text-sm focus:outline-none focus:ring-1 focus:ring-[#0B2F5C]"
            />
            {searchOpen && searchResults.length > 0 && (
              <div className="absolute top-full mt-1 w-80 bg-white rounded-lg shadow-xl border border-[#E5E9EF] z-50 max-h-64 overflow-y-auto">
                {searchResults.map(item => (
                  <button key={item.id} onClick={() => { setSelectedItem(item); setSearchQuery(''); setSearchOpen(false); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-[#F2F4F8] border-b border-[#E5E9EF] last:border-0">
                    <div className="text-xs font-mono text-[#9AA8BC]">{item.id}</div>
                    <div className="text-sm text-[#0F1A2A] font-medium">{item.title}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { setView('board'); setIsCreateOpen(true); }}
              className="bg-[#E94E1B] text-white px-4 py-1.5 rounded-md text-sm font-semibold hover:bg-[#d44315] transition-colors">
              + Create
            </button>
          </div>
        </header>

        {/* CONTENT */}
        <div className="flex-1 overflow-auto">

          {/* MY WORKS VIEW */}
          {view === 'myworks' && (
            <div className="p-8 max-w-4xl">
              <h1 className="text-2xl font-bold text-[#0B2F5C] mb-2">My Works</h1>
              <p className="text-sm text-[#5A6B7E] mb-6">Work items assigned to you</p>
              {myItems.length === 0 ? (
                <div className="text-center py-16 text-[#9AA8BC]">
                  <div className="text-4xl mb-3">👤</div>
                  <p className="text-sm">No items assigned to you yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {myItems.map(item => (
                    <div key={item.id} onClick={() => setSelectedItem(item)}
                      className="bg-white border border-[#E5E9EF] rounded-lg p-4 flex items-center gap-4 hover:shadow-sm cursor-pointer transition-shadow">
                      <span className={`text-[10px] uppercase tracking-wider font-bold text-white px-2 py-0.5 rounded-sm ${TYPE_COLORS[item.type] || 'bg-[#5A6B7E]'}`}>{item.type}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#0F1A2A] truncate">{item.title}</p>
                        <p className="text-xs text-[#9AA8BC]">{item.id}</p>
                      </div>
                      <StatusBadge status={item.status} />
                      {item.dueDate && <span className="text-xs text-[#B97A00]">Due {item.dueDate}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* BOARD VIEW */}
          {view === 'board' && (
            <div className="p-6 h-full flex flex-col">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h1 className="text-xl font-bold text-[#0B2F5C]">Board</h1>
                  <p className="text-xs text-[#9AA8BC] mt-0.5">{workItems.length} items</p>
                </div>
              </div>
              {loading ? (
                <div className="flex items-center justify-center h-64 text-[#5A6B7E]">Loading...</div>
              ) : (
                <div className="flex gap-4 flex-1 overflow-x-auto pb-4">
                  {columns.map(col => (
                    <div key={col.name}
                      className="flex-1 min-w-56 flex flex-col bg-[#F2F4F8] rounded-lg p-3"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, col.name)}>
                      <div className="flex items-center justify-between mb-3 px-1">
                        <h3 className="text-xs font-bold text-[#2A3B52] uppercase tracking-wider">{col.name}</h3>
                        <span className="text-xs bg-[#E5E9EF] text-[#5A6B7E] px-2 py-0.5 rounded-full">
                          {workItems.filter(i => i.status === col.name).length}
                        </span>
                      </div>
                      <div className="space-y-2 flex-1">
                        {workItems.filter(i => i.status === col.name).map(item => (
                          <div key={item.id} draggable
                            onDragStart={(e) => handleDragStart(e, item.id)}
                            className="bg-white p-3 rounded-md shadow-sm border border-[#E5E9EF] cursor-grab hover:shadow-md transition-shadow group">
                            <div className="flex items-start justify-between mb-1">
                              <div className="text-[10px] font-mono text-[#9AA8BC]">{item.id}</div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setSelectedItem(item)} className="text-[#9AA8BC] hover:text-[#0B2F5C] text-xs">✏</button>
                                <button onClick={() => handleDelete(item.id)} className="text-[#9AA8BC] hover:text-[#C0392B] text-xs">✕</button>
                              </div>
                            </div>
                            <p className="text-sm font-medium text-[#0F1A2A] leading-snug mb-2 cursor-pointer"
                              onClick={() => setSelectedItem(item)}>{item.title}</p>
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] uppercase tracking-wider font-bold text-white px-1.5 py-0.5 rounded-sm ${TYPE_COLORS[item.type] || 'bg-[#5A6B7E]'}`}>{item.type}</span>
                              <div className="flex items-center gap-1">
                                {item.dueDate && <span className="text-[10px] text-[#B97A00]">{item.dueDate}</span>}
                                {item.assigneeId && <Avatar name={userName(item.assigneeId)} size={5} />}
                              </div>
                            </div>
                            {item.tags && item.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {item.tags.map(t => (
                                  <span key={t} className="text-[10px] bg-[#E5E9EF] text-[#5A6B7E] px-1.5 py-0.5 rounded">{t}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PROJECTS VIEW */}
          {view === 'projects' && (
            <div className="p-8 max-w-4xl">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-[#0B2F5C]">Projects</h1>
                <button onClick={() => setIsProjectOpen(true)}
                  className="bg-[#E94E1B] text-white px-4 py-1.5 rounded-md text-sm font-semibold hover:bg-[#d44315]">
                  + New Project
                </button>
              </div>
              <div className="space-y-3">
                {projects.map(p => (
                  <div key={p.id} className="bg-white border border-[#E5E9EF] rounded-lg p-5 hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#0B2F5C] rounded-md flex items-center justify-center text-white text-xs font-bold">{p.keyPrefix}</div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-[#0F1A2A]">{p.name}</h3>
                        <p className="text-xs text-[#9AA8BC]">{p.description || 'No description'}</p>
                      </div>
                      <div className="text-right text-xs text-[#9AA8BC]">
                        <p>{workItems.filter(i => i.projectId === p.id).length} items</p>
                        {p.leadUserId && <p>Lead: {userName(p.leadUserId)}</p>}
                      </div>
                    </div>
                  </div>
                ))}
                {projects.length === 0 && (
                  <div className="text-center py-16 text-[#9AA8BC]">
                    <div className="text-4xl mb-3">📁</div>
                    <p className="text-sm">No projects yet. Create your first project.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* NOTIFICATIONS VIEW */}
          {view === 'notifications' && (
            <div className="p-8 max-w-2xl">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-[#0B2F5C]">Notifications</h1>
                {unreadCount > 0 && (
                  <button onClick={() => {
                    fetch(`${API}/notifications/mark-all-read?userId=${currentUser.id}`, { method: 'PUT' })
                      .then(() => { fetchNotifications(); setUnreadCount(0); });
                  }} className="text-sm text-[#1E4D8C] hover:underline">Mark all as read</button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div className="text-center py-16 text-[#9AA8BC]">
                  <div className="text-4xl mb-3">🔔</div>
                  <p className="text-sm">No notifications yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map(n => (
                    <div key={n.id}
                      className={`bg-white border rounded-lg p-4 flex gap-3 items-start ${!n.read ? 'border-[#1E4D8C] bg-blue-50/30' : 'border-[#E5E9EF]'}`}>
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.read ? 'bg-[#E94E1B]' : 'bg-transparent'}`}></div>
                      <div className="flex-1">
                        <p className="text-sm text-[#0F1A2A]">{n.message}</p>
                        <p className="text-xs text-[#9AA8BC] mt-1">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</p>
                      </div>
                      {!n.read && (
                        <button onClick={() => {
                          fetch(`${API}/notifications/${n.id}/read`, { method: 'PUT' })
                            .then(() => { fetchNotifications(); fetchUnreadCount(); });
                        }} className="text-xs text-[#9AA8BC] hover:text-[#0B2F5C]">✓</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* WORKSPACE SETTINGS VIEW */}
          {view === 'workspace' && (
            <div className="p-8 max-w-3xl">
              <h1 className="text-2xl font-bold text-[#0B2F5C] mb-6">Workspace Settings</h1>
              <div className="bg-white rounded-lg border border-[#E5E9EF] p-6 mb-6">
                <h2 className="font-semibold text-[#0F1A2A] mb-4">Members</h2>
                <div className="space-y-2 mb-4">
                  {workspaceMembers.map(m => (
                    <div key={m.id} className="flex items-center gap-3 py-2 border-b border-[#E5E9EF] last:border-0">
                      <Avatar name={m.fullName} size={8} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#0F1A2A]">{m.fullName}</p>
                        <p className="text-xs text-[#9AA8BC]">{m.email}</p>
                      </div>
                      <span className="text-xs bg-[#E5E9EF] text-[#5A6B7E] px-2 py-0.5 rounded">{m.role}</span>
                      {m.id !== currentUser.id && (
                        <button onClick={() => handleRemoveMember(m.id)}
                          className="text-xs text-[#9AA8BC] hover:text-[#C0392B]">Remove</button>
                      )}
                    </div>
                  ))}
                  {workspaceMembers.length === 0 && <p className="text-sm text-[#9AA8BC]">Loading members...</p>}
                </div>
                <div className="flex gap-2">
                  <input type="email" placeholder="Invite by email address"
                    value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    className="flex-1 border border-[#E5E9EF] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#0B2F5C]" />
                  <button onClick={handleInvite}
                    className="bg-[#0B2F5C] text-white px-4 py-2 rounded-md text-sm font-semibold">Invite</button>
                </div>
                {inviteMsg && <p className="text-xs text-green-600 mt-2">{inviteMsg}</p>}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* WORK ITEM DETAIL PANEL */}
      {selectedItem && (
        <div className="w-[480px] bg-white border-l border-[#E5E9EF] flex flex-col h-screen overflow-hidden flex-shrink-0">
          <div className="h-14 flex items-center justify-between px-5 border-b border-[#E5E9EF]">
            <span className="font-mono text-xs text-[#9AA8BC]">{selectedItem.id}</span>
            <div className="flex gap-2">
              <button onClick={() => handleDelete(selectedItem.id)}
                className="text-xs text-[#9AA8BC] hover:text-[#C0392B] px-2 py-1 rounded">Delete</button>
              <button onClick={() => setSelectedItem(null)} className="text-[#9AA8BC] hover:text-[#0F1A2A]">✕</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <input className="w-full text-lg font-bold text-[#0F1A2A] focus:outline-none border-b border-transparent focus:border-[#E5E9EF] pb-1"
              value={selectedItem.title}
              onChange={e => setSelectedItem({ ...selectedItem, title: e.target.value })}
              onBlur={() => handleUpdateItem(selectedItem)} />

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <label className="block text-xs text-[#9AA8BC] mb-1">Status</label>
                <select value={selectedItem.status}
                  onChange={e => { const u = { ...selectedItem, status: e.target.value }; setSelectedItem(u); handleUpdateItem(u); }}
                  className="w-full border border-[#E5E9EF] rounded px-2 py-1.5 text-sm focus:outline-none">
                  <option>Todo</option><option>In Progress</option><option>Done</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#9AA8BC] mb-1">Type</label>
                <select value={selectedItem.type}
                  onChange={e => { const u = { ...selectedItem, type: e.target.value }; setSelectedItem(u); handleUpdateItem(u); }}
                  className="w-full border border-[#E5E9EF] rounded px-2 py-1.5 text-sm focus:outline-none">
                  {Object.keys(TYPE_COLORS).map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#9AA8BC] mb-1">Assignee</label>
                <select value={selectedItem.assigneeId || ''}
                  onChange={e => { const u = { ...selectedItem, assigneeId: e.target.value || null }; setSelectedItem(u); handleUpdateItem(u); }}
                  className="w-full border border-[#E5E9EF] rounded px-2 py-1.5 text-sm focus:outline-none">
                  <option value="">Unassigned</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#9AA8BC] mb-1">Due Date</label>
                <input type="date" value={selectedItem.dueDate || ''}
                  onChange={e => { const u = { ...selectedItem, dueDate: e.target.value || null }; setSelectedItem(u); handleUpdateItem(u); }}
                  className="w-full border border-[#E5E9EF] rounded px-2 py-1.5 text-sm focus:outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#9AA8BC] mb-1">Tags (comma separated)</label>
              <input type="text" value={(selectedItem.tags || []).join(', ')}
                onChange={e => setSelectedItem({ ...selectedItem, tags: e.target.value.split(',').map(t => t.trim()) })}
                onBlur={() => handleUpdateItem(selectedItem)}
                placeholder="frontend, urgent, api"
                className="w-full border border-[#E5E9EF] rounded px-2 py-1.5 text-sm focus:outline-none" />
            </div>

            <div>
              <label className="block text-xs text-[#9AA8BC] mb-1">Description</label>
              <textarea rows={4} value={selectedItem.description || ''}
                onChange={e => setSelectedItem({ ...selectedItem, description: e.target.value })}
                onBlur={() => handleUpdateItem(selectedItem)}
                placeholder="Add a description..."
                className="w-full border border-[#E5E9EF] rounded px-2 py-1.5 text-sm focus:outline-none resize-none" />
            </div>

            <div>
              <h3 className="text-xs font-semibold text-[#9AA8BC] uppercase tracking-wider mb-3">Comments ({comments.length})</h3>
              <div className="space-y-3 mb-3">
                {comments.map(c => (
                  <div key={c.id} className="flex gap-2">
                    <Avatar name={c.authorName || 'U'} size={7} />
                    <div className="flex-1 bg-[#F2F4F8] rounded-lg px-3 py-2">
                      <p className="text-xs font-semibold text-[#0F1A2A] mb-0.5">{c.authorName}</p>
                      <p className="text-sm text-[#3C4858]">{c.body}</p>
                      <p className="text-[10px] text-[#9AA8BC] mt-1">{c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Avatar name={currentUser.fullName} size={7} />
                <div className="flex-1 flex gap-2">
                  <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                    placeholder="Add a comment..."
                    className="flex-1 border border-[#E5E9EF] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#0B2F5C]" />
                  <button onClick={handleAddComment}
                    className="bg-[#0B2F5C] text-white px-3 py-1.5 rounded-lg text-sm">Send</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE WORK ITEM MODAL */}
      {isCreateOpen && (
        <Modal title="New Work Item" onClose={() => { setIsCreateOpen(false); setCreateError(''); }}>
          {createError && <div className="text-red-600 bg-red-50 p-2 text-sm rounded mb-3">{createError}</div>}
          <div className="space-y-3">
            <Field label="Title">
              <input type="text" value={newItem.title} onChange={e => setNewItem({ ...newItem, title: e.target.value })}
                className="input" placeholder="What needs to be done?" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select value={newItem.type} onChange={e => setNewItem({ ...newItem, type: e.target.value })} className="input">
                  {Object.keys(TYPE_COLORS).map(t => <option key={t}>{t}</option>)}
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
            <button onClick={() => setIsCreateOpen(false)} className="px-4 py-2 text-sm text-[#5A6B7E]">Cancel</button>
            <button onClick={handleCreate} className="bg-[#E94E1B] text-white px-4 py-2 rounded-md text-sm font-semibold">Create</button>
          </div>
        </Modal>
      )}

      {/* CREATE PROJECT MODAL */}
      {isProjectOpen && (
        <Modal title="New Project" onClose={() => { setIsProjectOpen(false); setCreateError(''); }}>
          {createError && <div className="text-red-600 bg-red-50 p-2 text-sm rounded mb-3">{createError}</div>}
          <div className="space-y-3">
            <Field label="Project Name">
              <input type="text" value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })}
                className="input" placeholder="e.g. WEB Portal" />
            </Field>
            <Field label="Key Prefix (3-5 letters)">
              <input type="text" maxLength={5} value={newProject.keyPrefix}
                onChange={e => setNewProject({ ...newProject, keyPrefix: e.target.value.toUpperCase() })}
                className="input" placeholder="e.g. WEB" />
            </Field>
            <Field label="Description">
              <textarea rows={2} value={newProject.description} onChange={e => setNewProject({ ...newProject, description: e.target.value })}
                className="input resize-none" />
            </Field>
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <button onClick={() => setIsProjectOpen(false)} className="px-4 py-2 text-sm text-[#5A6B7E]">Cancel</button>
            <button onClick={handleCreateProject} className="bg-[#E94E1B] text-white px-4 py-2 rounded-md text-sm font-semibold">Create Project</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function NavItem({ active, onClick, icon, children }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${active ? 'bg-[#F2F4F8] text-[#0B2F5C] font-semibold' : 'text-[#5A6B7E] hover:bg-[#F7F9FC]'}`}>
      <span className="text-base">{icon}</span>
      <span className="flex-1 text-left">{children}</span>
    </button>
  );
}

function StatusBadge({ status }) {
  const colors = { 'Todo': 'bg-[#E5E9EF] text-[#5A6B7E]', 'In Progress': 'bg-blue-100 text-blue-700', 'Done': 'bg-green-100 text-green-700' };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-[#0F1A2A]/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-[#E5E9EF] flex justify-between items-center">
          <h2 className="text-lg font-bold text-[#0B2F5C]">{title}</h2>
          <button onClick={onClose} className="text-[#9AA8BC] hover:text-[#0F1A2A] text-xl">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#2A3B52] mb-1">{label}</label>
      {children}
    </div>
  );
}
