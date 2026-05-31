import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/works/button';
import { StatusBadge } from '@/components/works/status-badge';
import { statusToCategory } from '@/components/works/status';
import { Logo } from '@/components/works/logo';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

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

function readStoredSession() {
  try {
    return JSON.parse(localStorage.getItem('bSmartSession') || 'null');
  } catch {
    return null;
  }
}

const TYPES = {
  Task:            { color: 'bg-brand-navy-tint',      icon: '✓' },
  Story:           { color: 'bg-semantic-success',           icon: '📖' },
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
  const initialSession                  = readStoredSession();
  const [currentUser, setCurrentUser]   = useState(() => initialSession?.user || null);
  const [token, setToken]               = useState(() => initialSession?.token || null);
  const [authMode, setAuthMode]         = useState('login');
  const [authForm, setAuthForm]         = useState({ email: '', password: '', fullName: '' });
  const [authError, setAuthError]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotMode, setForgotMode]     = useState(false);
  const [forgotEmail, setForgotEmail]   = useState('');
  const [forgotMsg, setForgotMsg]       = useState('');
  const [verifyPending, setVerifyPending] = useState(null); // { email, devToken }
  const [verifyMsg, setVerifyMsg]       = useState('');
  const [mfaChallenge, setMfaChallenge] = useState(null); // { userId } — awaiting TOTP
  const [mfaCode, setMfaCode]           = useState('');
  const [mfaError, setMfaError]         = useState('');
  const [mfaSetup, setMfaSetup]         = useState(null); // { otpAuthUri, secret } — enroll flow
  const [mfaSetupCode, setMfaSetupCode] = useState('');
  const [mfaSetupMsg, setMfaSetupMsg]   = useState('');

  const [view, setView]                 = useState('dashboard');
  const [toast, setToast]               = useState(null); // { message, type }
  const [workItems, setWorkItems]       = useState([]);
  const [projects, setProjects]         = useState([]);
  const [users, setUsers]               = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]   = useState(0);
  const [loading, setLoading]           = useState(true);

  const [selectedItem, setSelectedItem] = useState(null);
  const [detailTab, setDetailTab]       = useState('details'); // details | activity | links | attachments
  const [comments, setComments]         = useState([]);
  const [newComment, setNewComment]     = useState('');
  const [commentInternal, setCommentInternal] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionOpen, setMentionOpen]   = useState(false);
  const [activity, setActivity]         = useState([]);
  const [links, setLinks]               = useState([]);
  const [attachments, setAttachments]   = useState([]);
  const [newLink, setNewLink]           = useState({ targetId: '', linkType: 'RELATES_TO' });
  const [tagInput, setTagInput]         = useState(''); // separate state for tag text field
  const fileInputRef                    = useRef(null);
  const updateTimerRef                  = useRef(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const [newItem, setNewItem]           = useState({ title: '', type: 'Task', description: '', assigneeId: '', dueDate: '', tags: '', priority: 'MEDIUM', parentId: '', projectId: '' });
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

  // Dark mode
  const [darkMode, setDarkMode]         = useState(() => localStorage.getItem('bSmartTheme') === 'dark');

  // RBAC
  const [userRole, setUserRole]         = useState({ role: 'MEMBER', tier: 2, permissions: [] });
  const can = (perm) => userRole.permissions.includes(perm) || userRole.tier >= 4;

  // My Works sub-tab
  const [myWorksTab, setMyWorksTab]     = useState('assigned'); // assigned | activity | mentions

  // Notification prefs
  const [notifPrefs, setNotifPrefs]     = useState({ notifyAssign: true, notifyComment: true, notifyMention: true, emailDigest: false });

  // Iteration 2 — Sprints & Backlog
  const [sprints, setSprints]           = useState([]);
  const [activeSprint, setActiveSprint] = useState(null);
  const [backlogItems, setBacklogItems] = useState([]);
  const [sprintItems, setSprintItems]   = useState([]);
  const [sprintReport, setSprintReport] = useState(null);
  const [savedFilters, setSavedFilters] = useState([]);
  const [activeFilter, setActiveFilter] = useState(null);
  const [swimlaneBy, setSwimlaneBy]     = useState('none');
  const [isSprintOpen, setIsSprintOpen] = useState(false);
  const [newSprint, setNewSprint]       = useState({ name: '', goal: '', startDate: '', endDate: '', capacity: 40 });
  const [selectedSprintId, setSelectedSprintId] = useState(null);
  const [refinementMode, setRefinementMode] = useState(false);
  const [dragOverId, setDragOverId]     = useState(null);
  const [saveFilterName, setSaveFilterName] = useState('');
  const [showSaveFilter, setShowSaveFilter] = useState(false);
  const [scopeChanges, setScopeChanges] = useState([]);

  // Workspace switcher dropdown
  const [wsOpen, setWsOpen]             = useState(false);
  const wsRef                           = useRef(null);

  // Iteration 3 — Workflows, Custom Fields, Permissions, WIQL
  const [workflows, setWorkflows]           = useState([]);
  const [fieldDefs, setFieldDefs]           = useState([]);
  const [roles, setRoles]                   = useState([]);
  const [wiqlQuery, setWiqlQuery]           = useState('');
  const [wiqlResults, setWiqlResults]       = useState([]);
  const [wiqlFilters, setWiqlFilters]       = useState([]);
  const [wiqlFilterName, setWiqlFilterName] = useState('');
  const [wiqlError, setWiqlError]           = useState('');
  const [workItemTypes, setWorkItemTypes]   = useState({ builtIn: [], custom: [] });
  const [permMatrix, setPermMatrix]         = useState(null);
  const [settings3Tab, setSettings3Tab]     = useState('workflows'); // workflows | fields | permissions | types

  // Iteration 4 — PM Artifacts
  const [pmProjectId, setPmProjectId]       = useState('');
  const [pmTab, setPmTab]                   = useState('raid');   // raid | risks | assumptions | issues | deps | decisions | meetings | actions | stakeholders | lessons
  const [risks, setRisks]                   = useState([]);
  const [assumptions, setAssumptions]       = useState([]);
  const [pmIssues, setPmIssues]             = useState([]);
  const [dependencies, setDependencies]     = useState([]);
  const [decisions, setDecisions]           = useState([]);
  const [meetings, setMeetings]             = useState([]);
  const [actionItems, setActionItems]       = useState([]);
  const [stakeholders, setStakeholders]     = useState([]);
  const [lessonsLearned, setLessonsLearned] = useState([]);
  const [raidDashboard, setRaidDashboard]   = useState(null);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [meetingNotes, setMeetingNotes]     = useState({});
  const [pmForm, setPmForm]                 = useState({});
  const [pmFormOpen, setPmFormOpen]         = useState(null); // 'risk'|'assumption'|...|null
  const [selectedPmItem, setSelectedPmItem] = useState(null);

  // Iter 1 & 2 completion features
  const [recentlyViewed, setRecentlyViewed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bSmartRecentItems') || '[]'); } catch { return []; }
  });
  const [activityEventFilter, setActivityEventFilter] = useState('');
  const [velocityData, setVelocityData] = useState([]);
  const [deleteUndoItem, setDeleteUndoItem] = useState(null);
  const deleteUndoTimer = useRef(null);
  const [itemChildren, setItemChildren] = useState([]);

  // Iter 1 complete — new states
  const [replyingTo, setReplyingTo]     = useState(null);   // comment being replied to
  const [replyBody, setReplyBody]       = useState('');
  const [trashItems, setTrashItems]     = useState([]);
  const [, setBranding]                 = useState({ primaryColor: '#E94E1B', logoUrl: '', description: '' });
  const [projectMembers, setProjectMembers] = useState([]);
  const [projectMemberEmail, setProjectMemberEmail] = useState('');
  const [projectMemberMsg, setProjectMemberMsg] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [brandingColor, setBrandingColor] = useState('#E94E1B');
  const [brandingDesc, setBrandingDesc]  = useState('');

  const workspace = { id: 'WS-001', name: 'BCITS Master Workspace' };

  const headers = (extra = {}) => ({
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...extra
  });

  // Shared fetch wrapper with error handling
  const apiFetch = async (url, options = {}) => {
    const res = await fetch(url, { ...options, headers: { ...headers(), ...(options.headers || {}) } });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `Request failed: ${res.status}`);
    }
    return res.json();
  };

  useEffect(() => {
    if (currentUser) {
      fetchAll();
      const iv = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(iv);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('bSmartTheme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    if (!selectedItem) return;
    const id = selectedItem.id;
    // Keep detail drawer controls aligned with the selected work item.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTagInput((selectedItem.tags || []).join(', '));
    setActivityEventFilter('');
    const h = headers();
    fetch(`${API}/work-items/${id}/comments`, { headers: h }).then(r => r.json()).then(d => setComments(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${API}/work-items/${id}/activity`, { headers: h }).then(r => r.json()).then(d => setActivity(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${API}/work-items/${id}/links`, { headers: h }).then(r => r.json()).then(d => setLinks(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${API}/work-items/${id}/attachments`, { headers: h }).then(r => r.json()).then(d => setAttachments(Array.isArray(d) ? d : [])).catch(() => {});
    setDetailTab('details');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItem?.id]);

  // Close workspace dropdown on outside click
  useEffect(() => {
    function handler(e) { if (wsRef.current && !wsRef.current.contains(e.target)) setWsOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Track recently viewed items
  useEffect(() => {
    if (!selectedItem) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecentlyViewed(prev => {
      const filtered = prev.filter(i => i.id !== selectedItem.id);
      const updated = [{ id: selectedItem.id, title: selectedItem.title, type: selectedItem.type }, ...filtered].slice(0, 8);
      localStorage.setItem('bSmartRecentItems', JSON.stringify(updated));
      return updated;
    });
    // Load children
    fetch(`${API}/work-items?parentId=${selectedItem.id}`)
      .then(r => r.json())
      .then(d => setItemChildren((Array.isArray(d) ? d : []).filter(i => i.parentId === selectedItem.id)))
      .catch(() => setItemChildren([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItem?.id]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  function fetchUserRole() {
    fetch(`${API}/rbac/me`, { headers: headers() })
      .then(r => r.json()).then(d => setUserRole({
        role: d.role || 'MEMBER',
        tier: d.tier || 2,
        permissions: Array.isArray(d.permissions) ? d.permissions : []
      })).catch(() => {});
  }

  function fetchAll() {
    setLoading(true);
    Promise.all([
      fetch(`${API}/work-items`, { headers: headers() }).then(r => r.json()),
      fetch(`${API}/projects`, { headers: headers() }).then(r => r.json()),
      fetch(`${API}/users`, { headers: headers() }).then(r => r.json()),
    ]).then(([items, projs, usrs]) => {
      setWorkItems(Array.isArray(items) ? items : []);
      setProjects(Array.isArray(projs) ? projs : []);
      setUsers(Array.isArray(usrs) ? usrs : []);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
      showToast('Failed to load data. Check your connection.', 'error');
    });
    fetchUnreadCount();
    fetchUserRole();
    fetchBranding();
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
    if (authMode === 'signup') {
      if (authForm.email !== confirmEmail) { setAuthError('Email addresses do not match.'); return; }
      if (authForm.password !== confirmPassword) { setAuthError('Passwords do not match.'); return; }
      if (authForm.password.length < 8) { setAuthError('Password must be at least 8 characters.'); return; }
    }
    fetch(`${API}/auth${authMode === 'login' ? '/login' : '/signup'}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authForm)
    }).then(async res => {
      const data = await res.json();
      if (!res.ok) {
        if (data.requiresVerification) {
          setVerifyPending({ email: authForm.email, devToken: null });
          setVerifyMsg('Please verify your email before signing in. Check your inbox.');
          return;
        }
        throw new Error(data.error || 'Authentication failed');
      }
      return data;
    }).then(data => {
      if (!data) return;
      if (data.requiresVerification) {
        setVerifyPending({ email: authForm.email, devToken: data.devToken });
        setVerifyMsg('');
        return;
      }
      if (data.requiresMfa) {
        setMfaChallenge({ userId: data.userId });
        setMfaCode(''); setMfaError('');
        return;
      }
      setCurrentUser(data.user); setToken(data.token);
      localStorage.setItem('bSmartSession', JSON.stringify({ user: data.user, token: data.token }));
    }).catch(err => setAuthError(err.message));
  };

  const handleVerifyEmail = (token) => {
    fetch(`${API}/auth/verify?token=${token}`)
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Verification failed');
        return data;
      })
      .then(data => {
        setVerifyPending(null); setVerifyMsg('');
        setCurrentUser(data.user); setToken(data.token);
        localStorage.setItem('bSmartSession', JSON.stringify({ user: data.user, token: data.token }));
      })
      .catch(err => setVerifyMsg(err.message));
  };

  const handleMfaVerify = () => {
    setMfaError('');
    fetch(`${API}/auth/mfa/verify`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: mfaChallenge.userId, totp: mfaCode })
    }).then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid code');
      return data;
    }).then(data => {
      setMfaChallenge(null); setMfaCode('');
      setCurrentUser(data.user); setToken(data.token);
      localStorage.setItem('bSmartSession', JSON.stringify({ user: data.user, token: data.token }));
    }).catch(err => setMfaError(err.message));
  };

  const handleMfaEnroll = () => {
    fetch(`${API}/auth/mfa/enroll`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser?.id }
    }).then(r => r.json()).then(d => { setMfaSetup(d); setMfaSetupCode(''); setMfaSetupMsg(''); })
      .catch(() => showToast('MFA enroll failed', 'error'));
  };

  const handleMfaConfirm = () => {
    fetch(`${API}/auth/mfa/confirm`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser?.id },
      body: JSON.stringify({ totp: mfaSetupCode })
    }).then(r => r.json()).then(d => {
      if (d.message) { setMfaSetup(null); setMfaSetupMsg(''); showToast('MFA enabled! ✓'); }
      else setMfaSetupMsg(d.error || 'Failed');
    }).catch(() => setMfaSetupMsg('Confirmation failed'));
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
    const projectId = newItem.projectId || (projects.length > 0 ? projects[0].id : 'PROJ-WORKS');
    apiFetch(`${API}/work-items`, {
      method: 'POST',
      body: JSON.stringify({
        ...newItem,
        tags,
        dueDate: newItem.dueDate || null,
        assigneeId: newItem.assigneeId || null,
        parentId: newItem.parentId || null,
        projectId,
        priority: newItem.priority || 'MEDIUM',
      })
    }).then(saved => {
      setWorkItems(prev => [...prev, saved]);
      setNewItem({ title: '', type: 'Task', description: '', assigneeId: '', dueDate: '', tags: '', priority: 'MEDIUM', parentId: '', projectId: '' });
      setIsCreateOpen(false);
      showToast('Work item created');
    }).catch(err => setCreateError(err.message));
  };

  const handleDelete = (id) => {
    const item = workItems.find(i => i.id === id);
    if (!item) return;
    // Optimistic remove
    setWorkItems(prev => prev.filter(i => i.id !== id));
    if (selectedItem?.id === id) setSelectedItem(null);
    setDeleteUndoItem(item);
    clearTimeout(deleteUndoTimer.current);
    // Toast with undo — commit delete after 8 seconds
    setToast({ message: `"${item.title.slice(0, 35)}${item.title.length > 35 ? '…' : ''}" deleted`, type: 'undo' });
    deleteUndoTimer.current = setTimeout(() => {
      apiFetch(`${API}/work-items/${id}`, { method: 'DELETE' }).catch(() => {
        setWorkItems(prev => [...prev, item]);
        showToast('Failed to delete item', 'error');
      });
      setDeleteUndoItem(null);
      setToast(null);
    }, 8000);
  };

  const handleUndoDelete = () => {
    if (!deleteUndoItem) return;
    clearTimeout(deleteUndoTimer.current);
    setWorkItems(prev => {
      const exists = prev.find(i => i.id === deleteUndoItem.id);
      return exists ? prev : [...prev, deleteUndoItem];
    });
    setDeleteUndoItem(null);
    setToast(null);
  };

  const handleDragStart = (e, id) => e.dataTransfer.setData('itemId', id);
  const handleDragOver  = (e) => e.preventDefault();
  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('itemId');
    const item = workItems.find(i => i.id === itemId);
    if (!item || item.status === newStatus) return;
    // Optimistic update
    setWorkItems(prev => prev.map(i => i.id === itemId ? { ...i, status: newStatus } : i));
    apiFetch(`${API}/work-items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ ...item, status: newStatus })
    }).catch(() => {
      // Revert on failure
      setWorkItems(prev => prev.map(i => i.id === itemId ? { ...i, status: item.status } : i));
      showToast('Failed to update status', 'error');
    });
  };

  // Debounced update — wait 600ms after last change before saving
  const handleUpdateItem = (updated) => {
    clearTimeout(updateTimerRef.current);
    updateTimerRef.current = setTimeout(() => {
      apiFetch(`${API}/work-items/${updated.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...updated, tags: updated.tags || [] })
      }).then(saved => {
        setWorkItems(prev => prev.map(i => i.id === saved.id ? saved : i));
        setSelectedItem(saved);
      }).catch(err => showToast(err.message, 'error'));
    }, 600);
  };

  // COMMENTS with @mention + internal flag
  const handleAddComment = () => {
    if (!newComment.trim()) return;
    fetch(`${API}/work-items/${selectedItem.id}/comments`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ body: newComment, isInternal: commentInternal })
    }).then(r => r.json()).then(c => {
      setComments(prev => [...prev, c]);
      setNewComment(''); setCommentInternal(false); setMentionOpen(false);
    });
  };

  const handleCommentInput = (e) => {
    const val = e.target.value;
    setNewComment(val);
    const lastAt = val.lastIndexOf('@');
    if (lastAt !== -1 && lastAt === val.length - 1) { setMentionOpen(true); setMentionQuery(''); }
    else if (lastAt !== -1 && val.slice(lastAt + 1).match(/^\w+$/)) {
      setMentionOpen(true); setMentionQuery(val.slice(lastAt + 1).toLowerCase());
    } else { setMentionOpen(false); }
  };

  const insertMention = (user) => {
    const lastAt = newComment.lastIndexOf('@');
    setNewComment(newComment.slice(0, lastAt) + '@' + user.fullName + ' ');
    setMentionOpen(false);
  };

  // SEARCH
  useEffect(() => {
    if (!searchQuery.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`${API}/work-items/search?q=${encodeURIComponent(searchQuery)}`)
        .then(r => r.json()).then(d => setSearchResults(Array.isArray(d) ? d : [])).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // PROJECTS
  const handleCreateProject = () => {
    if (!newProject.name || !newProject.keyPrefix) { setCreateError('Name and key prefix required.'); return; }
    setCreateError('');
    apiFetch(`${API}/projects`, { method: 'POST', body: JSON.stringify(newProject) })
      .then(p => {
        setProjects(prev => [...prev, p]);
        setNewProject({ name: '', keyPrefix: '', description: '' });
        setIsProjectOpen(false);
        showToast('Project created');
      }).catch(err => setCreateError(err.message));
  };

  // WORKSPACE
  const fetchMembers = () => {
    fetch(`${API}/workspaces/WS-001/members`)
      .then(r => r.json()).then(d => setWorkspaceMembers(Array.isArray(d) ? d : [])).catch(() => {});
  };

  const handleInvite = () => {
    apiFetch(`${API}/workspaces/WS-001/members`, {
      method: 'POST', body: JSON.stringify({ email: inviteEmail, role: 'MEMBER' })
    }).then(d => { setInviteMsg(d.message || 'Added!'); setInviteEmail(''); fetchMembers(); })
      .catch(err => setInviteMsg(err.message || 'Error — user may not exist.'));
  };

  const handleRemoveMember = (userId) => {
    fetch(`${API}/workspaces/WS-001/members/${userId}`, { method: 'DELETE', headers: headers() })
      .then(() => fetchMembers());
  };

  // NOTIFICATION PREFS
  function fetchNotifPrefs() {
    fetch(`${API}/notification-preferences`, { headers: headers() })
      .then(r => r.json()).then(d => setNotifPrefs({
        notifyAssign:  d.notify_assign  ?? true,
        notifyComment: d.notify_comment ?? true,
        notifyMention: d.notify_mention ?? true,
        emailDigest:   d.email_digest   ?? false,
      })).catch(() => {});
  }
  function saveNotifPrefs(prefs) {
    fetch(`${API}/notification-preferences`, { method: 'PUT', headers: headers(), body: JSON.stringify(prefs) })
      .then(() => setNotifPrefs(prefs));
  }

  // SPRINT FUNCTIONS
  function fetchSprints(projectId = 'PROJ-WORKS') {
    fetch(`${API}/sprints?projectId=${projectId}`, { headers: headers() })
      .then(r => r.json()).then(d => {
        const list = Array.isArray(d) ? d : [];
        setSprints(list);
        const active = list.find(s => s.status === 'ACTIVE') || list[0];
        if (active) { setActiveSprint(active); fetchSprintItems(active.id); }
      }).catch(() => {});
  }
  function fetchSprintItems(sprintId) {
    fetch(`${API}/sprints/${sprintId}/items`, { headers: headers() })
      .then(r => r.json()).then(d => setSprintItems(Array.isArray(d) ? d : [])).catch(() => {});
  }
  function fetchBacklog() {
    fetch(`${API}/work-items/backlog`, { headers: headers() })
      .then(r => r.json()).then(d => setBacklogItems(Array.isArray(d) ? d : [])).catch(() => {});
  }
  function fetchSprintReport(sprintId) {
    fetch(`${API}/sprints/${sprintId}/report`, { headers: headers() })
      .then(r => r.json()).then(setSprintReport).catch(() => {});
    fetch(`${API}/sprints/${sprintId}/scope-changes`, { headers: headers() })
      .then(r => r.json()).then(d => setScopeChanges(Array.isArray(d) ? d : [])).catch(() => {});
  }
  function fetchSavedFilters() {
    fetch(`${API}/saved-filters`, { headers: headers() })
      .then(r => r.json()).then(d => setSavedFilters(Array.isArray(d) ? d : [])).catch(() => {});
  }

  function fetchVelocityData() {
    fetch(`${API}/sprints/velocity`, { headers: headers() })
      .then(r => r.json()).then(d => setVelocityData(Array.isArray(d) ? d : [])).catch(() => {});
  }

  function fetchBranding() {
    fetch(`${API}/workspaces/WS-001/branding`, { headers: headers() })
      .then(r => r.json()).then(d => {
        setBranding(d);
        setBrandingColor(d.primaryColor || '#E94E1B');
        setBrandingDesc(d.description || '');
        // Apply brand color as CSS variable
        document.documentElement.style.setProperty('--brand-action', d.primaryColor || '#E94E1B');
      }).catch(() => {});
  }

  function saveBranding() {
    fetch(`${API}/workspaces/WS-001/branding`, {
      method: 'PUT', headers: headers(),
      body: JSON.stringify({ primaryColor: brandingColor, description: brandingDesc })
    }).then(r => r.json()).then(d => { setBranding(d); showToast('Branding saved'); }).catch(() => {});
  }

  // ---- Iteration 3 fetches ----
  function fetchWorkflows(projectId) {
    const q = projectId ? `?projectId=${projectId}` : '';
    fetch(`${API}/workflows${q}`, { headers: headers() })
      .then(r => r.json()).then(d => setWorkflows(Array.isArray(d) ? d : [])).catch(() => {});
  }
  function fetchFieldDefs(projectId) {
    const q = projectId ? `?projectId=${projectId}` : '';
    fetch(`${API}/field-defs${q}`, { headers: headers() })
      .then(r => r.json()).then(d => setFieldDefs(Array.isArray(d) ? d : [])).catch(() => {});
  }
  function fetchRoles() {
    fetch(`${API}/permission-schemes/roles`, { headers: headers() })
      .then(r => r.json()).then(d => setRoles(Array.isArray(d) ? d : [])).catch(() => {});
  }
  function fetchWorkItemTypes() {
    fetch(`${API}/work-item-types`, { headers: headers() })
      .then(r => r.json()).then(d => setWorkItemTypes(d || { builtIn: [], custom: [] })).catch(() => {});
  }
  function fetchPermMatrix() {
    fetch(`${API}/permission-schemes/matrix?workspaceId=WS-001`, { headers: headers() })
      .then(r => r.json()).then(d => setPermMatrix(d)).catch(() => {});
  }
  function runWiql() {
    setWiqlError('');
    fetch(`${API}/wiql/execute`, { method: 'POST', headers: headers(), body: JSON.stringify({ query: wiqlQuery }) })
      .then(r => r.json()).then(d => {
        if (d.error) { setWiqlError(d.error); setWiqlResults([]); }
        else setWiqlResults(Array.isArray(d) ? d : []);
      }).catch(err => setWiqlError(err.message));
  }
  function fetchWiqlFilters() {
    fetch(`${API}/wiql/filters`, { headers: headers() })
      .then(r => r.json()).then(d => setWiqlFilters(Array.isArray(d) ? d : [])).catch(() => {});
  }
  function saveWiqlFilter() {
    if (!wiqlFilterName.trim() || !wiqlQuery.trim()) return;
    fetch(`${API}/wiql/filters`, { method: 'POST', headers: headers(), body: JSON.stringify({ name: wiqlFilterName, query: wiqlQuery, isShared: false }) })
      .then(r => r.json()).then(f => { setWiqlFilters(prev => [f, ...prev]); setWiqlFilterName(''); showToast('Filter saved'); })
      .catch(() => showToast('Failed to save filter', 'error'));
  }

  // ---- Iteration 4 fetches ----
  function fetchRaidDashboard(pid) {
    if (!pid) return;
    fetch(`${API}/raid-dashboard?projectId=${pid}`, { headers: headers() })
      .then(r => r.json()).then(setRaidDashboard).catch(() => {});
  }
  function fetchRisks(pid)       { fetch(`${API}/risks?projectId=${pid}`, { headers: headers() }).then(r => r.json()).then(d => setRisks(Array.isArray(d) ? d : [])).catch(() => {}); }
  function fetchAssumptions(pid) { fetch(`${API}/assumptions?projectId=${pid}`, { headers: headers() }).then(r => r.json()).then(d => setAssumptions(Array.isArray(d) ? d : [])).catch(() => {}); }
  function fetchPmIssues(pid)    { fetch(`${API}/pm-issues?projectId=${pid}`, { headers: headers() }).then(r => r.json()).then(d => setPmIssues(Array.isArray(d) ? d : [])).catch(() => {}); }
  function fetchDependencies(pid){ fetch(`${API}/dependencies?projectId=${pid}`, { headers: headers() }).then(r => r.json()).then(d => setDependencies(Array.isArray(d) ? d : [])).catch(() => {}); }
  function fetchDecisions(pid)   { fetch(`${API}/decisions?projectId=${pid}`, { headers: headers() }).then(r => r.json()).then(d => setDecisions(Array.isArray(d) ? d : [])).catch(() => {}); }
  function fetchMeetings(pid)    { fetch(`${API}/meetings?projectId=${pid}`, { headers: headers() }).then(r => r.json()).then(d => setMeetings(Array.isArray(d) ? d : [])).catch(() => {}); }
  function fetchActionItems(pid) { fetch(`${API}/action-items?projectId=${pid}`, { headers: headers() }).then(r => r.json()).then(d => setActionItems(Array.isArray(d) ? d : [])).catch(() => {}); }
  function fetchStakeholders(pid){ fetch(`${API}/stakeholders?projectId=${pid}`, { headers: headers() }).then(r => r.json()).then(d => setStakeholders(Array.isArray(d) ? d : [])).catch(() => {}); }
  function fetchLessons(pid)     { fetch(`${API}/lessons-learned?projectId=${pid}`, { headers: headers() }).then(r => r.json()).then(d => setLessonsLearned(Array.isArray(d) ? d : [])).catch(() => {}); }

  function pmCreate(type, payload) {
    const endpoints = {
      risk: 'risks', assumption: 'assumptions', issue: 'pm-issues', dependency: 'dependencies',
      decision: 'decisions', meeting: 'meetings', action: 'action-items', stakeholder: 'stakeholders', lesson: 'lessons-learned'
    };
    const ep = endpoints[type];
    if (!ep) return;
    fetch(`${API}/${ep}`, { method: 'POST', headers: headers(), body: JSON.stringify({ ...payload, projectId: pmProjectId, workspaceId: 'WS-001' }) })
      .then(r => r.json()).then(() => {
        setPmFormOpen(null); setPmForm({});
        if (type === 'risk')        { fetchRisks(pmProjectId); fetchRaidDashboard(pmProjectId); }
        if (type === 'assumption')  { fetchAssumptions(pmProjectId); fetchRaidDashboard(pmProjectId); }
        if (type === 'issue')       { fetchPmIssues(pmProjectId); fetchRaidDashboard(pmProjectId); }
        if (type === 'dependency')  { fetchDependencies(pmProjectId); fetchRaidDashboard(pmProjectId); }
        if (type === 'decision')    { fetchDecisions(pmProjectId); }
        if (type === 'meeting')     { fetchMeetings(pmProjectId); }
        if (type === 'action')      { fetchActionItems(pmProjectId); }
        if (type === 'stakeholder') { fetchStakeholders(pmProjectId); }
        if (type === 'lesson')      { fetchLessons(pmProjectId); }
        showToast('Created successfully');
      }).catch(err => showToast(err.message, 'error'));
  }

  function pmDelete(type, id) {
    const endpoints = {
      risk: 'risks', assumption: 'assumptions', issue: 'pm-issues', dependency: 'dependencies',
      decision: 'decisions', meeting: 'meetings', action: 'action-items', stakeholder: 'stakeholders', lesson: 'lessons-learned'
    };
    const ep = endpoints[type];
    if (!ep) return;
    fetch(`${API}/${ep}/${id}`, { method: 'DELETE', headers: headers() }).then(() => {
      if (type === 'risk')        { fetchRisks(pmProjectId); fetchRaidDashboard(pmProjectId); }
      if (type === 'assumption')  { fetchAssumptions(pmProjectId); fetchRaidDashboard(pmProjectId); }
      if (type === 'issue')       { fetchPmIssues(pmProjectId); fetchRaidDashboard(pmProjectId); }
      if (type === 'dependency')  { fetchDependencies(pmProjectId); fetchRaidDashboard(pmProjectId); }
      if (type === 'decision')    fetchDecisions(pmProjectId);
      if (type === 'meeting')     fetchMeetings(pmProjectId);
      if (type === 'action')      fetchActionItems(pmProjectId);
      if (type === 'stakeholder') fetchStakeholders(pmProjectId);
      if (type === 'lesson')      fetchLessons(pmProjectId);
      showToast('Deleted');
    }).catch(() => showToast('Delete failed', 'error'));
  }

  function fetchTrash() {
    fetch(`${API}/work-items/trash`, { headers: headers() })
      .then(r => r.json()).then(d => setTrashItems(Array.isArray(d) ? d : [])).catch(() => {});
  }

  function restoreFromTrash(id) {
    apiFetch(`${API}/work-items/${id}/restore`, { method: 'PUT' })
      .then(item => {
        setTrashItems(prev => prev.filter(i => i.id !== id));
        setWorkItems(prev => [...prev, item]);
        showToast('Item restored from trash');
      }).catch(err => showToast(err.message, 'error'));
  }

  function permanentDelete(id) {
    if (!window.confirm('Permanently delete? This cannot be undone.')) return;
    apiFetch(`${API}/work-items/${id}/permanent`, { method: 'DELETE' })
      .then(() => { setTrashItems(prev => prev.filter(i => i.id !== id)); showToast('Permanently deleted'); })
      .catch(err => showToast(err.message, 'error'));
  }

  function toggleStar(item) {
    const isStarred = item.starred;
    const method = isStarred ? 'DELETE' : 'POST';
    fetch(`${API}/work-items/${item.id}/star`, { method, headers: headers() })
      .then(r => r.json()).then(() => {
        setWorkItems(prev => prev.map(i => i.id === item.id ? { ...i, starred: !isStarred } : i));
        if (selectedItem?.id === item.id) setSelectedItem(prev => ({ ...prev, starred: !isStarred }));
      }).catch(() => {});
  }

  function fetchProjectMembers(projectId) {
    setSelectedProjectId(projectId);
    fetch(`${API}/workspaces/WS-001/projects/${projectId}/members`, { headers: headers() })
      .then(r => r.json()).then(d => setProjectMembers(Array.isArray(d) ? d : [])).catch(() => {});
  }

  function addProjectMember(projectId) {
    if (!projectMemberEmail.trim()) return;
    apiFetch(`${API}/workspaces/WS-001/projects/${projectId}/members`, {
      method: 'POST', body: JSON.stringify({ email: projectMemberEmail, role: 'MEMBER' })
    }).then(d => {
      setProjectMemberMsg(d.message || 'Added!');
      setProjectMemberEmail('');
      fetchProjectMembers(projectId);
    }).catch(err => setProjectMemberMsg(err.message || 'Error'));
  }

  function addReply(workItemId, parentId) {
    if (!replyBody.trim()) return;
    fetch(`${API}/work-items/${workItemId}/comments`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ body: replyBody, isInternal: false, parentId })
    }).then(r => r.json()).then(c => {
      setComments(prev => prev.map(cm =>
        cm.id === parentId ? { ...cm, replies: [...(cm.replies || []), { ...c, authorName: currentUser.fullName }] } : cm
      ));
      setReplyBody(''); setReplyingTo(null);
    }).catch(() => {});
  }

  const handleCreateSprint = () => {
    fetch(`${API}/sprints`, { method: 'POST', headers: headers(), body: JSON.stringify({ ...newSprint, projectId: 'PROJ-WORKS' }) })
      .then(r => r.json()).then(s => {
        setSprints(prev => [s, ...prev]);
        setNewSprint({ name: '', goal: '', startDate: '', endDate: '', capacity: 40 });
        setIsSprintOpen(false);
        if (!activeSprint) { setActiveSprint(s); }
      });
  };
  const handleSprintStatusChange = (sprintId, newStatus) => {
    const sprint = sprints.find(s => s.id === sprintId);
    if (!sprint) return;
    fetch(`${API}/sprints/${sprintId}`, { method: 'PUT', headers: headers(), body: JSON.stringify({ ...sprint, status: newStatus }) })
      .then(r => r.json()).then(updated => {
        setSprints(prev => prev.map(s => s.id === updated.id ? updated : s));
        if (activeSprint?.id === updated.id) setActiveSprint(updated);
      });
  };
  const handleMoveToSprint = (itemId, sprintId) => {
    fetch(`${API}/sprints/${sprintId}/items/${itemId}`, { method: 'POST', headers: headers() })
      .then(() => { fetchBacklog(); if (activeSprint) fetchSprintItems(activeSprint.id); });
  };
  const handleMoveToBacklog = (itemId, sprintId) => {
    fetch(`${API}/sprints/${sprintId}/items/${itemId}`, { method: 'DELETE', headers: headers() })
      .then(() => { fetchBacklog(); fetchSprintItems(sprintId); });
  };

  // Backlog drag-drop reorder
  const handleBacklogDragStart = (e, id) => { e.dataTransfer.setData('backlogId', id); };
  const handleBacklogDrop = (e, targetId) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('backlogId');
    if (!sourceId || sourceId === targetId) { setDragOverId(null); return; }
    const items = [...backlogItems];
    const sourceIdx = items.findIndex(i => i.id === sourceId);
    const targetIdx = items.findIndex(i => i.id === targetId);
    const [moved] = items.splice(sourceIdx, 1);
    items.splice(targetIdx, 0, moved);
    const reordered = items.map((item, idx) => ({ ...item, backlogOrder: idx }));
    setBacklogItems(reordered);
    setDragOverId(null);
    fetch(`${API}/work-items/backlog/reorder`, {
      method: 'PUT', headers: headers(),
      body: JSON.stringify(reordered.map((i, idx) => ({ id: i.id, order: idx })))
    }).catch(() => {});
  };

  // Inline refinement update (story points, priority)
  const handleRefinementUpdate = (itemId, field, value) => {
    const item = backlogItems.find(i => i.id === itemId);
    if (!item) return;
    const updated = { ...item, [field]: value };
    setBacklogItems(prev => prev.map(i => i.id === itemId ? updated : i));
    fetch(`${API}/work-items/${itemId}`, { method: 'PUT', headers: headers(), body: JSON.stringify(updated) }).catch(() => {});
  };

  const handleSaveFilter = () => {
    if (!saveFilterName.trim()) return;
    fetch(`${API}/saved-filters`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ name: saveFilterName, filterJson: JSON.stringify(activeFilter), isShared: false })
    }).then(r => r.json()).then(f => { setSavedFilters(prev => [...prev, f]); setSaveFilterName(''); setShowSaveFilter(false); });
  };

  const applyFilter = (items) => {
    if (!activeFilter) return items;
    if (activeFilter.type === 'mine') return items.filter(i => i.assigneeId === currentUser.id);
    if (activeFilter.type === 'priority') return items.filter(i => i.priority === activeFilter.value);
    if (activeFilter.type === 'itemType') return items.filter(i => i.type === activeFilter.value);
    if (activeFilter.type === 'blockers') return items.filter(i => i.priority === 'CRITICAL' || i.type === 'Incident');
    return items;
  };

  // LINKS
  const handleAddLink = () => {
    if (!newLink.targetId) return;
    fetch(`${API}/work-items/${selectedItem.id}/links`, {
      method: 'POST', headers: headers(), body: JSON.stringify(newLink)
    }).then(r => r.json()).then(l => { setLinks(prev => [...prev, l]); setNewLink({ targetId: '', linkType: 'RELATES_TO' }); });
  };
  const handleDeleteLink = (linkId) => {
    fetch(`${API}/work-items/${selectedItem.id}/links/${linkId}`, { method: 'DELETE', headers: headers() })
      .then(() => setLinks(prev => prev.filter(l => l.id !== linkId)));
  };

  // ATTACHMENTS
  const MAX_UPLOAD_MB = 20; // must match app.attachments.max-size-bytes / 1024 / 1024
  const handleUploadFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    // Client-side size guard (mirrors server limit)
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      showToast(`File too large — max ${MAX_UPLOAD_MB} MB`, 'error'); return;
    }
    const fd = new FormData(); fd.append('file', file);
    fetch(`${API}/work-items/${selectedItem.id}/attachments`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: fd
    }).then(async res => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = {
          413: `File too large (max ${MAX_UPLOAD_MB} MB)`,
          415: 'File type not permitted',
          422: 'File rejected by virus scanner',
        }[res.status] || (err.message || `Upload failed (${res.status})`);
        showToast(msg, 'error');
        return null;
      }
      return res.json();
    }).then(a => { if (a) setAttachments(prev => [a, ...prev]); });
  };
  const handleDeleteAttachment = (attId) => {
    fetch(`${API}/work-items/${selectedItem.id}/attachments/${attId}`, { method: 'DELETE', headers: headers() })
      .then(() => setAttachments(prev => prev.filter(a => a.id !== attId)));
  };

  // PROJECT ARCHIVE
  const handleArchiveProject = (projectId) => {
    fetch(`${API}/projects/${projectId}/archive`, { method: 'PUT', headers: headers() })
      .then(r => r.json()).then(p => setProjects(prev => prev.map(x => x.id === p.id ? p : x)));
  };

  const columns = [
    { name: 'Todo',        dot: 'bg-neutral-400' },
    { name: 'In Progress', dot: 'bg-brand-navy-tint' },
    { name: 'Done',        dot: 'bg-semantic-success' },
  ];

  const densityPad = { compact: 'p-2', comfortable: 'p-3', spacious: 'p-4' };
  const userName = u => users.find(x => x.id === u)?.fullName || '';
  const myItems  = workItems.filter(i => i.assigneeId === currentUser?.id);

  // ==========================================
  // AUTH SCREENS
  // ==========================================
  if (!currentUser) {
    // Email verification pending screen
    if (verifyPending) return (
      <div className="flex h-screen bg-neutral-100 items-center justify-center font-sans">
        <div className="bg-white p-8 rounded-xl shadow-xl w-96 border border-neutral-200">
          <div className="flex justify-center mb-6"><Logo /></div>
          <div className="w-14 h-14 rounded-full bg-semantic-success/10 flex items-center justify-center text-2xl mx-auto mb-4">📧</div>
          <h2 className="text-xl font-bold text-brand-navy text-center mb-2">Check your email</h2>
          <p className="text-sm text-neutral-500 text-center mb-5">
            We sent a verification link to <strong>{verifyPending.email}</strong>.<br/>
            Click it to activate your account.
          </p>
          {verifyMsg && <p className="text-sm text-semantic-danger text-center mb-3">{verifyMsg}</p>}
          {/* DEV/UAT only — show token so testers can verify without email */}
          {verifyPending.devToken && (
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 mb-4">
              <p className="text-[10px] text-neutral-400 uppercase tracking-wider mb-1">UAT — One-click verify</p>
              <button onClick={() => handleVerifyEmail(verifyPending.devToken)}
                className="w-full py-2 bg-brand-navy text-white rounded-lg text-sm font-semibold hover:bg-brand-navy/90 transition-colors">
                ✓ Verify my email (UAT shortcut)
              </button>
              <p className="text-[10px] text-neutral-400 mt-2 text-center">In production this arrives by email</p>
            </div>
          )}
          <button onClick={() => { setVerifyPending(null); setAuthMode('login'); }}
            className="w-full text-center text-sm text-neutral-400 hover:text-brand-navy transition-colors">
            ← Back to sign in
          </button>
        </div>
      </div>
    );

    // MFA challenge screen
    if (mfaChallenge) return (
      <div className="flex h-screen bg-neutral-100 items-center justify-center font-sans">
        <div className="bg-white p-8 rounded-xl shadow-xl w-96 border border-neutral-200">
          <div className="flex justify-center mb-6"><Logo /></div>
          <div className="w-14 h-14 rounded-full bg-brand-navy/10 flex items-center justify-center text-2xl mx-auto mb-4">🔐</div>
          <h2 className="text-xl font-bold text-brand-navy text-center mb-2">Two-factor authentication</h2>
          <p className="text-sm text-neutral-500 text-center mb-5">Enter the 6-digit code from your authenticator app.</p>
          {mfaError && <p className="text-sm text-semantic-danger text-center mb-3">{mfaError}</p>}
          <input type="text" inputMode="numeric" maxLength={6} placeholder="000000"
            value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/\D/g,''))}
            onKeyDown={e => e.key === 'Enter' && mfaCode.length === 6 && handleMfaVerify()}
            className="input text-center text-2xl tracking-widest mb-4" autoFocus />
          <Button variant="action" fullWidth onClick={handleMfaVerify}
            disabled={mfaCode.length !== 6}>Verify Code</Button>
          <button onClick={() => { setMfaChallenge(null); setMfaCode(''); }}
            className="w-full mt-3 text-center text-sm text-neutral-400 hover:text-brand-navy transition-colors">
            ← Back to sign in
          </button>
        </div>
      </div>
    );

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
                  onChange={e => setAuthForm({ ...authForm, fullName: e.target.value })} className="input" autoFocus />
              </Field>
            )}
            <Field label="Email">
              <input type="email" required value={authForm.email}
                onChange={e => setAuthForm({ ...authForm, email: e.target.value })} className="input" />
            </Field>
            {authMode === 'signup' && (
              <Field label="Confirm Email">
                <input type="email" required value={confirmEmail}
                  onChange={e => setConfirmEmail(e.target.value)} className="input"
                  placeholder="Re-enter your email" />
              </Field>
            )}
            <Field label="Password">
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} required value={authForm.password}
                  onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                  className="input pr-10" placeholder={authMode === 'signup' ? 'Min. 8 characters' : ''} />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors text-sm select-none"
                  tabIndex={-1}>
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </Field>
            {authMode === 'signup' && (
              <Field label="Confirm Password">
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} required value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="input pr-10" placeholder="Re-enter your password" />
                  {confirmPassword && (
                    <span className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-sm ${confirmPassword === authForm.password ? 'text-semantic-success' : 'text-semantic-danger'}`}>
                      {confirmPassword === authForm.password ? '✓' : '✕'}
                    </span>
                  )}
                </div>
              </Field>
            )}
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
            <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); setShowPassword(false); setConfirmEmail(''); setConfirmPassword(''); }}
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
          <NavItem active={view === 'dashboard'} onClick={() => setView('dashboard')} icon="🏠">Home</NavItem>
          <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-3 pt-3 pb-1">My Work</p>
          <NavItem active={view === 'myworks'} onClick={() => { setView('myworks'); fetchNotifications(); }} icon="👤">
            My Works
            {myItems.length > 0 && <span className="ml-auto text-[10px] bg-neutral-100 text-neutral-600 rounded-full px-1.5 py-0.5">{myItems.length}</span>}
          </NavItem>
          <NavItem active={view === 'notifications'} onClick={() => { setView('notifications'); fetchNotifications(); }} icon="🔔">
            Notifications
            {unreadCount > 0 && <span className="ml-auto text-[10px] bg-brand-orange text-white rounded-full px-1.5 py-0.5">{unreadCount}</span>}
          </NavItem>

          <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-3 pt-3 pb-1">Projects</p>
          <NavItem active={view === 'board'} onClick={() => setView('board')} icon="📋">Board</NavItem>
          <NavItem active={view === 'backlog'} onClick={() => { setView('backlog'); fetchBacklog(); fetchSprints(); fetchSavedFilters(); }} icon="📝">Backlog</NavItem>
          <NavItem active={view === 'sprint'} onClick={() => { setView('sprint'); fetchSprints(); fetchSavedFilters(); }} icon="⚡">
            Active Sprint
            {sprints.find(s => s.status === 'ACTIVE') && <span className="ml-auto w-2 h-2 rounded-full bg-semantic-success flex-shrink-0"></span>}
          </NavItem>
          <NavItem active={view === 'reports'} onClick={() => { setView('reports'); fetchSprints(); fetchVelocityData(); }} icon="📊">Reports</NavItem>

          <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-3 pt-3 pb-1">Configuration</p>
          <NavItem active={view === 'settings3'} onClick={() => { setView('settings3'); fetchWorkflows(); fetchFieldDefs(); fetchRoles(); fetchWorkItemTypes(); }} icon="⚙">Workflows & Fields</NavItem>
          <NavItem active={view === 'wiql'} onClick={() => { setView('wiql'); fetchWiqlFilters(); }} icon="🔍">WIQL Query</NavItem>

          <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-3 pt-3 pb-1">Project Management</p>
          <NavItem active={view === 'pm'} onClick={() => { setView('pm'); if (projects.length) { const pid = projects[0].id; setPmProjectId(pid); fetchRaidDashboard(pid); fetchRisks(pid); fetchAssumptions(pid); fetchPmIssues(pid); fetchDependencies(pid); fetchDecisions(pid); fetchMeetings(pid); fetchActionItems(pid); fetchStakeholders(pid); fetchLessons(pid); } }} icon="📋">PM Artifacts</NavItem>

          <NavItem active={view === 'projects'} onClick={() => setView('projects')} icon="📁">
            Projects
            {projects.length > 0 && <span className="ml-auto text-[10px] bg-neutral-100 text-neutral-600 rounded-full px-1.5 py-0.5">{projects.length}</span>}
          </NavItem>

          <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-3 pt-3 pb-1">Workspace</p>
          <NavItem active={view === 'workspace'} onClick={() => { setView('workspace'); fetchMembers(); fetchNotifPrefs(); fetchBranding(); }} icon="⚙️">Settings</NavItem>
          <NavItem active={view === 'trash'} onClick={() => { setView('trash'); fetchTrash(); }} icon="🗑">
            Trash
          </NavItem>
        </nav>

        <div className="p-3 border-t border-neutral-200">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-neutral-50 cursor-pointer">
            <Avatar name={currentUser.fullName} size={7} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-neutral-900 truncate">{currentUser.fullName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <RoleBadge role={userRole.role} tier={userRole.tier} small />
              </div>
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
            {searchOpen && !searchQuery.trim() && recentlyViewed.length > 0 && (
              <div className="absolute top-full mt-1 w-80 bg-white rounded-lg shadow-xl border border-neutral-200 z-50 max-h-64 overflow-y-auto">
                <div className="px-4 py-2 border-b border-neutral-100">
                  <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Recently Viewed</p>
                </div>
                {recentlyViewed.map(item => {
                  const full = workItems.find(i => i.id === item.id);
                  return (
                    <button key={item.id} onClick={() => { if (full) { setSelectedItem(full); } setSearchQuery(''); setSearchOpen(false); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-neutral-50 border-b border-neutral-100 last:border-0">
                      <div className="flex items-center gap-2">
                        <TypeBadge type={item.type} compact />
                        <span className="font-mono text-[10px] text-neutral-400">{item.id}</span>
                      </div>
                      <div className="text-sm text-neutral-900 font-medium mt-0.5 truncate">{item.title}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDarkMode(d => !d)} title="Toggle dark/light mode"
              className="w-8 h-8 rounded-md flex items-center justify-center text-neutral-400 hover:bg-neutral-100 transition-colors text-base">
              {darkMode ? '☀️' : '🌙'}
            </button>
            {can('create_items') && (
              <Button variant="action" onClick={() => { setView('board'); setIsCreateOpen(true); }}>
                + Create
              </Button>
            )}
          </div>
        </header>

        {/* CONTENT */}
        <div className="flex-1 overflow-auto">

          {/* DASHBOARD HOME */}
          {view === 'dashboard' && (
            <div className="p-6 max-w-6xl">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-brand-navy">Good {getTimeOfDay()}, {currentUser.fullName.split(' ')[0]} 👋</h1>
                <p className="text-sm text-neutral-400 mt-0.5">Here's what needs your attention today</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* My open items */}
                <StatCard label="Assigned to me" value={myItems.filter(i => i.status !== 'Done').length} sub={`${myItems.length} total`} color="text-brand-navy" icon="👤" onClick={() => setView('myworks')} />
                {/* Active sprint */}
                <StatCard label="Active sprint items" value={sprints.find(s=>s.status==='ACTIVE') ? sprintItems.filter(i=>i.status!=='Done').length : '—'} sub={sprints.find(s=>s.status==='ACTIVE')?.name || 'No active sprint'} color="text-semantic-success" icon="⚡" onClick={() => { fetchSprints(); setView('sprint'); }} />
                {/* Unread notifications */}
                <StatCard label="Unread notifications" value={unreadCount} sub="Click to view all" color="text-brand-orange" icon="🔔" onClick={() => { fetchNotifications(); setView('notifications'); }} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Due soon */}
                <div className="bg-white border border-neutral-200 rounded-xl p-5">
                  <h3 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                    <span>📅</span> Due Soon
                  </h3>
                  {workItems.filter(i => i.dueDate && i.status !== 'Done').sort((a,b) => new Date(a.dueDate)-new Date(b.dueDate)).slice(0,5).map(item => (
                    <div key={item.id} onClick={() => setSelectedItem(item)} className="flex items-center gap-3 py-2 border-b border-neutral-50 last:border-0 cursor-pointer hover:bg-neutral-50 -mx-2 px-2 rounded">
                      <TypeBadge type={item.type} compact />
                      <span className="flex-1 text-sm text-neutral-900 truncate">{item.title}</span>
                      <span className={`text-xs font-medium ${new Date(item.dueDate) < new Date() ? 'text-semantic-danger' : 'text-semantic-warning'}`}>{item.dueDate}</span>
                    </div>
                  ))}
                  {workItems.filter(i => i.dueDate && i.status !== 'Done').length === 0 && <p className="text-sm text-neutral-400 text-center py-4">No upcoming due dates 🎉</p>}
                </div>

                {/* Critical + High priority open items */}
                <div className="bg-white border border-neutral-200 rounded-xl p-5">
                  <h3 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                    <span>🔥</span> High Priority Open
                  </h3>
                  {workItems.filter(i => (i.priority==='CRITICAL'||i.priority==='HIGH') && i.status!=='Done').slice(0,5).map(item => (
                    <div key={item.id} onClick={() => setSelectedItem(item)} className="flex items-center gap-3 py-2 border-b border-neutral-50 last:border-0 cursor-pointer hover:bg-neutral-50 -mx-2 px-2 rounded">
                      <PriorityBadge priority={item.priority} />
                      <span className="flex-1 text-sm text-neutral-900 truncate">{item.title}</span>
                      <StatusBadge category={statusToCategory(item.status)}>{item.status}</StatusBadge>
                    </div>
                  ))}
                  {workItems.filter(i => (i.priority==='CRITICAL'||i.priority==='HIGH') && i.status!=='Done').length === 0 && <p className="text-sm text-neutral-400 text-center py-4">No critical/high items 🎉</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Project health */}
                <div className="bg-white border border-neutral-200 rounded-xl p-5">
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
                        <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                          <div className="h-full bg-semantic-success rounded-full" style={{width:`${pct}%`}}></div>
                        </div>
                      </div>
                    );
                  })}
                  {projects.length===0 && <p className="text-sm text-neutral-400 text-center py-4">No projects yet</p>}
                </div>

                {/* Your role card */}
                <div className="bg-white border border-neutral-200 rounded-xl p-5">
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
                      <div key={p.perm} className="flex items-center justify-between py-1 border-b border-neutral-50 last:border-0">
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
          )}

          {/* MY WORKS */}
          {view === 'myworks' && (
            <div className="p-8 max-w-4xl">
              <h1 className="text-2xl font-bold text-brand-navy mb-1">My Works</h1>
              <p className="text-sm text-neutral-400 mb-4">Your personal workspace</p>
              {/* Sub-tabs */}
              <div className="flex gap-1 mb-5 border-b border-neutral-200">
                {[
                  { key: 'assigned', label: `Assigned (${myItems.length})` },
                  { key: 'starred',  label: `Starred (${workItems.filter(i => i.starred).length})` },
                  { key: 'mentions', label: `Mentions (${notifications.filter(n => n.type === 'MENTION').length})` },
                  { key: 'activity', label: 'Recent Activity' },
                ].map(t => (
                  <button key={t.key} onClick={() => setMyWorksTab(t.key)}
                    className={`text-sm font-medium px-4 py-2 border-b-2 transition-colors ${myWorksTab === t.key ? 'border-brand-navy text-brand-navy' : 'border-transparent text-neutral-400 hover:text-neutral-700'}`}>
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
                        className="bg-white border border-neutral-200 rounded-lg p-4 flex items-center gap-4 hover:shadow-sm cursor-pointer transition-shadow">
                        <TypeBadge type={item.type} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 truncate">{item.title}</p>
                          <p className="text-xs text-neutral-400 font-mono">{item.id}</p>
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
                          className="bg-white border border-brand-orange/30 rounded-lg p-4 flex items-center gap-4 hover:shadow-sm cursor-pointer transition-shadow">
                          <span className="text-brand-orange text-sm">★</span>
                          <TypeBadge type={item.type} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-neutral-900 truncate">{item.title}</p>
                            <p className="text-xs text-neutral-400 font-mono">{item.id}</p>
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
                        <div key={n.id} className={`bg-white border rounded-lg p-4 ${!n.read ? 'border-brand-navy-tint/30' : 'border-neutral-200'}`}>
                          <p className="text-sm text-neutral-900">{n.message}</p>
                          <p className="text-xs text-neutral-400 mt-1">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</p>
                        </div>
                      ))}
                    </div>;
              })()}
              {myWorksTab === 'activity' && (
                <div className="space-y-2">
                  {workItems.filter(i => i.createdBy === currentUser.id || i.assigneeId === currentUser.id).slice(0, 20).map(i => (
                    <div key={i.id} onClick={() => setSelectedItem(i)}
                      className="bg-white border border-neutral-200 rounded-lg p-3 flex items-center gap-3 hover:shadow-sm cursor-pointer">
                      <TypeBadge type={i.type} compact />
                      <span className="text-xs font-mono text-neutral-400">{i.id}</span>
                      <span className="flex-1 text-sm text-neutral-900 truncate">{i.title}</span>
                      <StatusBadge category={statusToCategory(i.status)}>{i.status}</StatusBadge>
                    </div>
                  ))}
                  {workItems.filter(i => i.createdBy === currentUser.id || i.assigneeId === currentUser.id).length === 0 &&
                    <EmptyState icon="📋" title="No recent activity" subtitle="Items you create or are assigned to will show here." />}
                </div>
              )}
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
                : loading ? (
                  <div className="flex gap-4 flex-1 overflow-x-auto pb-4">
                    {columns.map(col => (
                      <div key={col.name} className="flex-1 min-w-56 flex flex-col bg-neutral-100 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-3 px-1">
                          <div className="h-3 w-20 bg-neutral-200 rounded animate-pulse"></div>
                          <div className="h-5 w-6 bg-white rounded-full animate-pulse"></div>
                        </div>
                        {[1,2,3].map(n => (
                          <div key={n} className="bg-white rounded-lg p-3 mb-2 border border-neutral-200">
                            <div className="h-2 w-16 bg-neutral-100 rounded animate-pulse mb-2"></div>
                            <div className="h-3 w-full bg-neutral-100 rounded animate-pulse mb-1"></div>
                            <div className="h-3 w-3/4 bg-neutral-100 rounded animate-pulse mb-3"></div>
                            <div className="flex justify-between">
                              <div className="h-4 w-14 bg-neutral-100 rounded animate-pulse"></div>
                              <div className="h-5 w-5 bg-neutral-100 rounded-full animate-pulse"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
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
                                className={`bg-white rounded-lg shadow-sm border border-neutral-200 cursor-grab hover:shadow-md transition-shadow group ${densityPad[density]} ${item.starred ? 'border-brand-orange/40' : ''}`}>
                                <div className="flex items-start justify-between mb-1.5">
                                  <span className="font-mono text-[10px] text-neutral-400">{item.id}</span>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => toggleStar(item)} title={item.starred ? 'Unstar' : 'Star'}
                                      className={`text-xs p-0.5 transition-colors ${item.starred ? 'text-brand-orange' : 'text-neutral-300 hover:text-brand-orange'}`}>★</button>
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
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-neutral-900">{p.name}</h3>
                                {p.slug && (
                                  <span className="text-[10px] font-mono bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded border border-neutral-200"
                                    title="Slug-based project URL">
                                    /projects/{p.slug}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-neutral-400 mt-0.5">{p.description || 'No description'}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-semibold text-neutral-900">{count} items</p>
                              {count > 0 && <p className="text-xs text-semantic-success">{done} done</p>}
                              {p.leadUserId && <p className="text-xs text-neutral-400 mt-0.5">Lead: {userName(p.leadUserId)}</p>}
                              <button onClick={() => handleArchiveProject(p.id)}
                                className="text-xs text-neutral-300 hover:text-neutral-600 mt-1 transition-colors">
                                {p.archived ? 'Unarchive' : 'Archive'}
                              </button>
                            </div>
                          </div>
                          {count > 0 && (
                            <div className="mt-3">
                              <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                                <div className="h-full bg-semantic-success rounded-full transition-all" style={{ width: `${Math.round((done / count) * 100)}%` }}></div>
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

          {/* BACKLOG VIEW */}
          {view === 'backlog' && (
            <div className="p-6 max-w-5xl">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h1 className="text-xl font-bold text-brand-navy">Backlog</h1>
                  <p className="text-xs text-neutral-400 mt-0.5">{backlogItems.length} items not in any sprint</p>
                </div>
                <div className="flex gap-2 items-center">
                  <label className="flex items-center gap-1.5 cursor-pointer mr-2">
                    <input type="checkbox" checked={refinementMode} onChange={e => setRefinementMode(e.target.checked)} className="w-3 h-3 accent-brand-navy" />
                    <span className="text-xs text-neutral-600 font-medium">Refinement mode</span>
                  </label>
                  <Button variant="secondary" size="sm" onClick={() => setIsSprintOpen(true)}>+ New Sprint</Button>
                  <Button variant="action" size="sm" onClick={() => setIsCreateOpen(true)}>+ Add Item</Button>
                </div>
              </div>

              {/* Sprints with capacity bar */}
              {sprints.map(sprint => {
                const usedPts = sprint.usedPoints || 0;
                const capPct = sprint.capacity > 0 ? Math.min(100, Math.round((usedPts / sprint.capacity) * 100)) : 0;
                const capColor = capPct >= 100 ? 'bg-semantic-danger' : capPct >= 80 ? 'bg-semantic-warning' : 'bg-semantic-success';
                return (
                  <div key={sprint.id} className="bg-white border border-neutral-200 rounded-xl mb-4 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 bg-neutral-50">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sprint.status === 'ACTIVE' ? 'bg-semantic-success/10 text-semantic-success' : sprint.status === 'COMPLETED' ? 'bg-neutral-200 text-neutral-500' : 'bg-brand-navy-tint/10 text-brand-navy-tint'}`}>{sprint.status}</span>
                        <h3 className="font-semibold text-neutral-900">{sprint.name}</h3>
                        {sprint.goal && <span className="text-xs text-neutral-400 italic hidden md:inline">"{sprint.goal}"</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Capacity bar — shows actual committed pts vs capacity */}
                        {sprint.capacity > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 bg-neutral-200 rounded-full overflow-hidden" title={`${usedPts}/${sprint.capacity} story points`}>
                              <div className={`h-full rounded-full transition-all ${capColor}`} style={{ width: `${capPct}%` }}></div>
                            </div>
                            <span className={`text-xs font-medium ${capPct >= 100 ? 'text-semantic-danger' : capPct >= 80 ? 'text-semantic-warning' : 'text-neutral-400'}`}>
                              {usedPts}/{sprint.capacity}pt
                            </span>
                          </div>
                        )}
                        {sprint.startDate && <span className="text-xs text-neutral-400 hidden md:inline">{sprint.startDate} → {sprint.endDate}</span>}
                        {sprint.status === 'PLANNING' && <Button size="sm" variant="secondary" onClick={() => handleSprintStatusChange(sprint.id, 'ACTIVE')}>Start Sprint</Button>}
                        {sprint.status === 'ACTIVE' && <Button size="sm" variant="secondary" onClick={() => handleSprintStatusChange(sprint.id, 'COMPLETED')}>Complete</Button>}
                      </div>
                    </div>
                    <SprintItemList sprintId={sprint.id} users={users} onMoveToBacklog={(id) => handleMoveToBacklog(id, sprint.id)} onSelect={setSelectedItem} />
                  </div>
                );
              })}

              {/* Backlog items with drag-drop reorder */}
              <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 bg-neutral-50">
                  <h3 className="font-semibold text-neutral-900">Backlog</h3>
                  <span className="text-xs text-neutral-400">{backlogItems.length} items</span>
                </div>
                {backlogItems.length === 0
                  ? <EmptyState icon="📝" title="Backlog is empty" subtitle="Create work items to add them to the backlog." action={<Button variant="action" size="sm" onClick={() => setIsCreateOpen(true)}>Add to backlog</Button>} />
                  : backlogItems.map((item) => (
                    <div key={item.id}
                      draggable onDragStart={(e) => handleBacklogDragStart(e, item.id)}
                      onDragOver={(e) => { e.preventDefault(); setDragOverId(item.id); }}
                      onDragLeave={() => setDragOverId(null)}
                      onDrop={(e) => handleBacklogDrop(e, item.id)}
                      className={`flex items-center gap-3 px-5 py-3 border-b border-neutral-50 last:border-0 hover:bg-neutral-50 group transition-colors ${dragOverId === item.id ? 'border-t-2 border-t-brand-navy bg-brand-navy/5' : ''}`}>
                      <span className="text-neutral-300 cursor-grab text-xs mr-1">⠿</span>
                      <TypeBadge type={item.type} compact />
                      <span className="font-mono text-[10px] text-neutral-400 w-20 flex-shrink-0">{item.id}</span>
                      <span className="flex-1 text-sm text-neutral-900 cursor-pointer hover:text-brand-navy truncate" onClick={() => setSelectedItem(item)}>{item.title}</span>
                      {/* Refinement mode — inline edit */}
                      {refinementMode ? (
                        <div className="flex items-center gap-2">
                          <select value={item.priority || 'MEDIUM'} onChange={e => handleRefinementUpdate(item.id, 'priority', e.target.value)}
                            className="text-xs border border-neutral-200 rounded px-1.5 py-1 focus:outline-none text-neutral-600">
                            {['LOW','MEDIUM','HIGH','CRITICAL'].map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                          <input type="number" min={0} max={100} value={item.storyPoints || 0}
                            onChange={e => handleRefinementUpdate(item.id, 'storyPoints', parseInt(e.target.value) || 0)}
                            className="w-14 text-xs border border-neutral-200 rounded px-1.5 py-1 focus:outline-none text-center"
                            placeholder="pts" />
                        </div>
                      ) : (
                        <>
                          <PriorityBadge priority={item.priority} />
                          {(item.storyPoints > 0) && <span className="text-xs bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">{item.storyPoints}pt</span>}
                        </>
                      )}
                      {item.assigneeId && <Avatar name={users.find(u => u.id === item.assigneeId)?.fullName || ''} size={6} />}
                      {sprints.filter(s => s.status !== 'COMPLETED').length > 0 && (
                        <select className="opacity-0 group-hover:opacity-100 text-xs border border-neutral-200 rounded px-1 py-0.5 text-neutral-600 transition-opacity"
                          onChange={e => e.target.value && handleMoveToSprint(item.id, e.target.value)} defaultValue="">
                          <option value="" disabled>→ Sprint</option>
                          {sprints.filter(s => s.status !== 'COMPLETED').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      )}
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {/* ACTIVE SPRINT VIEW */}
          {view === 'sprint' && (
            <div className="p-6 h-full flex flex-col">
              {activeSprint ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-3 mb-0.5">
                        <h1 className="text-xl font-bold text-brand-navy">{activeSprint.name}</h1>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${activeSprint.status === 'ACTIVE' ? 'bg-semantic-success/10 text-semantic-success' : 'bg-neutral-200 text-neutral-500'}`}>{activeSprint.status}</span>
                      </div>
                      {activeSprint.goal && <p className="text-sm text-neutral-400 italic">"{activeSprint.goal}"</p>}
                      {activeSprint.startDate && <p className="text-xs text-neutral-400 mt-0.5">{activeSprint.startDate} → {activeSprint.endDate}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <select value={activeSprint.id}
                        onChange={e => { const s = sprints.find(x => x.id === e.target.value); if (s) { setActiveSprint(s); fetchSprintItems(s.id); } }}
                        className="text-sm border border-neutral-200 rounded-md px-2 py-1.5 focus:outline-none">
                        {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Capacity bar */}
                  {activeSprint.capacity > 0 && (
                    <div className="mb-3 bg-white border border-neutral-200 rounded-lg px-4 py-2.5 flex items-center gap-4">
                      <span className="text-xs text-neutral-400 font-medium w-20">Capacity</span>
                      <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-navy-tint rounded-full transition-all"
                          style={{ width: `${Math.min(100, (sprintItems.reduce((a, i) => a + (i.storyPoints || 0), 0) / activeSprint.capacity) * 100)}%` }}></div>
                      </div>
                      <span className="text-xs text-neutral-600 font-medium w-28 text-right">
                        {sprintItems.reduce((a, i) => a + (i.storyPoints || 0), 0)} / {activeSprint.capacity} pts
                      </span>
                    </div>
                  )}

                  {/* Quick filters + Swimlane + Saved filters */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {[
                      { label: 'All', filter: null },
                      { label: 'Mine', filter: { type: 'mine' } },
                      { label: '🔥 Blockers', filter: { type: 'blockers' } },
                      { label: '⬆ High Priority', filter: { type: 'priority', value: 'HIGH' } },
                      { label: '🐛 Bugs', filter: { type: 'itemType', value: 'Bug' } },
                    ].map(f => (
                      <button key={f.label} onClick={() => setActiveFilter(f.filter)}
                        className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${JSON.stringify(activeFilter) === JSON.stringify(f.filter) ? 'bg-brand-navy text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>
                        {f.label}
                      </button>
                    ))}
                    {savedFilters.map(f => (
                      <div key={f.id} className="flex items-center gap-0.5">
                        <button onClick={() => setActiveFilter(JSON.parse(f.filterJson))}
                          className={`text-xs px-2.5 py-1.5 rounded-l-full font-medium transition-colors ${f.shared ? 'bg-semantic-success/10 text-semantic-success' : 'bg-brand-navy/10 text-brand-navy'} hover:opacity-80`}>
                          {f.shared ? '🌐' : '★'} {f.name}
                        </button>
                        {f.createdBy === currentUser?.id && (
                          <button onClick={() => {
                            fetch(`${API}/saved-filters/${f.id}/share`, { method: 'PUT', headers: headers() })
                              .then(r => r.json()).then(() => fetchSavedFilters())
                              .catch(() => {});
                          }}
                            title={f.shared ? 'Make private' : 'Share with team'}
                            className={`text-[10px] px-1.5 py-1.5 rounded-r-full font-medium transition-colors ${f.shared ? 'bg-semantic-success/20 text-semantic-success hover:bg-semantic-success/30' : 'bg-neutral-100 text-neutral-400 hover:bg-neutral-200'}`}>
                            {f.shared ? '🔓' : '🔒'}
                          </button>
                        )}
                      </div>
                    ))}
                    {activeFilter && (
                      <div className="flex items-center gap-1 ml-auto">
                        {!showSaveFilter
                          ? <button onClick={() => setShowSaveFilter(true)} className="text-xs text-neutral-400 hover:text-brand-navy">Save filter</button>
                          : <div className="flex gap-1">
                              <input type="text" value={saveFilterName} onChange={e => setSaveFilterName(e.target.value)}
                                placeholder="Filter name" className="text-xs border border-neutral-200 rounded px-2 py-1 focus:outline-none" />
                              <Button size="sm" variant="secondary" onClick={handleSaveFilter}>Save</Button>
                              <button onClick={() => setShowSaveFilter(false)} className="text-xs text-neutral-400 px-1">✕</button>
                            </div>
                        }
                      </div>
                    )}
                    <select value={swimlaneBy} onChange={e => setSwimlaneBy(e.target.value)}
                      className="text-xs border border-neutral-200 rounded-md px-2 py-1.5 focus:outline-none text-neutral-600 ml-auto">
                      <option value="none">No swimlane</option>
                      <option value="assignee">By Assignee</option>
                      <option value="type">By Type</option>
                      <option value="priority">By Priority</option>
                      <option value="epic">By Epic</option>
                      <option value="tag">By Tag</option>
                    </select>
                  </div>

                  <SprintBoard items={applyFilter(sprintItems)} columns={columns} users={users}
                    swimlaneBy={swimlaneBy} allItems={workItems} onDragStart={handleDragStart} onDragOver={handleDragOver}
                    onDrop={(e, status) => {
                      e.preventDefault();
                      const itemId = e.dataTransfer.getData('itemId');
                      const item = sprintItems.find(i => i.id === itemId);
                      if (!item || item.status === status) return;
                      setSprintItems(prev => prev.map(i => i.id === itemId ? { ...i, status } : i));
                      fetch(`${API}/work-items/${itemId}`, { method: 'PUT', headers: headers(), body: JSON.stringify({ ...item, status }) }).catch(() => {});
                    }}
                    onSelect={setSelectedItem} onDelete={handleDelete} density={density} />
                </>
              ) : (
                <EmptyState icon="⚡" title="No sprints yet" subtitle="Create a sprint in the Backlog view to get started."
                  action={<Button variant="action" onClick={() => { setView('backlog'); fetchBacklog(); fetchSprints(); }}>Go to Backlog</Button>} />
              )}
            </div>
          )}

          {/* REPORTS VIEW */}
          {view === 'reports' && (
            <div className="p-8 max-w-5xl">
              <h1 className="text-2xl font-bold text-brand-navy mb-1">Sprint Reports</h1>
              <p className="text-sm text-neutral-400 mb-5">Velocity, delivery, and scope tracking</p>

              {/* VELOCITY CHART — multi-sprint comparison */}
              {velocityData.length > 0 && (
                <div className="bg-white border border-neutral-200 rounded-xl p-5 mb-6">
                  <h3 className="font-semibold text-neutral-900 mb-1">Velocity — All Sprints</h3>
                  <p className="text-xs text-neutral-400 mb-4">Committed capacity vs. delivered story points</p>
                  <div className="flex items-end gap-3 overflow-x-auto pb-2">
                    {velocityData.map((s) => {
                      const maxVal = Math.max(...velocityData.map(x => Math.max(x.capacity || 0, x.totalPoints, 1)));
                      const capH = Math.round(((s.capacity || 0) / maxVal) * 120);
                      const doneH = Math.round((s.donePoints / maxVal) * 120);
                      const totalH = Math.round((s.totalPoints / maxVal) * 120);
                      return (
                        <div key={s.sprintId} className="flex flex-col items-center gap-1 min-w-[80px]">
                          <div className="flex items-end gap-1 h-32">
                            {/* Capacity bar */}
                            <div className="flex flex-col justify-end h-32">
                              <div className="w-5 rounded-t bg-neutral-200" style={{ height: `${capH}px` }} title={`Capacity: ${s.capacity}pt`}></div>
                            </div>
                            {/* Committed bar */}
                            <div className="flex flex-col justify-end h-32">
                              <div className="w-5 rounded-t bg-brand-navy-tint" style={{ height: `${totalH}px` }} title={`Committed: ${s.totalPoints}pt`}></div>
                            </div>
                            {/* Delivered bar */}
                            <div className="flex flex-col justify-end h-32">
                              <div className="w-5 rounded-t bg-semantic-success" style={{ height: `${doneH}px` }} title={`Delivered: ${s.donePoints}pt`}></div>
                            </div>
                          </div>
                          <p className="text-[10px] text-neutral-400 text-center leading-tight max-w-[80px] truncate">{s.sprintName.replace('Sprint ', 'S').replace(' — ', ' ')}</p>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${s.status === 'ACTIVE' ? 'bg-semantic-success/10 text-semantic-success' : s.status === 'COMPLETED' ? 'bg-neutral-100 text-neutral-500' : 'bg-neutral-50 text-neutral-400'}`}>{s.status}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-neutral-400">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-neutral-200 inline-block"></span>Capacity</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-brand-navy-tint inline-block"></span>Committed</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-semantic-success inline-block"></span>Delivered</span>
                  </div>
                </div>
              )}

              {sprints.length === 0
                ? <EmptyState icon="📊" title="No sprints to report on" subtitle="Complete a sprint to see reports here." />
                : <>
                    <div className="flex gap-2 mb-5 flex-wrap">
                      {sprints.map(s => (
                        <button key={s.id} onClick={() => { setSelectedSprintId(s.id); fetchSprintReport(s.id); }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedSprintId === s.id ? 'bg-brand-navy text-white' : 'bg-white border border-neutral-200 text-neutral-600 hover:border-brand-navy'}`}>
                          {s.name}
                        </button>
                      ))}
                    </div>
                    {sprintReport ? (
                      <div className="space-y-4">
                        {/* KPI cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {[
                            { label: 'Total Items', value: sprintReport.totalItems, color: 'text-neutral-900' },
                            { label: 'Completed', value: sprintReport.doneItems, color: 'text-semantic-success' },
                            { label: 'Completion', value: `${sprintReport.completionRate}%`, color: 'text-brand-navy' },
                            { label: 'Velocity', value: `${sprintReport.donePoints}/${sprintReport.totalPoints}pt`, color: 'text-brand-orange' },
                          ].map(card => (
                            <div key={card.label} className="bg-white border border-neutral-200 rounded-xl p-5">
                              <p className="text-xs text-neutral-400 mb-1">{card.label}</p>
                              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                            </div>
                          ))}
                        </div>

                        {/* Burndown chart (visual) */}
                        <div className="bg-white border border-neutral-200 rounded-xl p-5">
                          <h3 className="font-semibold text-neutral-900 mb-4">Burndown — Commitment vs Delivery</h3>
                          <div className="flex gap-3 mb-3 text-xs text-neutral-400">
                            <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded bg-semantic-success inline-block"></span>Done ({sprintReport.doneItems})</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded bg-brand-navy-tint inline-block"></span>In Progress ({sprintReport.inProgressItems})</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded bg-neutral-200 inline-block"></span>Todo ({sprintReport.todoItems})</span>
                          </div>
                          {/* Stacked bar burndown */}
                          <div className="h-8 bg-neutral-100 rounded-lg overflow-hidden flex mb-2">
                            {sprintReport.totalItems > 0 && <>
                              <div className="h-full bg-semantic-success transition-all flex items-center justify-center" style={{ width: `${(sprintReport.doneItems / sprintReport.totalItems) * 100}%` }}>
                                {sprintReport.doneItems > 0 && <span className="text-white text-[10px] font-bold">{sprintReport.doneItems}</span>}
                              </div>
                              <div className="h-full bg-brand-navy-tint transition-all flex items-center justify-center" style={{ width: `${(sprintReport.inProgressItems / sprintReport.totalItems) * 100}%` }}>
                                {sprintReport.inProgressItems > 0 && <span className="text-white text-[10px] font-bold">{sprintReport.inProgressItems}</span>}
                              </div>
                              <div className="h-full bg-neutral-200 transition-all flex items-center justify-center" style={{ width: `${(sprintReport.todoItems / sprintReport.totalItems) * 100}%` }}>
                                {sprintReport.todoItems > 0 && <span className="text-neutral-600 text-[10px] font-bold">{sprintReport.todoItems}</span>}
                              </div>
                            </>}
                          </div>
                          <p className="text-xs text-neutral-400">{sprintReport.completionRate}% complete · {sprintReport.velocityRate}% of story points delivered</p>
                        </div>

                        {/* Commitment vs Delivery — story points comparison */}
                        {sprintReport.totalPoints > 0 && (
                          <div className="bg-white border border-neutral-200 rounded-xl p-5">
                            <h3 className="font-semibold text-neutral-900 mb-1">Commitment vs Delivery</h3>
                            <p className="text-xs text-neutral-400 mb-4">Story points: what was committed vs what was delivered</p>
                            <div className="space-y-3">
                              {[
                                { label: 'Capacity', value: sprintReport.sprint?.capacity || 0, max: Math.max(sprintReport.sprint?.capacity || 0, sprintReport.totalPoints), color: 'bg-neutral-200' },
                                { label: 'Committed', value: sprintReport.totalPoints, max: Math.max(sprintReport.sprint?.capacity || 0, sprintReport.totalPoints), color: 'bg-brand-navy-tint' },
                                { label: 'Delivered', value: sprintReport.donePoints, max: Math.max(sprintReport.sprint?.capacity || 0, sprintReport.totalPoints), color: 'bg-semantic-success' },
                              ].map(row => (
                                <div key={row.label} className="flex items-center gap-3">
                                  <span className="text-xs text-neutral-500 w-20 flex-shrink-0">{row.label}</span>
                                  <div className="flex-1 h-5 bg-neutral-100 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${row.color} transition-all flex items-center justify-end pr-2`}
                                      style={{ width: `${row.max > 0 ? Math.round((row.value / row.max) * 100) : 0}%` }}>
                                      {row.value > 0 && <span className="text-[10px] text-white font-bold">{row.value}pt</span>}
                                    </div>
                                  </div>
                                  <span className="text-xs font-semibold text-neutral-700 w-12 text-right">{row.max > 0 ? Math.round((row.value / row.max) * 100) : 0}%</span>
                                </div>
                              ))}
                            </div>
                            {sprintReport.totalPoints > (sprintReport.sprint?.capacity || Infinity) && (
                              <p className="text-xs text-semantic-warning mt-3">⚠ Over-committed: {sprintReport.totalPoints}pt committed exceeds {sprintReport.sprint?.capacity}pt capacity</p>
                            )}
                          </div>
                        )}

                        {/* Item outcomes */}
                        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
                          <div className="px-5 py-3 border-b border-neutral-100">
                            <h3 className="font-semibold text-neutral-900">Item Outcomes</h3>
                          </div>
                          <div className="divide-y divide-neutral-50">
                            {(sprintReport.items || []).map(item => (
                              <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                                <TypeBadge type={item.type} compact />
                                <span className="font-mono text-[10px] text-neutral-400 w-20">{item.id}</span>
                                <span className="flex-1 text-sm text-neutral-900">{item.title}</span>
                                {item.story_points > 0 && <span className="text-xs text-neutral-400">{item.story_points}pt</span>}
                                <StatusBadge category={statusToCategory(item.status)}>{item.status}</StatusBadge>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Scope-change timeline */}
                        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
                          <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between">
                            <h3 className="font-semibold text-neutral-900">Scope-Change Timeline</h3>
                            <span className="text-xs text-neutral-400">Items added/removed mid-sprint</span>
                          </div>
                          {scopeChanges.length === 0 ? (
                            <p className="text-xs text-neutral-400 text-center py-6">No scope changes — sprint stayed on plan ✓</p>
                          ) : (
                            <div className="divide-y divide-neutral-50">
                              {scopeChanges.map((c, i) => (
                                <div key={i} className="flex items-center gap-3 px-5 py-3">
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.change_type === 'ADDED' ? 'bg-semantic-success-surface text-semantic-success' : 'bg-semantic-danger-surface text-semantic-danger'}`}>
                                    {c.change_type === 'ADDED' ? '+ Added' : '− Removed'}
                                  </span>
                                  {c.type && <TypeBadge type={c.type} compact />}
                                  <span className="flex-1 text-sm text-neutral-900">{c.title || c.work_item_id}</span>
                                  <span className="text-xs text-neutral-400">{c.actor_name || 'System'}</span>
                                  <span className="text-[10px] text-neutral-300">{c.occurred_at ? new Date(c.occurred_at).toLocaleDateString() : ''}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-neutral-400 text-center py-10">Select a sprint above to view its report.</p>
                    )}
                  </>
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

              {/* Notification Preferences */}
              <div className="bg-white rounded-xl border border-neutral-200 p-6">
                <h2 className="font-semibold text-neutral-900 mb-1">Notification Preferences</h2>
                <p className="text-sm text-neutral-400 mb-4">Control what notifies you</p>
                {[
                  { key: 'notifyAssign',  label: 'Assigned to a work item' },
                  { key: 'notifyComment', label: 'New comment on my items' },
                  { key: 'notifyMention', label: '@mentioned in a comment' },
                  { key: 'emailDigest',   label: 'Daily email digest' },
                ].map(pref => (
                  <label key={pref.key} className="flex items-center justify-between py-2.5 border-b border-neutral-100 last:border-0 cursor-pointer">
                    <span className="text-sm text-neutral-700">{pref.label}</span>
                    <input type="checkbox" checked={notifPrefs[pref.key]}
                      onChange={e => { const updated = { ...notifPrefs, [pref.key]: e.target.checked }; saveNotifPrefs(updated); }}
                      className="w-4 h-4 accent-brand-navy" />
                  </label>
                ))}
              </div>

              {/* MFA / Two-Factor Authentication */}
              <div className="bg-white rounded-xl border border-neutral-200 p-6 mt-6">
                <h2 className="font-semibold text-neutral-900 mb-1">Two-Factor Authentication (TOTP)</h2>
                <p className="text-sm text-neutral-400 mb-4">Secure your account with an authenticator app (Google Authenticator, Authy, etc.)</p>
                {!mfaSetup ? (
                  <Button variant="secondary" onClick={handleMfaEnroll}>
                    🔐 Set up authenticator app
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                      <p className="text-xs font-semibold text-neutral-600 mb-2">1. Scan this QR code with your authenticator app</p>
                      <div className="bg-white border border-neutral-300 rounded p-3 text-center mb-3">
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(mfaSetup.otpAuthUri)}&size=160x160`}
                          alt="TOTP QR Code" className="mx-auto w-40 h-40" />
                      </div>
                      <p className="text-xs text-neutral-500 mb-1">Or enter this secret manually:</p>
                      <code className="text-xs bg-neutral-100 px-2 py-1 rounded font-mono break-all">{mfaSetup.secret}</code>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-neutral-600 mb-2">2. Enter the 6-digit code to confirm</p>
                      <div className="flex gap-2">
                        <input type="text" inputMode="numeric" maxLength={6} placeholder="000000"
                          value={mfaSetupCode} onChange={e => setMfaSetupCode(e.target.value.replace(/\D/g,''))}
                          className="input w-32 text-center tracking-widest text-lg font-mono" />
                        <Button variant="action" onClick={handleMfaConfirm} disabled={mfaSetupCode.length !== 6}>
                          Activate MFA
                        </Button>
                        <Button variant="secondary" onClick={() => { setMfaSetup(null); setMfaSetupCode(''); }}>
                          Cancel
                        </Button>
                      </div>
                      {mfaSetupMsg && <p className="text-xs text-semantic-danger mt-2">{mfaSetupMsg}</p>}
                    </div>
                  </div>
                )}
              </div>

              {/* Role Management — ADMIN+ only */}
              {can('manage_roles') && (
                <div className="bg-white rounded-xl border border-neutral-200 p-6">
                  <h2 className="font-semibold text-neutral-900 mb-1">Role Management</h2>
                  <p className="text-sm text-neutral-400 mb-4">Control what each member can do</p>
                  <div className="mb-4 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                    <p className="text-xs font-semibold text-neutral-600 mb-2">Tier Hierarchy</p>
                    {[
                      { role: 'VIEWER', tier: 1, desc: 'View only — no create/edit' },
                      { role: 'MEMBER', tier: 2, desc: 'Create & edit own items' },
                      { role: 'LEAD',   tier: 3, desc: 'Edit any item, manage sprints' },
                      { role: 'ADMIN',  tier: 4, desc: 'Full workspace management' },
                      { role: 'OWNER',  tier: 5, desc: 'Ownership + billing control' },
                    ].map(r => (
                      <div key={r.role} className="flex items-center gap-2 py-1">
                        <RoleBadge role={r.role} tier={r.tier} />
                        <span className="text-xs text-neutral-500">{r.desc}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1">
                    {workspaceMembers.map(m => (
                      <div key={m.id} className="flex items-center gap-3 py-2 border-b border-neutral-100 last:border-0">
                        <Avatar name={m.fullName} size={7} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 truncate">{m.fullName}</p>
                          <p className="text-xs text-neutral-400 truncate">{m.email}</p>
                        </div>
                        {m.id === currentUser.id
                          ? <RoleBadge role={m.role || userRole.role} tier={userRole.tier} />
                          : <select defaultValue={m.role || 'MEMBER'}
                              onChange={e => {
                                fetch(`${API}/rbac/members/${m.id}/role`, {
                                  method: 'PUT', headers: headers(),
                                  body: JSON.stringify({ roleId: e.target.value })
                                }).then(r => r.json()).then(d => showToast(d.message || 'Role updated'))
                                  .catch(err => showToast(err.message, 'error'));
                              }}
                              className="text-xs border border-neutral-200 rounded px-2 py-1 focus:outline-none text-neutral-700">
                              {['VIEWER','MEMBER','LEAD','ADMIN'].map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        }
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Workspace Branding */}
              {can('manage_projects') && (
                <div className="bg-white rounded-xl border border-neutral-200 p-6 mt-6">
                  <h2 className="font-semibold text-neutral-900 mb-1">Workspace Branding</h2>
                  <p className="text-sm text-neutral-400 mb-4">Customize your workspace appearance</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">Primary Accent Color</label>
                      <div className="flex items-center gap-3">
                        <input type="color" value={brandingColor}
                          onChange={e => setBrandingColor(e.target.value)}
                          className="w-10 h-10 rounded-lg border border-neutral-200 cursor-pointer" />
                        <input type="text" value={brandingColor}
                          onChange={e => setBrandingColor(e.target.value)}
                          className="input w-32 font-mono text-sm" placeholder="#E94E1B" />
                        <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ backgroundColor: brandingColor }}></div>
                        <span className="text-xs text-neutral-400">Used for action buttons and accents</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">Workspace Description</label>
                      <textarea rows={2} value={brandingDesc} onChange={e => setBrandingDesc(e.target.value)}
                        className="input resize-none" placeholder="Describe your workspace..." />
                    </div>
                    <Button variant="action" onClick={saveBranding}>Save Branding</Button>
                  </div>
                </div>
              )}

              {/* Project Members */}
              <div className="bg-white rounded-xl border border-neutral-200 p-6 mt-6">
                <h2 className="font-semibold text-neutral-900 mb-1">Project Members</h2>
                <p className="text-sm text-neutral-400 mb-4">Manage per-project team membership</p>
                <div className="flex gap-2 mb-4 flex-wrap">
                  {projects.filter(p => !p.archived).map(p => (
                    <button key={p.id} onClick={() => fetchProjectMembers(p.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${selectedProjectId === p.id ? 'bg-brand-navy text-white border-brand-navy' : 'bg-white text-neutral-600 border-neutral-200 hover:border-brand-navy'}`}>
                      {p.name}
                    </button>
                  ))}
                </div>
                {selectedProjectId && (
                  <>
                    <div className="space-y-1 mb-4 max-h-40 overflow-y-auto">
                      {projectMembers.map(m => (
                        <div key={m.user_id || m.id} className="flex items-center gap-3 py-2 border-b border-neutral-100 last:border-0">
                          <Avatar name={m.full_name || m.fullName} size={7} />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-neutral-900">{m.full_name || m.fullName}</p>
                            <p className="text-xs text-neutral-400">{m.email}</p>
                          </div>
                          <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">{m.role}</span>
                        </div>
                      ))}
                      {projectMembers.length === 0 && <p className="text-sm text-neutral-400 py-2 text-center">No project-specific members yet.</p>}
                    </div>
                    <div className="flex gap-2">
                      <input type="email" placeholder="Email address"
                        value={projectMemberEmail} onChange={e => setProjectMemberEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addProjectMember(selectedProjectId)}
                        className="input flex-1 text-sm" />
                      <Button variant="secondary" onClick={() => addProjectMember(selectedProjectId)}>Add</Button>
                    </div>
                    {projectMemberMsg && <p className="text-xs text-semantic-success mt-2">{projectMemberMsg}</p>}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ======================================================
               ITERATION 3 — WORKFLOWS & FIELDS SETTINGS
             ====================================================== */}
          {view === 'settings3' && (
            <div className="p-8 max-w-5xl">
              <h1 className="text-2xl font-bold text-brand-navy mb-1">Workflows & Fields</h1>
              <p className="text-sm text-neutral-400 mb-5">Configure workflows, custom fields, permissions, and work item types</p>

              {/* Sub-tabs */}
              <div className="flex gap-1 mb-6 border-b border-neutral-200">
                {[
                  { key: 'workflows',   label: 'Workflows' },
                  { key: 'fields',      label: 'Custom Fields' },
                  { key: 'permissions', label: 'Permissions' },
                  { key: 'types',       label: 'Item Types' },
                ].map(t => (
                  <button key={t.key} onClick={() => {
                    setSettings3Tab(t.key);
                    if (t.key === 'permissions') fetchPermMatrix();
                  }}
                    className={`text-sm font-medium px-4 py-2 border-b-2 transition-colors ${settings3Tab === t.key ? 'border-brand-navy text-brand-navy' : 'border-transparent text-neutral-400 hover:text-neutral-700'}`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* WORKFLOWS TAB */}
              {settings3Tab === 'workflows' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="font-semibold text-neutral-900">Workflow Definitions</h2>
                    <Button variant="action" onClick={() => {
                      fetch(`${API}/workflows`, { method: 'POST', headers: headers(), body: JSON.stringify({ name: 'New Workflow', workspaceId: 'WS-001', isDefault: false }) })
                        .then(r => r.json()).then(() => fetchWorkflows());
                    }}>+ New Workflow</Button>
                  </div>
                  {workflows.length === 0
                    ? <EmptyState icon="⚙" title="No workflows yet" subtitle="Create a workflow to define statuses and transitions for your work items." action={<Button variant="action" onClick={() => { fetch(`${API}/workflows`, { method: 'POST', headers: headers(), body: JSON.stringify({ name: 'Default Workflow', workspaceId: 'WS-001', isDefault: true }) }).then(r => r.json()).then(() => fetchWorkflows()); }}>Create default workflow</Button>} />
                    : <div className="space-y-3">
                        {workflows.map(wf => (
                          <div key={wf.id} className="bg-white border border-neutral-200 rounded-xl p-5">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <span className="font-semibold text-neutral-900">{wf.name}</span>
                                {wf.isDefault && <span className="text-[10px] bg-brand-navy text-white px-2 py-0.5 rounded-full font-semibold">DEFAULT</span>}
                                {wf.itemType && <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded">{wf.itemType}</span>}
                              </div>
                              <div className="flex gap-2">
                                <span className="font-mono text-xs text-neutral-400">{wf.id}</span>
                                <button onClick={() => fetch(`${API}/workflows/${wf.id}`, { method: 'DELETE', headers: headers() }).then(() => fetchWorkflows())}
                                  className="text-xs text-semantic-danger hover:underline">Delete</button>
                              </div>
                            </div>
                            <p className="text-xs text-neutral-400">Visual workflow editor — add statuses and transitions via the API or future drag-drop UI</p>
                          </div>
                        ))}
                      </div>
                  }
                </div>
              )}

              {/* CUSTOM FIELDS TAB */}
              {settings3Tab === 'fields' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="font-semibold text-neutral-900">Custom Field Library</h2>
                    <Button variant="action" onClick={() => {
                      const name = window.prompt('Field name:');
                      const type = window.prompt('Field type (TEXT/NUMBER/SELECT/DATE/CHECKBOX/USER/URL/CURRENCY/MULTI_SELECT/TEXTAREA/EMAIL/PHONE/RATING/PROGRESS/FILE/JSON):') || 'TEXT';
                      if (name) {
                        fetch(`${API}/field-defs`, { method: 'POST', headers: headers(), body: JSON.stringify({ name, fieldType: type.toUpperCase(), fieldKey: name.toLowerCase().replace(/\s+/g,'_'), workspaceId: 'WS-001' }) })
                          .then(r => r.json()).then(() => fetchFieldDefs());
                      }
                    }}>+ New Field</Button>
                  </div>
                  {fieldDefs.length === 0
                    ? <EmptyState icon="📝" title="No custom fields" subtitle="Create custom fields to capture domain-specific data on work items." />
                    : <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-neutral-50 border-b border-neutral-200">
                            <tr>
                              {['Field Name', 'Type', 'Key', 'Required', ''].map(h => (
                                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100">
                            {fieldDefs.map(fd => (
                              <tr key={fd.id} className="hover:bg-neutral-50">
                                <td className="px-4 py-3 font-medium text-neutral-900">{fd.name}</td>
                                <td className="px-4 py-3"><span className="text-xs bg-brand-navy/10 text-brand-navy px-2 py-0.5 rounded font-mono">{fd.fieldType}</span></td>
                                <td className="px-4 py-3 font-mono text-xs text-neutral-400">{fd.fieldKey}</td>
                                <td className="px-4 py-3"><span className={`text-xs font-semibold ${fd.required ? 'text-semantic-danger' : 'text-neutral-300'}`}>{fd.required ? '✓ Required' : 'Optional'}</span></td>
                                <td className="px-4 py-3">
                                  <button onClick={() => fetch(`${API}/field-defs/${fd.id}`, { method: 'DELETE', headers: headers() }).then(() => fetchFieldDefs())}
                                    className="text-xs text-semantic-danger hover:underline">Delete</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                  }
                </div>
              )}

              {/* PERMISSIONS MATRIX TAB */}
              {settings3Tab === 'permissions' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="font-semibold text-neutral-900">Roles & Permissions Matrix</h2>
                    <Button variant="action" onClick={() => {
                      const name = window.prompt('Role name:');
                      if (name) {
                        fetch(`${API}/permission-schemes/roles`, { method: 'POST', headers: headers(), body: JSON.stringify({ name, workspaceId: 'WS-001', tier: 2 }) })
                          .then(r => r.json()).then(() => { fetchRoles(); fetchPermMatrix(); });
                      }
                    }}>+ New Role</Button>
                  </div>
                  {!permMatrix
                    ? <div className="text-center py-12 text-neutral-400">Loading permissions matrix...</div>
                    : permMatrix.matrix.length === 0
                      ? <EmptyState icon="🔐" title="No custom roles" subtitle="Create roles to define fine-grained access control for your team." />
                      : <div className="overflow-x-auto">
                          <table className="w-full text-xs border border-neutral-200 rounded-xl overflow-hidden">
                            <thead className="bg-neutral-50">
                              <tr>
                                <th className="text-left px-4 py-2.5 font-semibold text-neutral-700 sticky left-0 bg-neutral-50">Permission</th>
                                {permMatrix.roles.map(r => (
                                  <th key={r.id} className="px-3 py-2.5 font-semibold text-neutral-700 text-center min-w-[90px]">
                                    <div>{r.name}</div>
                                    <div className="font-normal text-neutral-400">Tier {r.tier}</div>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                              {permMatrix.allPermissions.map(perm => (
                                <tr key={perm} className="hover:bg-neutral-50">
                                  <td className="px-4 py-2 font-mono sticky left-0 bg-white">{perm}</td>
                                  {permMatrix.matrix.map(row => (
                                    <td key={row.role.id} className="px-3 py-2 text-center">
                                      <span className={`text-sm font-bold ${row.permissions[perm] ? 'text-semantic-success' : 'text-neutral-200'}`}>
                                        {row.permissions[perm] ? '✓' : '—'}
                                      </span>
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                  }
                </div>
              )}

              {/* ITEM TYPES TAB */}
              {settings3Tab === 'types' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="font-semibold text-neutral-900">Work Item Types</h2>
                    <Button variant="action" onClick={() => {
                      const label = window.prompt('Type label (e.g. Meter Rollout):');
                      const icon  = window.prompt('Icon emoji (e.g. 📟):') || '📦';
                      if (label) {
                        const key = label.toUpperCase().replace(/\s+/g,'_');
                        fetch(`${API}/work-item-types`, { method: 'POST', headers: headers(), body: JSON.stringify({ label, typeKey: key, icon, color: '#6b7280', workspaceId: 'WS-001' }) })
                          .then(r => r.json()).then(() => fetchWorkItemTypes());
                      }
                    }}>+ Custom Type</Button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Built-in Types</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {(workItemTypes.builtIn || []).map(t => (
                          <div key={t.typeKey} className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center gap-3">
                            <span className="text-2xl">{t.icon}</span>
                            <div>
                              <p className="font-semibold text-neutral-900 text-sm">{t.label}</p>
                              <p className="text-xs text-neutral-400 font-mono">{t.typeKey}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {(workItemTypes.custom || []).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Custom Types</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {(workItemTypes.custom || []).map(t => (
                            <div key={t.id} className="bg-white border border-brand-navy/20 rounded-xl p-4 flex items-center gap-3 relative group">
                              <span className="text-2xl">{t.icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-neutral-900 text-sm">{t.label}</p>
                                <p className="text-xs text-neutral-400 font-mono truncate">{t.typeKey}</p>
                              </div>
                              <button onClick={() => fetch(`${API}/work-item-types/${t.id}`, { method: 'DELETE', headers: headers() }).then(() => fetchWorkItemTypes())}
                                className="opacity-0 group-hover:opacity-100 text-semantic-danger text-xs transition-opacity absolute top-2 right-2">✕</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================
               ITERATION 3 — WIQL QUERY
             ====================================================== */}
          {view === 'wiql' && (
            <div className="p-8 max-w-5xl">
              <h1 className="text-2xl font-bold text-brand-navy mb-1">WIQL — Work Item Query Language</h1>
              <p className="text-sm text-neutral-400 mb-5">Write composable queries to filter work items. Use AND/OR, comparison operators, and functions like currentUser() and today().</p>

              <div className="bg-white border border-neutral-200 rounded-xl p-5 mb-4">
                <div className="mb-3">
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Query</label>
                  <div className="flex gap-2 mt-2">
                    <textarea
                      className="input flex-1 font-mono text-sm resize-none"
                      rows={3}
                      placeholder={'priority = High AND assignee = currentUser()\nstatus != Done AND type = Bug\ndueDate < today() AND priority IN (High, Highest)'}
                      value={wiqlQuery}
                      onChange={e => setWiqlQuery(e.target.value)}
                      onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runWiql(); } }}
                    />
                  </div>
                  {wiqlError && <p className="text-xs text-semantic-danger mt-2 font-mono">{wiqlError}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="action" onClick={runWiql}>Run Query (Ctrl+Enter)</Button>
                  <div className="flex gap-2 items-center flex-1">
                    <input className="input flex-1 text-sm" placeholder="Filter name..." value={wiqlFilterName} onChange={e => setWiqlFilterName(e.target.value)} />
                    <Button variant="secondary" onClick={saveWiqlFilter}>Save Filter</Button>
                  </div>
                </div>
                <div className="mt-3 text-xs text-neutral-400">
                  <span className="font-semibold text-neutral-600">Fields:</span> priority, status, type, assignee, dueDate, sprint, storyPoints &nbsp;·&nbsp;
                  <span className="font-semibold text-neutral-600">Ops:</span> = != {'<'} {'>'} {'<='} {'>='} IN CONTAINS STARTSWITH &nbsp;·&nbsp;
                  <span className="font-semibold text-neutral-600">Functions:</span> currentUser() today() now()
                </div>
              </div>

              {/* Saved filters */}
              {wiqlFilters.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Saved Filters</p>
                  <div className="flex flex-wrap gap-2">
                    {wiqlFilters.map(f => (
                      <button key={f.id} onClick={() => { setWiqlQuery(f.query); runWiql(); }}
                        className="flex items-center gap-2 bg-white border border-neutral-200 rounded-lg px-3 py-1.5 text-sm hover:border-brand-navy transition-colors group">
                        <span className="font-medium text-neutral-900">{f.name}</span>
                        {f.isShared && <span className="text-[10px] text-neutral-400">shared</span>}
                        <button onClick={e => { e.stopPropagation(); fetch(`${API}/wiql/filters/${f.id}`, { method: 'DELETE', headers: headers() }).then(() => fetchWiqlFilters()); }}
                          className="text-neutral-300 hover:text-semantic-danger opacity-0 group-hover:opacity-100 transition-opacity ml-1">✕</button>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Results */}
              {wiqlResults.length > 0 && (
                <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
                    <span className="text-sm font-semibold text-neutral-900">{wiqlResults.length} result{wiqlResults.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="divide-y divide-neutral-50 max-h-96 overflow-y-auto">
                    {wiqlResults.map((item, i) => (
                      <div key={item.id || i} className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 cursor-pointer"
                        onClick={() => { const full = workItems.find(w => w.id === item.id); if (full) setSelectedItem(full); }}>
                        <span className="font-mono text-[10px] text-neutral-400 w-24 flex-shrink-0">{item.id}</span>
                        <span className="flex-1 text-sm font-medium text-neutral-900 truncate">{item.title}</span>
                        {item.status && <StatusBadge category={statusToCategory(item.status)}>{item.status}</StatusBadge>}
                        {item.priority && <PriorityBadge priority={item.priority} />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {wiqlResults.length === 0 && wiqlQuery && !wiqlError && (
                <div className="text-center py-12 text-neutral-400">
                  <p className="text-sm">No results. Run the query to see results.</p>
                </div>
              )}
            </div>
          )}

          {/* ======================================================
               ITERATION 4 — PM ARTIFACTS
             ====================================================== */}
          {view === 'pm' && (
            <div className="p-6 max-w-6xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-brand-navy">Project Management</h1>
                  <p className="text-sm text-neutral-400 mt-0.5">RAID logs, decisions, meetings, action items</p>
                </div>
                {/* Project selector */}
                <select className="input text-sm w-48" value={pmProjectId} onChange={e => {
                  const pid = e.target.value;
                  setPmProjectId(pid);
                  if (pid) { fetchRaidDashboard(pid); fetchRisks(pid); fetchAssumptions(pid); fetchPmIssues(pid); fetchDependencies(pid); fetchDecisions(pid); fetchMeetings(pid); fetchActionItems(pid); fetchStakeholders(pid); fetchLessons(pid); }
                }}>
                  <option value="">— Select project —</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {!pmProjectId ? (
                <EmptyState icon="📋" title="Select a project" subtitle="Choose a project above to view its PM artifacts." />
              ) : (
                <>
                  {/* Sub-tabs */}
                  <div className="flex gap-1 mb-5 border-b border-neutral-200 overflow-x-auto">
                    {[
                      { key: 'raid',         label: '🎯 RAID Dashboard' },
                      { key: 'risks',        label: `⚠ Risks (${risks.length})` },
                      { key: 'assumptions',  label: `💡 Assumptions (${assumptions.length})` },
                      { key: 'issues',       label: `🔴 Issues (${pmIssues.length})` },
                      { key: 'deps',         label: `🔗 Dependencies (${dependencies.length})` },
                      { key: 'decisions',    label: `⚖ Decisions (${decisions.length})` },
                      { key: 'meetings',     label: `📅 Meetings (${meetings.length})` },
                      { key: 'actions',      label: `✅ Actions (${actionItems.length})` },
                      { key: 'stakeholders', label: `👥 Stakeholders (${stakeholders.length})` },
                      { key: 'lessons',      label: `📚 Lessons (${lessonsLearned.length})` },
                    ].map(t => (
                      <button key={t.key} onClick={() => setPmTab(t.key)}
                        className={`text-xs font-medium px-3 py-2 border-b-2 whitespace-nowrap transition-colors ${pmTab === t.key ? 'border-brand-navy text-brand-navy' : 'border-transparent text-neutral-400 hover:text-neutral-700'}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* RAID DASHBOARD */}
                  {pmTab === 'raid' && raidDashboard && (
                    <div>
                      {/* Health score */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                        <StatCard label="Health Score" value={`${raidDashboard.healthScore}%`} sub="Overall project health" color={raidDashboard.healthScore > 70 ? 'text-semantic-success' : raidDashboard.healthScore > 40 ? 'text-semantic-warning' : 'text-semantic-danger'} icon="❤" />
                        <StatCard label="Open Risks" value={raidDashboard.riskSummary?.open || 0} sub={`${raidDashboard.riskSummary?.total || 0} total`} color="text-semantic-warning" icon="⚠" onClick={() => setPmTab('risks')} />
                        <StatCard label="Open Issues" value={raidDashboard.issueSummary?.open || 0} sub={`${raidDashboard.issueSummary?.total || 0} total`} color="text-semantic-danger" icon="🔴" onClick={() => setPmTab('issues')} />
                        <StatCard label="Blockers" value={raidDashboard.dependencySummary?.blockers || 0} sub={`${raidDashboard.dependencySummary?.total || 0} deps`} color="text-brand-orange" icon="🔗" onClick={() => setPmTab('deps')} />
                        <StatCard label="Overdue Actions" value={raidDashboard.actionSummary?.overdue || 0} sub={`${raidDashboard.actionSummary?.open || 0} open`} color="text-semantic-danger" icon="⏰" onClick={() => setPmTab('actions')} />
                      </div>

                      {/* Risk heatmap */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-white border border-neutral-200 rounded-xl p-5">
                          <h3 className="font-semibold text-neutral-900 mb-3">Risk Heat Matrix</h3>
                          {(() => {
                            const probs = ['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW'];
                            const impacts = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
                            return (
                              <div>
                                <div className="flex gap-1 mb-1">
                                  <div className="w-16 flex-shrink-0"></div>
                                  {impacts.map(i => <div key={i} className="flex-1 text-[9px] text-neutral-400 text-center uppercase">{i}</div>)}
                                </div>
                                {probs.map(p => (
                                  <div key={p} className="flex gap-1 mb-1">
                                    <div className="w-16 text-[9px] text-neutral-400 flex items-center flex-shrink-0">{p}</div>
                                    {impacts.map(imp => {
                                      const count = (raidDashboard.risks || []).filter(r => r.probability === p && r.impact === imp && r.status === 'OPEN').length;
                                      const heat = (probs.indexOf(p) + impacts.indexOf(imp));
                                      const bg = count === 0 ? 'bg-neutral-100' : heat >= 5 ? 'bg-semantic-danger' : heat >= 3 ? 'bg-semantic-warning' : 'bg-semantic-success';
                                      return (
                                        <div key={imp} className={`flex-1 h-8 rounded flex items-center justify-center text-xs font-bold ${bg} ${count > 0 ? 'text-white' : 'text-neutral-300'}`}>
                                          {count > 0 ? count : ''}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ))}
                                <p className="text-[10px] text-neutral-400 mt-2">Rows = Probability, Columns = Impact. Color = severity.</p>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Open action items */}
                        <div className="bg-white border border-neutral-200 rounded-xl p-5">
                          <h3 className="font-semibold text-neutral-900 mb-3">Overdue & High-Priority Actions</h3>
                          {(raidDashboard.actionItems || []).filter(a => a.status !== 'DONE').slice(0, 5).map(a => (
                            <div key={a.id} className="flex items-center gap-3 py-2 border-b border-neutral-50 last:border-0">
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${a.dueDate && new Date(a.dueDate) < new Date() ? 'bg-semantic-danger' : 'bg-semantic-warning'}`}></span>
                              <span className="flex-1 text-sm text-neutral-900 truncate">{a.title}</span>
                              {a.dueDate && <span className="text-xs text-neutral-400">{a.dueDate}</span>}
                            </div>
                          ))}
                          {(raidDashboard.actionItems || []).filter(a => a.status !== 'DONE').length === 0 && <p className="text-sm text-neutral-400 text-center py-4">No open action items 🎉</p>}
                        </div>
                      </div>
                    </div>
                  )}
                  {pmTab === 'raid' && !raidDashboard && <div className="text-center py-12 text-neutral-400">Loading RAID dashboard...</div>}

                  {/* RISKS */}
                  {pmTab === 'risks' && (
                    <PmArtifactList
                      title="Risks Register" icon="⚠"
                      items={risks}
                      columns={['Title', 'Category', 'Probability', 'Impact', 'Status', 'Owner']}
                      renderRow={r => [r.title, r.category || '—', r.probability, r.impact, r.status, users.find(u => u.id === r.ownerId)?.fullName || '—']}
                      onDelete={id => pmDelete('risk', id)}
                      onAdd={() => { setPmFormOpen('risk'); setPmForm({ probability: 'MEDIUM', impact: 'MEDIUM', status: 'OPEN' }); }}
                    />
                  )}

                  {/* ASSUMPTIONS */}
                  {pmTab === 'assumptions' && (
                    <PmArtifactList
                      title="Assumptions Log" icon="💡"
                      items={assumptions}
                      columns={['Title', 'Validation', 'Owner', 'Expiry']}
                      renderRow={a => [a.title, a.validationStatus, users.find(u => u.id === a.ownerId)?.fullName || '—', a.expiryDate || '—']}
                      onDelete={id => pmDelete('assumption', id)}
                      onAdd={() => { setPmFormOpen('assumption'); setPmForm({ validationStatus: 'UNVALIDATED' }); }}
                    />
                  )}

                  {/* PM ISSUES */}
                  {pmTab === 'issues' && (
                    <PmArtifactList
                      title="Issues Log" icon="🔴"
                      items={pmIssues}
                      columns={['Title', 'Priority', 'Status', 'Owner']}
                      renderRow={i => [i.title, i.priority, i.status, users.find(u => u.id === i.ownerId)?.fullName || '—']}
                      onDelete={id => pmDelete('issue', id)}
                      onAdd={() => { setPmFormOpen('issue'); setPmForm({ priority: 'MEDIUM', status: 'OPEN' }); }}
                    />
                  )}

                  {/* DEPENDENCIES */}
                  {pmTab === 'deps' && (
                    <PmArtifactList
                      title="Dependencies Tracker" icon="🔗"
                      items={dependencies}
                      columns={['Title', 'From', 'To', 'Status', 'Deadline', 'Blocker']}
                      renderRow={d => [d.title, d.dependentTeam || '—', d.providingTeam || '—', d.status, d.deadline || '—', d.isBlocker ? '🚫 YES' : 'No']}
                      onDelete={id => pmDelete('dependency', id)}
                      onAdd={() => { setPmFormOpen('dependency'); setPmForm({ status: 'PENDING', isBlocker: false }); }}
                    />
                  )}

                  {/* DECISIONS */}
                  {pmTab === 'decisions' && (
                    <PmArtifactList
                      title="Decisions Register" icon="⚖"
                      items={decisions}
                      columns={['Title', 'Status', 'Decision Date', 'Owner']}
                      renderRow={d => [d.title, d.status, d.decisionDate || '—', users.find(u => u.id === d.ownerId)?.fullName || '—']}
                      onDelete={id => pmDelete('decision', id)}
                      onAdd={() => { setPmFormOpen('decision'); setPmForm({ status: 'PROPOSED' }); }}
                    />
                  )}

                  {/* MEETINGS */}
                  {pmTab === 'meetings' && (
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="font-semibold text-neutral-900 flex items-center gap-2"><span>📅</span> Meeting Notes</h2>
                        <Button variant="action" onClick={() => { setPmFormOpen('meeting'); setPmForm({ meetingType: 'GENERAL', status: 'SCHEDULED' }); }}>+ New Meeting</Button>
                      </div>
                      {meetings.length === 0
                        ? <EmptyState icon="📅" title="No meetings yet" subtitle="Log meeting notes with structured agenda, notes, decisions, and action items." />
                        : <div className="space-y-3">
                            {meetings.map(m => (
                              <div key={m.id} className="bg-white border border-neutral-200 rounded-xl p-5 cursor-pointer hover:shadow-sm transition-shadow"
                                onClick={() => { setSelectedMeeting(m); setPmTab('meeting-detail'); fetch(`${API}/meetings/${m.id}`, { headers: headers() }).then(r => r.json()).then(d => setMeetingNotes(d.notes || [])); }}>
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs bg-brand-navy/10 text-brand-navy px-2 py-0.5 rounded font-medium">{m.meetingType}</span>
                                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${m.status === 'COMPLETED' ? 'bg-semantic-success/10 text-semantic-success' : m.status === 'CANCELLED' ? 'bg-neutral-100 text-neutral-400' : 'bg-semantic-warning/10 text-semantic-warning'}`}>{m.status}</span>
                                    </div>
                                    <p className="font-semibold text-neutral-900">{m.title}</p>
                                    {m.scheduledAt && <p className="text-xs text-neutral-400 mt-1">📅 {new Date(m.scheduledAt).toLocaleString()}{m.durationMins ? ` · ${m.durationMins}min` : ''}</p>}
                                    {m.location && <p className="text-xs text-neutral-400">📍 {m.location}</p>}
                                  </div>
                                  <button onClick={e => { e.stopPropagation(); pmDelete('meeting', m.id); }} className="text-neutral-300 hover:text-semantic-danger text-xs ml-3">✕</button>
                                </div>
                              </div>
                            ))}
                          </div>
                      }
                    </div>
                  )}

                  {/* MEETING DETAIL */}
                  {pmTab === 'meeting-detail' && selectedMeeting && (
                    <div>
                      <div className="flex items-center gap-3 mb-5">
                        <button onClick={() => { setPmTab('meetings'); setSelectedMeeting(null); }} className="text-neutral-400 hover:text-brand-navy text-sm">← Back</button>
                        <h2 className="font-bold text-brand-navy text-lg">{selectedMeeting.title}</h2>
                        <span className="text-xs bg-brand-navy/10 text-brand-navy px-2 py-0.5 rounded">{selectedMeeting.meetingType}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {['AGENDA', 'NOTES', 'DECISIONS', 'ACTIONS'].map(section => {
                          const note = Array.isArray(meetingNotes) ? meetingNotes.find(n => n.section === section) : null;
                          return (
                            <div key={section} className="bg-white border border-neutral-200 rounded-xl p-4">
                              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">{section}</p>
                              <textarea
                                className="w-full text-sm text-neutral-900 border-none outline-none resize-none min-h-[100px] bg-transparent"
                                placeholder={`Enter ${section.toLowerCase()}...`}
                                defaultValue={note?.content || ''}
                                onBlur={e => {
                                  fetch(`${API}/meetings/${selectedMeeting.id}/notes/${section}`, {
                                    method: 'PUT', headers: headers(),
                                    body: JSON.stringify({ content: e.target.value })
                                  }).catch(() => {});
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ACTION ITEMS */}
                  {pmTab === 'actions' && (
                    <PmArtifactList
                      title="Action Items" icon="✅"
                      items={actionItems}
                      columns={['Title', 'Owner', 'Due Date', 'Status', 'Priority']}
                      renderRow={a => [a.title, users.find(u => u.id === a.ownerId)?.fullName || '—', a.dueDate || '—', a.status, a.priority]}
                      onDelete={id => pmDelete('action', id)}
                      onAdd={() => { setPmFormOpen('action'); setPmForm({ status: 'OPEN', priority: 'MEDIUM' }); }}
                      statusColors={{ OPEN: 'text-semantic-warning', IN_PROGRESS: 'text-brand-navy', DONE: 'text-semantic-success', CANCELLED: 'text-neutral-400' }}
                    />
                  )}

                  {/* STAKEHOLDERS */}
                  {pmTab === 'stakeholders' && (
                    <PmArtifactList
                      title="Stakeholder Register" icon="👥"
                      items={stakeholders}
                      columns={['Name', 'Role', 'Org', 'Influence', 'Interest', 'Strategy']}
                      renderRow={s => [s.name, s.role || '—', s.organization || '—', s.influence, s.interest, s.engagementStrategy]}
                      onDelete={id => pmDelete('stakeholder', id)}
                      onAdd={() => { setPmFormOpen('stakeholder'); setPmForm({ influence: 'MEDIUM', interest: 'MEDIUM', engagementStrategy: 'INFORM', communicationFreq: 'MONTHLY' }); }}
                    />
                  )}

                  {/* LESSONS LEARNED */}
                  {pmTab === 'lessons' && (
                    <PmArtifactList
                      title="Lessons Learned" icon="📚"
                      items={lessonsLearned}
                      columns={['Title', 'Category', 'Created']}
                      renderRow={ll => [ll.title, ll.category || '—', ll.createdAt ? new Date(ll.createdAt).toLocaleDateString() : '—']}
                      onDelete={id => pmDelete('lesson', id)}
                      onAdd={() => { setPmFormOpen('lesson'); setPmForm({ category: 'PROCESS' }); }}
                    />
                  )}
                </>
              )}

              {/* PM CREATE MODAL */}
              {pmFormOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={e => { if (e.target === e.currentTarget) { setPmFormOpen(null); setPmForm({}); } }}>
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
                    <h2 className="font-bold text-xl text-brand-navy mb-4 capitalize">New {pmFormOpen.replace('issue','PM Issue').replace('lesson','Lesson Learned').replace('action','Action Item').replace('dependency','Dependency')}</h2>
                    <div className="space-y-3">
                      <Field label="Title">
                        <input className="input" placeholder="Brief title" value={pmForm.title || ''} onChange={e => setPmForm(p => ({ ...p, title: e.target.value }))} autoFocus />
                      </Field>
                      <Field label="Description">
                        <textarea className="input" rows={2} placeholder="Details..." value={pmForm.description || ''} onChange={e => setPmForm(p => ({ ...p, description: e.target.value }))} />
                      </Field>

                      {pmFormOpen === 'risk' && <>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Probability">
                            <select className="input" value={pmForm.probability || 'MEDIUM'} onChange={e => setPmForm(p => ({ ...p, probability: e.target.value }))}>
                              {['LOW','MEDIUM','HIGH','VERY_HIGH'].map(v => <option key={v}>{v}</option>)}
                            </select>
                          </Field>
                          <Field label="Impact">
                            <select className="input" value={pmForm.impact || 'MEDIUM'} onChange={e => setPmForm(p => ({ ...p, impact: e.target.value }))}>
                              {['LOW','MEDIUM','HIGH','CRITICAL'].map(v => <option key={v}>{v}</option>)}
                            </select>
                          </Field>
                        </div>
                        <Field label="Mitigation Plan">
                          <textarea className="input" rows={2} placeholder="How will you mitigate this risk?" value={pmForm.mitigationPlan || ''} onChange={e => setPmForm(p => ({ ...p, mitigationPlan: e.target.value }))} />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Owner"><select className="input" value={pmForm.ownerId || ''} onChange={e => setPmForm(p => ({ ...p, ownerId: e.target.value || null }))}><option value="">Unassigned</option>{users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}</select></Field>
                          <Field label="Review Date"><input type="date" className="input" value={pmForm.reviewDate || ''} onChange={e => setPmForm(p => ({ ...p, reviewDate: e.target.value || null }))} /></Field>
                        </div>
                      </>}

                      {pmFormOpen === 'assumption' && <>
                        <Field label="Rationale"><textarea className="input" rows={2} placeholder="Why was this assumption made?" value={pmForm.rationale || ''} onChange={e => setPmForm(p => ({ ...p, rationale: e.target.value }))} /></Field>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Owner"><select className="input" value={pmForm.ownerId || ''} onChange={e => setPmForm(p => ({ ...p, ownerId: e.target.value || null }))}><option value="">Unassigned</option>{users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}</select></Field>
                          <Field label="Expiry Date"><input type="date" className="input" value={pmForm.expiryDate || ''} onChange={e => setPmForm(p => ({ ...p, expiryDate: e.target.value || null }))} /></Field>
                        </div>
                      </>}

                      {pmFormOpen === 'issue' && <>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Priority"><select className="input" value={pmForm.priority || 'MEDIUM'} onChange={e => setPmForm(p => ({ ...p, priority: e.target.value }))}>{['CRITICAL','HIGH','MEDIUM','LOW'].map(v => <option key={v}>{v}</option>)}</select></Field>
                          <Field label="Owner"><select className="input" value={pmForm.ownerId || ''} onChange={e => setPmForm(p => ({ ...p, ownerId: e.target.value || null }))}><option value="">Unassigned</option>{users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}</select></Field>
                        </div>
                        <Field label="Impact"><textarea className="input" rows={2} placeholder="Impact of this issue..." value={pmForm.impact || ''} onChange={e => setPmForm(p => ({ ...p, impact: e.target.value }))} /></Field>
                      </>}

                      {pmFormOpen === 'dependency' && <>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Dependent Team"><input className="input" placeholder="Team that needs this" value={pmForm.dependentTeam || ''} onChange={e => setPmForm(p => ({ ...p, dependentTeam: e.target.value }))} /></Field>
                          <Field label="Providing Team"><input className="input" placeholder="Team that provides this" value={pmForm.providingTeam || ''} onChange={e => setPmForm(p => ({ ...p, providingTeam: e.target.value }))} /></Field>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Deadline"><input type="date" className="input" value={pmForm.deadline || ''} onChange={e => setPmForm(p => ({ ...p, deadline: e.target.value || null }))} /></Field>
                          <Field label="Status"><select className="input" value={pmForm.status || 'PENDING'} onChange={e => setPmForm(p => ({ ...p, status: e.target.value }))}>{['PENDING','IN_PROGRESS','RESOLVED','BLOCKED'].map(v => <option key={v}>{v}</option>)}</select></Field>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" checked={!!pmForm.isBlocker} onChange={e => setPmForm(p => ({ ...p, isBlocker: e.target.checked }))} /> <span>This is a blocker</span></label>
                      </>}

                      {pmFormOpen === 'decision' && <>
                        <Field label="Alternatives Considered"><textarea className="input" rows={2} placeholder="What other options were considered?" value={pmForm.alternatives || ''} onChange={e => setPmForm(p => ({ ...p, alternatives: e.target.value }))} /></Field>
                        <Field label="Rationale"><textarea className="input" rows={2} placeholder="Why was this decision made?" value={pmForm.rationale || ''} onChange={e => setPmForm(p => ({ ...p, rationale: e.target.value }))} /></Field>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Owner"><select className="input" value={pmForm.ownerId || ''} onChange={e => setPmForm(p => ({ ...p, ownerId: e.target.value || null }))}><option value="">Unassigned</option>{users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}</select></Field>
                          <Field label="Decision Date"><input type="date" className="input" value={pmForm.decisionDate || ''} onChange={e => setPmForm(p => ({ ...p, decisionDate: e.target.value || null }))} /></Field>
                        </div>
                      </>}

                      {pmFormOpen === 'meeting' && <>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Type"><select className="input" value={pmForm.meetingType || 'GENERAL'} onChange={e => setPmForm(p => ({ ...p, meetingType: e.target.value }))}>{['GENERAL','STANDUP','PLANNING','RETRO','REVIEW','STEERING'].map(v => <option key={v}>{v}</option>)}</select></Field>
                          <Field label="Scheduled"><input type="datetime-local" className="input" value={pmForm.scheduledAt || ''} onChange={e => setPmForm(p => ({ ...p, scheduledAt: e.target.value || null }))} /></Field>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Duration (min)"><input type="number" className="input" value={pmForm.durationMins || ''} onChange={e => setPmForm(p => ({ ...p, durationMins: parseInt(e.target.value) || null }))} /></Field>
                          <Field label="Location"><input className="input" placeholder="Room / URL" value={pmForm.location || ''} onChange={e => setPmForm(p => ({ ...p, location: e.target.value }))} /></Field>
                        </div>
                      </>}

                      {pmFormOpen === 'action' && <>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Owner"><select className="input" value={pmForm.ownerId || ''} onChange={e => setPmForm(p => ({ ...p, ownerId: e.target.value || null }))}><option value="">Unassigned</option>{users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}</select></Field>
                          <Field label="Due Date"><input type="date" className="input" value={pmForm.dueDate || ''} onChange={e => setPmForm(p => ({ ...p, dueDate: e.target.value || null }))} /></Field>
                        </div>
                        <Field label="Priority"><select className="input" value={pmForm.priority || 'MEDIUM'} onChange={e => setPmForm(p => ({ ...p, priority: e.target.value }))}>{['CRITICAL','HIGH','MEDIUM','LOW'].map(v => <option key={v}>{v}</option>)}</select></Field>
                      </>}

                      {pmFormOpen === 'stakeholder' && <>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Role"><input className="input" placeholder="PM / Sponsor / Customer..." value={pmForm.role || ''} onChange={e => setPmForm(p => ({ ...p, role: e.target.value }))} /></Field>
                          <Field label="Organisation"><input className="input" placeholder="Company name" value={pmForm.organization || ''} onChange={e => setPmForm(p => ({ ...p, organization: e.target.value }))} /></Field>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Influence"><select className="input" value={pmForm.influence || 'MEDIUM'} onChange={e => setPmForm(p => ({ ...p, influence: e.target.value }))}>{['LOW','MEDIUM','HIGH'].map(v => <option key={v}>{v}</option>)}</select></Field>
                          <Field label="Interest"><select className="input" value={pmForm.interest || 'MEDIUM'} onChange={e => setPmForm(p => ({ ...p, interest: e.target.value }))}>{['LOW','MEDIUM','HIGH'].map(v => <option key={v}>{v}</option>)}</select></Field>
                        </div>
                        <Field label="Strategy"><select className="input" value={pmForm.engagementStrategy || 'INFORM'} onChange={e => setPmForm(p => ({ ...p, engagementStrategy: e.target.value }))}>{['INFORM','CONSULT','INVOLVE','COLLABORATE','EMPOWER'].map(v => <option key={v}>{v}</option>)}</select></Field>
                      </>}

                      {pmFormOpen === 'lesson' && <>
                        <Field label="Category"><select className="input" value={pmForm.category || 'PROCESS'} onChange={e => setPmForm(p => ({ ...p, category: e.target.value }))}>{['PROCESS','TECHNICAL','COMMUNICATION','RISK','OTHER'].map(v => <option key={v}>{v}</option>)}</select></Field>
                        <Field label="What Worked"><textarea className="input" rows={2} value={pmForm.whatWorked || ''} onChange={e => setPmForm(p => ({ ...p, whatWorked: e.target.value }))} /></Field>
                        <Field label="What Didn't Work"><textarea className="input" rows={2} value={pmForm.whatDidntWork || ''} onChange={e => setPmForm(p => ({ ...p, whatDidntWork: e.target.value }))} /></Field>
                        <Field label="Recommendation"><textarea className="input" rows={2} value={pmForm.recommendation || ''} onChange={e => setPmForm(p => ({ ...p, recommendation: e.target.value }))} /></Field>
                      </>}
                    </div>
                    <div className="flex gap-3 mt-5">
                      <Button variant="action" onClick={() => pmCreate(pmFormOpen, pmForm)} disabled={!pmForm.title}>Create</Button>
                      <Button variant="secondary" onClick={() => { setPmFormOpen(null); setPmForm({}); }}>Cancel</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TRASH VIEW */}
          {view === 'trash' && (
            <div className="p-8 max-w-3xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-brand-navy">Trash</h1>
                  <p className="text-sm text-neutral-400 mt-0.5">Deleted items are kept for 30 days</p>
                </div>
              </div>
              {trashItems.length === 0
                ? <EmptyState icon="🗑" title="Trash is empty" subtitle="Deleted work items will appear here for 30 days before permanent removal." />
                : (
                  <div className="space-y-2">
                    {trashItems.map(item => (
                      <div key={item.id} className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center gap-4">
                        <TypeBadge type={item.type} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 truncate">{item.title}</p>
                          <p className="text-xs text-neutral-400 font-mono">{item.id} · Deleted {item.deletedAt ? new Date(item.deletedAt).toLocaleDateString() : ''}</p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button variant="secondary" size="sm" onClick={() => restoreFromTrash(item.id)}>Restore</Button>
                          <button onClick={() => permanentDelete(item.id)}
                            className="text-xs text-semantic-danger hover:text-semantic-danger/80 px-2 py-1 rounded border border-semantic-danger/30 hover:bg-semantic-danger-surface transition-colors">
                            Delete permanently
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
          )}
        </div>
      </main>

      {/* DETAIL PANEL */}
      {selectedItem && (
        <div className="w-[500px] bg-white border-l border-neutral-200 flex flex-col h-screen overflow-hidden flex-shrink-0">
          <div className="h-14 flex items-center justify-between px-5 border-b border-neutral-200">
            <div className="flex items-center gap-2">
              <TypeBadge type={selectedItem.type} compact />
              <span className="font-mono text-xs text-neutral-400">{selectedItem.id}</span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => toggleStar(selectedItem)}
                title={selectedItem.starred ? 'Unstar' : 'Star this item'}
                className={`text-sm px-2 py-1 rounded transition-colors ${selectedItem.starred ? 'text-brand-orange' : 'text-neutral-300 hover:text-brand-orange'}`}>
                {selectedItem.starred ? '★' : '☆'}
              </button>
              {can('delete_items') && (
                <button onClick={() => handleDelete(selectedItem.id)}
                  className="text-xs text-neutral-400 hover:text-semantic-danger px-2 py-1 rounded hover:bg-neutral-50 transition-colors">Delete</button>
              )}
              <button onClick={() => setSelectedItem(null)}
                className="text-neutral-400 hover:text-neutral-900 p-1 rounded hover:bg-neutral-50 transition-colors">✕</button>
            </div>
          </div>
          {/* Detail panel tabs */}
          <div className="flex border-b border-neutral-200 px-5">
            {[
              { key: 'details',     label: 'Details' },
              { key: 'comments',    label: `Comments ${comments.length > 0 ? `(${comments.length})` : ''}` },
              { key: 'links',       label: `Links ${links.length > 0 ? `(${links.length})` : ''}` },
              { key: 'attachments', label: `Files ${attachments.length > 0 ? `(${attachments.length})` : ''}` },
              { key: 'activity',    label: 'Activity' },
            ].map(t => (
              <button key={t.key} onClick={() => setDetailTab(t.key)}
                className={`text-xs font-medium px-3 py-2.5 border-b-2 transition-colors whitespace-nowrap ${detailTab === t.key ? 'border-brand-navy text-brand-navy' : 'border-transparent text-neutral-400 hover:text-neutral-700'}`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* DETAILS TAB */}
            {detailTab === 'details' && <>
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
                <label className="block text-xs text-neutral-400 mb-1 font-medium">Priority</label>
                <select value={selectedItem.priority || 'MEDIUM'}
                  onChange={e => { const u = { ...selectedItem, priority: e.target.value }; setSelectedItem(u); handleUpdateItem(u); }}
                  className="input">
                  {['CRITICAL','HIGH','MEDIUM','LOW'].map(p => <option key={p} value={p}>{p}</option>)}
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
              <div>
                <label className="block text-xs text-neutral-400 mb-1 font-medium">Story Points</label>
                <input type="number" min={0} max={100} value={selectedItem.storyPoints || 0}
                  onChange={e => { const u = { ...selectedItem, storyPoints: parseInt(e.target.value) || 0 }; setSelectedItem(u); handleUpdateItem(u); }}
                  className="input" />
              </div>
            </div>

            {/* Parent item selector */}
            <div>
              <label className="block text-xs text-neutral-400 mb-1 font-medium">Parent Item</label>
              <select value={selectedItem.parentId || ''}
                onChange={e => { const u = { ...selectedItem, parentId: e.target.value || null }; setSelectedItem(u); handleUpdateItem(u); }}
                className="input">
                <option value="">No parent</option>
                {workItems.filter(i => i.id !== selectedItem.id && (i.type === 'Epic' || i.type === 'Story')).map(i => (
                  <option key={i.id} value={i.id}>{i.id} — {i.title}</option>
                ))}
              </select>
              {selectedItem.parentId && (() => {
                const parent = workItems.find(i => i.id === selectedItem.parentId);
                return parent ? (
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-brand-navy cursor-pointer hover:underline"
                    onClick={() => setSelectedItem(parent)}>
                    <span>↑</span><TypeBadge type={parent.type} compact /><span>{parent.title}</span>
                  </div>
                ) : null;
              })()}
            </div>

            {/* Children items */}
            {itemChildren.length > 0 && (
              <div>
                <label className="block text-xs text-neutral-400 mb-1 font-medium">Sub-items ({itemChildren.length})</label>
                <div className="space-y-1">
                  {itemChildren.map(child => (
                    <div key={child.id} onClick={() => setSelectedItem(child)}
                      className="flex items-center gap-2 p-2 bg-neutral-50 rounded-lg border border-neutral-100 cursor-pointer hover:border-brand-navy/30 transition-colors">
                      <span className="text-neutral-300 text-xs">↳</span>
                      <TypeBadge type={child.type} compact />
                      <span className="font-mono text-[10px] text-neutral-400">{child.id}</span>
                      <span className="flex-1 text-xs text-neutral-900 truncate">{child.title}</span>
                      <StatusBadge category={statusToCategory(child.status)}>{child.status}</StatusBadge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs text-neutral-400 mb-1 font-medium">Tags</label>
              <input type="text" value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onBlur={() => {
                  const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean);
                  const updated = { ...selectedItem, tags };
                  setSelectedItem(updated);
                  handleUpdateItem(updated);
                }}
                placeholder="frontend, urgent, api"
                className="input" />
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-1 font-medium">Description</label>
              <RichTextEditor
                value={selectedItem.description || ''}
                onChange={val => setSelectedItem({ ...selectedItem, description: val })}
                onBlur={() => handleUpdateItem(selectedItem)}
                placeholder="Add a description... (supports **bold**, *italic*, `code`, - bullets)"
              />
            </div>

            </> /* end details tab */}

            {/* COMMENTS TAB */}
            {detailTab === 'comments' && (
              <div>
                {comments.length === 0 && (
                  <p className="text-xs text-neutral-400 text-center py-6">No comments yet. Be the first to comment.</p>
                )}
                <div className="space-y-3 mb-4">
                  {comments.map(c => (
                    <div key={c.id}>
                      {/* Top-level comment */}
                      <div className="flex gap-2.5">
                        <Avatar name={c.authorName || '?'} size={7} />
                        <div className={`flex-1 rounded-xl px-3 py-2.5 border ${c.isInternal ? 'bg-semantic-warning-surface border-semantic-warning/30' : 'bg-neutral-50 border-neutral-100'}`}>
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-xs font-semibold text-neutral-900">{c.authorName}</p>
                            {c.isInternal && <span className="text-[10px] bg-semantic-warning text-white px-1.5 py-0.5 rounded">Internal</span>}
                            <span className="text-[10px] text-neutral-400 ml-auto">{c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}</span>
                          </div>
                          <p className="text-sm text-neutral-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMd(c.body) }} />
                          <button onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)}
                            className="text-[10px] text-neutral-400 hover:text-brand-navy mt-1.5 transition-colors">
                            ↩ Reply {c.replies?.length > 0 && `(${c.replies.length})`}
                          </button>
                        </div>
                      </div>
                      {/* Threaded replies */}
                      {c.replies?.length > 0 && (
                        <div className="ml-9 mt-1.5 space-y-1.5 border-l-2 border-neutral-100 pl-3">
                          {c.replies.map(r => (
                            <div key={r.id} className="flex gap-2">
                              <Avatar name={r.authorName || '?'} size={6} />
                              <div className="flex-1 bg-white rounded-lg px-3 py-2 border border-neutral-100">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <p className="text-[10px] font-semibold text-neutral-900">{r.authorName}</p>
                                  <span className="text-[10px] text-neutral-400 ml-auto">{r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</span>
                                </div>
                                <p className="text-xs text-neutral-700" dangerouslySetInnerHTML={{ __html: renderMd(r.body) }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Reply composer */}
                      {replyingTo === c.id && (
                        <div className="ml-9 mt-1.5 flex gap-2">
                          <Avatar name={currentUser.fullName} size={6} />
                          <div className="flex-1">
                            <textarea rows={2} value={replyBody} onChange={e => setReplyBody(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), addReply(selectedItem.id, c.id))}
                              placeholder="Write a reply... (Enter to send)"
                              className="w-full border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-brand-navy resize-none" />
                            <div className="flex gap-2 mt-1">
                              <Button size="sm" onClick={() => addReply(selectedItem.id, c.id)}>Reply</Button>
                              <button onClick={() => { setReplyingTo(null); setReplyBody(''); }} className="text-xs text-neutral-400 hover:text-neutral-700">Cancel</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {/* Comment composer with @mention + internal flag */}
                <div className="relative">
                  <div className="flex gap-2.5">
                    <Avatar name={currentUser.fullName} size={7} />
                    <div className="flex-1">
                      <textarea rows={2} value={newComment} onChange={handleCommentInput}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAddComment())}
                        placeholder="Write a comment... (@mention to notify, Enter to send)"
                        className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-navy resize-none" />
                      <div className="flex items-center justify-between mt-1.5">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={commentInternal} onChange={e => setCommentInternal(e.target.checked)}
                            className="w-3 h-3 rounded accent-semantic-warning" />
                          <span className="text-xs text-neutral-400">Internal only</span>
                        </label>
                        <Button size="sm" onClick={handleAddComment}>Send</Button>
                      </div>
                    </div>
                  </div>
                  {/* @mention dropdown */}
                  {mentionOpen && (
                    <div className="absolute bottom-full mb-1 left-9 w-56 bg-white rounded-lg shadow-xl border border-neutral-200 z-50 max-h-40 overflow-y-auto">
                      {users.filter(u => !mentionQuery || u.fullName.toLowerCase().includes(mentionQuery)).map(u => (
                        <button key={u.id} onClick={() => insertMention(u)}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-neutral-50 text-left">
                          <Avatar name={u.fullName} size={6} />
                          <span className="text-sm text-neutral-900">{u.fullName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* LINKS TAB */}
            {detailTab === 'links' && (
              <div>
                {/* Visual Link Graph */}
                {links.length > 0 && (
                  <div className="mb-4 bg-neutral-50 rounded-xl p-4 border border-neutral-100">
                    <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-3">Link Graph</p>
                    <div className="flex flex-col items-center gap-2">
                      {/* Current item — center node */}
                      <div className="bg-brand-navy text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm max-w-full truncate">
                        {selectedItem.id}
                      </div>
                      {/* Link lines to related items */}
                      <div className="w-full space-y-1.5">
                        {links.map(l => {
                          const LINK_COLORS = {
                            BLOCKS: 'border-semantic-danger bg-semantic-danger-surface text-semantic-danger',
                            BLOCKED_BY: 'border-semantic-danger bg-semantic-danger-surface text-semantic-danger',
                            RELATES_TO: 'border-brand-navy-tint bg-brand-navy/5 text-brand-navy',
                            DUPLICATES: 'border-semantic-warning bg-semantic-warning-surface text-semantic-warning',
                            PARENT: 'border-purple-400 bg-purple-50 text-purple-700',
                            CHILD: 'border-semantic-success bg-semantic-success/10 text-semantic-success',
                          };
                          const colorClass = LINK_COLORS[l.linkType] || LINK_COLORS.RELATES_TO;
                          return (
                            <div key={l.id} className="flex items-center gap-2">
                              <div className="flex-1 h-px bg-neutral-200"></div>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${colorClass} flex-shrink-0`}>
                                {l.linkType?.replace('_', ' ')}
                              </span>
                              <div className="flex-1 h-px bg-neutral-200"></div>
                              <div className={`text-[10px] font-semibold px-2 py-1 rounded-lg border ${colorClass} cursor-pointer hover:opacity-80 truncate max-w-32`}
                                onClick={() => { const t = workItems.find(i => i.id === l.targetId); if (t) setSelectedItem(t); }}
                                title={l.targetTitle || l.targetId}>
                                {l.targetId}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {links.length === 0 && <p className="text-xs text-neutral-400 text-center py-4">No links yet.</p>}
                <div className="space-y-2 mb-4">
                  {links.map(l => (
                    <div key={l.id} className="flex items-center gap-3 p-2.5 bg-neutral-50 rounded-lg border border-neutral-100">
                      <span className="text-[10px] font-semibold bg-neutral-200 text-neutral-600 px-1.5 py-0.5 rounded uppercase">{l.linkType?.replace('_', ' ')}</span>
                      <span className="flex-1 text-sm text-neutral-900 font-mono">{l.targetId}</span>
                      {l.targetTitle && <span className="text-xs text-neutral-400 truncate max-w-24">{l.targetTitle}</span>}
                      <button onClick={() => handleDeleteLink(l.id)} className="text-neutral-300 hover:text-semantic-danger text-xs">✕</button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <select value={newLink.linkType} onChange={e => setNewLink(p => ({ ...p, linkType: e.target.value }))} className="input w-36">
                    {['BLOCKS','BLOCKED_BY','RELATES_TO','DUPLICATES','PARENT','CHILD'].map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
                  </select>
                  <select value={newLink.targetId} onChange={e => setNewLink(p => ({ ...p, targetId: e.target.value }))} className="input flex-1">
                    <option value="">Select item...</option>
                    {workItems.filter(i => i.id !== selectedItem.id).map(i => (
                      <option key={i.id} value={i.id}>{i.id} — {i.title}</option>
                    ))}
                  </select>
                  <Button size="sm" onClick={handleAddLink}>Link</Button>
                </div>
              </div>
            )}

            {/* ATTACHMENTS TAB */}
            {detailTab === 'attachments' && (
              <div>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleUploadFile} />
                <div className="flex items-center gap-3 mb-4">
                  <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                    ↑ Upload file
                  </Button>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-neutral-400">Max {MAX_UPLOAD_MB} MB per file</span>
                    <span className="text-[10px] bg-semantic-success-surface text-semantic-success px-1.5 py-0.5 rounded flex items-center gap-1">
                      🛡 Virus scan active
                    </span>
                  </div>
                </div>
                {attachments.length === 0 && <p className="text-xs text-neutral-400 text-center py-4">No files attached yet.</p>}
                <div className="space-y-2">
                  {attachments.map(a => {
                    const mime = a.mime_type || a.mimeType || '';
                    const isImage = mime.startsWith('image/');
                    const fileName = a.file_name || a.fileName || '?';
                    const previewUrl = `${API}/work-items/${selectedItem.id}/attachments/${a.id}/content`;
                    const ext = fileName.split('.').pop().toUpperCase().slice(0, 3);
                    return (
                      <div key={a.id} className="bg-neutral-50 rounded-lg border border-neutral-100 overflow-hidden">
                        {isImage && (
                          <div className="border-b border-neutral-100 bg-neutral-100 flex items-center justify-center p-2 max-h-48 overflow-hidden">
                            <img src={previewUrl} alt={fileName}
                              className="max-h-44 max-w-full object-contain rounded"
                              onError={e => { e.target.style.display = 'none'; }} />
                          </div>
                        )}
                        <div className="flex items-center gap-3 p-3">
                          <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 ${isImage ? 'bg-brand-navy/10 text-brand-navy' : 'bg-neutral-200 text-neutral-500'}`}>
                            {isImage ? '🖼' : ext}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-neutral-900 truncate">{fileName}</p>
                            <p className="text-xs text-neutral-400">{a.uploaded_by_name || a.uploadedByName || 'You'} · {a.file_size ? `${Math.round(a.file_size / 1024)}KB` : ''}</p>
                          </div>
                          <a href={previewUrl} target="_blank" rel="noreferrer"
                            className="text-xs text-brand-navy hover:underline flex-shrink-0 mr-2">View</a>
                          <button onClick={() => handleDeleteAttachment(a.id)} className="text-neutral-300 hover:text-semantic-danger text-xs flex-shrink-0">✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ACTIVITY TAB */}
            {detailTab === 'activity' && (
              <div>
                {/* Event type filter */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {['', 'WORK_ITEM_CREATED', 'WORK_ITEM_UPDATED', 'STATUS_CHANGED', 'ASSIGNED', 'COMMENT_ADDED', 'LINKED', 'ATTACHED'].map(et => (
                    <button key={et} onClick={() => {
                      setActivityEventFilter(et);
                      const url = `${API}/work-items/${selectedItem.id}/activity${et ? `?eventType=${et}` : ''}`;
                      fetch(url).then(r => r.json()).then(d => setActivity(Array.isArray(d) ? d : [])).catch(() => {});
                    }}
                      className={`text-[10px] px-2 py-1 rounded-full font-medium transition-colors ${activityEventFilter === et ? 'bg-brand-navy text-white' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'}`}>
                      {et ? et.replace(/_/g, ' ') : 'All'}
                    </button>
                  ))}
                </div>
                {activity.length === 0 && <p className="text-xs text-neutral-400 text-center py-4">No activity recorded yet.</p>}
                <div className="space-y-3">
                  {activity.map(a => (
                    <div key={a.id} className="flex gap-2.5">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        a.event_type === 'WORK_ITEM_CREATED' ? 'bg-semantic-success' :
                        a.event_type === 'STATUS_CHANGED' ? 'bg-brand-navy-tint' :
                        a.event_type === 'COMMENT_ADDED' ? 'bg-brand-orange' :
                        'bg-neutral-300'
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-xs text-neutral-700">
                          <span className="font-semibold">{a.actor_name || 'System'}</span>
                          {' '}{formatEventType(a.event_type)}
                        </p>
                        {/* Field diff display */}
                        {a.field_name && a.old_value !== null && a.new_value !== null && (
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-neutral-400 font-medium capitalize">{String(a.field_name).replace(/_/g,' ')}:</span>
                            {a.old_value && <span className="text-[10px] bg-semantic-danger-surface text-semantic-danger px-1.5 py-0.5 rounded line-through">{a.old_value}</span>}
                            <span className="text-[10px] text-neutral-400">→</span>
                            {a.new_value && <span className="text-[10px] bg-semantic-success-surface text-semantic-success px-1.5 py-0.5 rounded">{a.new_value}</span>}
                          </div>
                        )}
                        <p className="text-[10px] text-neutral-400 mt-0.5">{a.occurred_at ? new Date(a.occurred_at).toLocaleString() : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-xl shadow-xl text-sm font-medium flex items-center gap-3 transition-all ${toast.type === 'error' ? 'bg-semantic-danger text-white' : 'bg-neutral-900 text-white'}`}>
          <span>{toast.type === 'error' ? '✕' : toast.type === 'undo' ? '🗑' : '✓'}</span>
          <span>{toast.message}</span>
          {toast.type === 'undo' && deleteUndoItem && (
            <button onClick={handleUndoDelete}
              className="ml-1 text-brand-orange font-bold hover:text-orange-300 transition-colors text-xs border border-brand-orange/40 rounded px-2 py-0.5">
              Undo
            </button>
          )}
        </div>
      )}

      {/* CREATE SPRINT MODAL */}
      {isSprintOpen && (
        <Modal title="New Sprint" onClose={() => setIsSprintOpen(false)}>
          <div className="space-y-3">
            <Field label="Sprint Name *">
              <input type="text" value={newSprint.name} onChange={e => setNewSprint({ ...newSprint, name: e.target.value })}
                className="input" placeholder="e.g. Sprint 1" autoFocus />
            </Field>
            <Field label="Sprint Goal">
              <input type="text" value={newSprint.goal} onChange={e => setNewSprint({ ...newSprint, goal: e.target.value })}
                className="input" placeholder="e.g. Stabilize portal, ship SAML" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start Date"><input type="date" value={newSprint.startDate} onChange={e => setNewSprint({ ...newSprint, startDate: e.target.value })} className="input" /></Field>
              <Field label="End Date"><input type="date" value={newSprint.endDate} onChange={e => setNewSprint({ ...newSprint, endDate: e.target.value })} className="input" /></Field>
            </div>
            <Field label="Capacity (story points)">
              <input type="number" value={newSprint.capacity} onChange={e => setNewSprint({ ...newSprint, capacity: parseInt(e.target.value) || 0 })} className="input" min={0} />
            </Field>
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <Button variant="ghost" onClick={() => setIsSprintOpen(false)}>Cancel</Button>
            <Button variant="action" onClick={handleCreateSprint}>Create Sprint</Button>
          </div>
        </Modal>
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
              <Field label="Priority">
                <select value={newItem.priority} onChange={e => setNewItem({ ...newItem, priority: e.target.value })} className="input">
                  {['CRITICAL','HIGH','MEDIUM','LOW'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Assignee">
                <select value={newItem.assigneeId} onChange={e => setNewItem({ ...newItem, assigneeId: e.target.value })} className="input">
                  <option value="">Unassigned</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                </select>
              </Field>
              <Field label="Project">
                <select value={newItem.projectId} onChange={e => setNewItem({ ...newItem, projectId: e.target.value })} className="input">
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Parent Item (optional)">
              <select value={newItem.parentId} onChange={e => setNewItem({ ...newItem, parentId: e.target.value })} className="input">
                <option value="">No parent</option>
                {workItems.filter(i => i.type === 'Epic' || i.type === 'Story').map(i => (
                  <option key={i.id} value={i.id}>{i.id} — {i.title}</option>
                ))}
              </select>
            </Field>
            <Field label="Due Date">
              <input type="date" value={newItem.dueDate} onChange={e => setNewItem({ ...newItem, dueDate: e.target.value })} className="input" />
            </Field>
            <Field label="Tags (comma separated)">
              <input type="text" value={newItem.tags} onChange={e => setNewItem({ ...newItem, tags: e.target.value })}
                className="input" placeholder="frontend, urgent" />
            </Field>
            <Field label="Description">
              <textarea rows={3} value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                className="input resize-none" placeholder="Optional description... (supports **bold**, *italic*, - bullets)" />
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

function renderMd(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:#f3f4f6;padding:0 3px;border-radius:3px;font-size:11px">$1</code>')
    .replace(/^- (.+)$/gm, '• $1')
    .replace(/\n/g, '<br/>');
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const ROLE_CONFIG = {
  OWNER:  { label: 'Owner',  bg: 'bg-purple-100',  text: 'text-purple-700', tier: 5 },
  ADMIN:  { label: 'Admin',  bg: 'bg-brand-navy/10', text: 'text-brand-navy', tier: 4 },
  LEAD:   { label: 'Lead',   bg: 'bg-semantic-success/10', text: 'text-semantic-success', tier: 3 },
  MEMBER: { label: 'Member', bg: 'bg-neutral-100',   text: 'text-neutral-600', tier: 2 },
  VIEWER: { label: 'Viewer', bg: 'bg-neutral-50',    text: 'text-neutral-400', tier: 1 },
};

function RoleBadge({ role, tier, small = false }) {
  const r = ROLE_CONFIG[role] || Object.values(ROLE_CONFIG).find(config => config.tier === tier) || ROLE_CONFIG.MEMBER;
  return (
    <span className={`inline-flex items-center gap-1 font-semibold rounded ${small ? 'text-[9px] px-1 py-0.5' : 'text-[10px] px-1.5 py-0.5'} ${r.bg} ${r.text}`}>
      {r.label}
    </span>
  );
}

function StatCard({ label, value, sub, color, icon, onClick }) {
  return (
    <div onClick={onClick} className="bg-white border border-neutral-200 rounded-xl p-5 cursor-pointer hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs text-neutral-400 group-hover:text-brand-navy transition-colors">View →</span>
      </div>
      <p className={`text-3xl font-bold ${color} mb-1`}>{value}</p>
      <p className="text-sm font-medium text-neutral-700">{label}</p>
      <p className="text-xs text-neutral-400 mt-0.5">{sub}</p>
    </div>
  );
}

function formatEventType(eventType) {
  const map = {
    WORK_ITEM_CREATED: 'created this item',
    WORK_ITEM_UPDATED: 'updated this item',
    WORK_ITEM_DELETED: 'deleted this item',
    COMMENT_ADDED:     'added a comment',
    STATUS_CHANGED:    'changed the status',
    ASSIGNED:          'changed the assignee',
    USER_LOGGED_IN:    'logged in',
    USER_SIGNED_UP:    'signed up',
  };
  return map[eventType] || (eventType || '').toLowerCase().replace(/_/g, ' ');
}

const PRIORITY_CONFIG = {
  CRITICAL: { color: 'text-semantic-danger',  bg: 'bg-semantic-danger-surface',  label: 'Critical' },
  HIGH:     { color: 'text-semantic-warning',  bg: 'bg-semantic-warning-surface', label: 'High' },
  MEDIUM:   { color: 'text-neutral-600',       bg: 'bg-neutral-100',              label: 'Medium' },
  LOW:      { color: 'text-neutral-400',       bg: 'bg-neutral-50',               label: 'Low' },
};
function PriorityBadge({ priority }) {
  const p = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.MEDIUM;
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${p.bg} ${p.color}`}>{p.label}</span>;
}

function PmArtifactList({ title, icon, items, columns, renderRow, onDelete, onAdd, statusColors = {} }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-neutral-900 flex items-center gap-2"><span>{icon}</span> {title}</h2>
        <Button variant="action" onClick={onAdd}>+ New</Button>
      </div>
      {items.length === 0
        ? <EmptyState icon={icon} title={`No ${title.toLowerCase()} yet`} subtitle="Click + New to add your first entry." action={<Button variant="action" onClick={onAdd}>+ New</Button>} />
        : <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  {columns.map(c => <th key={c} className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">{c}</th>)}
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {items.map(item => {
                  const cells = renderRow(item);
                  return (
                    <tr key={item.id} className="hover:bg-neutral-50">
                      {cells.map((cell, i) => (
                        <td key={i} className={`px-4 py-3 ${i === 0 ? 'font-medium text-neutral-900 max-w-xs truncate' : 'text-neutral-600 text-xs'}`}>
                          {i === 0 ? cell : (statusColors[cell]
                            ? <span className={`font-semibold ${statusColors[cell]}`}>{cell}</span>
                            : cell)}
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <button onClick={() => onDelete(item.id)} className="text-neutral-300 hover:text-semantic-danger text-xs transition-colors">Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
      }
    </div>
  );
}

function SprintItemList({ sprintId, users, onMoveToBacklog, onSelect }) {
  const [items, setItems] = React.useState([]);
  React.useEffect(() => {
    fetch(`${API}/sprints/${sprintId}/items`)
      .then(r => r.json()).then(d => setItems(Array.isArray(d) ? d : [])).catch(() => {});
  }, [sprintId]);

  if (items.length === 0) return <div className="px-5 py-4 text-sm text-neutral-400 text-center">No items in this sprint yet.</div>;
  return (
    <div className="divide-y divide-neutral-50">
      {items.map(item => (
        <div key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-neutral-50 group">
          <TypeBadge type={item.type} compact />
          <span className="font-mono text-[10px] text-neutral-400 w-20 flex-shrink-0">{item.id}</span>
          <span className="flex-1 text-sm text-neutral-900 cursor-pointer hover:text-brand-navy truncate" onClick={() => onSelect(item)}>{item.title}</span>
          <StatusBadge category={statusToCategory(item.status)}>{item.status}</StatusBadge>
          {(item.storyPoints > 0) && <span className="text-xs bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">{item.storyPoints}pt</span>}
          {item.assigneeId && <Avatar name={users.find(u => u.id === item.assigneeId)?.fullName || ''} size={6} />}
          <button onClick={() => { onMoveToBacklog(item.id); setItems(prev => prev.filter(i => i.id !== item.id)); }}
            className="opacity-0 group-hover:opacity-100 text-xs text-neutral-400 hover:text-brand-navy transition-opacity">↓ Backlog</button>
        </div>
      ))}
    </div>
  );
}

/**
 * WYSIWYG Rich Text Editor
 * Uses contentEditable + execCommand for true what-you-see-is-what-you-get editing.
 * Formatting (bold, italic, lists, headings, links) is applied and rendered immediately —
 * no separate "preview" mode needed. Stores and emits HTML.
 */
function RichTextEditor({ value, onChange, onBlur, placeholder }) {
  const editorRef = useRef(null);
  const isComposing = useRef(false);

  // Sync initial value into the editor DOM (only on mount or external value change)
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    // Only update DOM if it differs (avoids cursor jump on every keystroke)
    if (el.innerHTML !== (value || '')) {
      el.innerHTML = value || '';
    }
  }, []);  // mount-only; ongoing changes come from user input

  const exec = (cmd, arg = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, arg);
    // Emit updated HTML after command
    onChange(editorRef.current?.innerHTML || '');
  };

  const handleInput = () => {
    if (!isComposing.current) onChange(editorRef.current?.innerHTML || '');
  };

  const handleKeyDown = (e) => {
    // Ctrl/Cmd shortcuts
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') { e.preventDefault(); exec('bold'); }
      if (e.key === 'i') { e.preventDefault(); exec('italic'); }
      if (e.key === 'u') { e.preventDefault(); exec('underline'); }
    }
  };

  const handleBlur = () => {
    onChange(editorRef.current?.innerHTML || '');
    onBlur?.();
  };

  const ToolBtn = ({ cmd, arg, title, children, active }) => (
    <button type="button" title={title}
      onMouseDown={e => { e.preventDefault(); exec(cmd, arg); }}
      className={`w-7 h-7 flex items-center justify-center rounded text-xs transition-colors
        ${active ? 'bg-brand-navy text-white' : 'text-neutral-600 hover:bg-neutral-200'}`}>
      {children}
    </button>
  );

  return (
    <div className="border border-neutral-200 rounded-lg overflow-hidden focus-within:border-brand-navy transition-colors">
      {/* WYSIWYG Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-neutral-50 border-b border-neutral-200 flex-wrap">
        <ToolBtn cmd="bold"          title="Bold (Ctrl+B)"><strong>B</strong></ToolBtn>
        <ToolBtn cmd="italic"        title="Italic (Ctrl+I)"><em>I</em></ToolBtn>
        <ToolBtn cmd="underline"     title="Underline (Ctrl+U)"><u>U</u></ToolBtn>
        <ToolBtn cmd="strikeThrough" title="Strikethrough"><s>S</s></ToolBtn>
        <div className="h-4 w-px bg-neutral-200 mx-1"/>
        <ToolBtn cmd="formatBlock" arg="h2"  title="Heading 2"><span className="font-bold text-[10px]">H2</span></ToolBtn>
        <ToolBtn cmd="formatBlock" arg="h3"  title="Heading 3"><span className="font-bold text-[10px]">H3</span></ToolBtn>
        <ToolBtn cmd="formatBlock" arg="p"   title="Paragraph"><span className="text-[10px]">¶</span></ToolBtn>
        <div className="h-4 w-px bg-neutral-200 mx-1"/>
        <ToolBtn cmd="insertUnorderedList" title="Bullet list"><span className="text-[11px]">• —</span></ToolBtn>
        <ToolBtn cmd="insertOrderedList"   title="Numbered list"><span className="text-[11px]">1.</span></ToolBtn>
        <ToolBtn cmd="indent"              title="Indent"><span className="text-[11px]">→</span></ToolBtn>
        <ToolBtn cmd="outdent"             title="Outdent"><span className="text-[11px]">←</span></ToolBtn>
        <div className="h-4 w-px bg-neutral-200 mx-1"/>
        <ToolBtn cmd="removeFormat" title="Clear formatting"><span className="text-[10px]">✕</span></ToolBtn>
        <span className="ml-auto text-[9px] text-neutral-300 pr-1">WYSIWYG</span>
      </div>

      {/* Editable area — true WYSIWYG */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onCompositionStart={() => { isComposing.current = true; }}
        onCompositionEnd={() => { isComposing.current = false; handleInput(); }}
        data-placeholder={placeholder}
        className="min-h-[100px] max-h-64 overflow-y-auto px-3 py-2 text-sm text-neutral-900 focus:outline-none bg-white
          [&_h2]:text-base [&_h2]:font-bold [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1
          [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
          [&_li]:mb-0.5 [&_strong]:font-semibold [&_em]:italic [&_u]:underline [&_s]:line-through
          empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-300"
      />
    </div>
  );
}

function SprintBoard({ items, columns, users, swimlaneBy, onDragStart, onDragOver, onDrop, onSelect, onDelete, density, allItems = [] }) {
  const pad = { compact: 'p-2', comfortable: 'p-3', spacious: 'p-4' };

  const getSwimlanes = () => {
    if (swimlaneBy === 'none') return [{ key: 'all', label: null, items }];
    if (swimlaneBy === 'assignee') {
      const keys = [...new Set(items.map(i => i.assigneeId || 'unassigned'))];
      return keys.map(k => ({ key: k, label: k === 'unassigned' ? 'Unassigned' : users.find(u => u.id === k)?.fullName || k, items: items.filter(i => (i.assigneeId || 'unassigned') === k) }));
    }
    if (swimlaneBy === 'type') {
      const keys = [...new Set(items.map(i => i.type))];
      return keys.map(k => ({ key: k, label: k, items: items.filter(i => i.type === k) }));
    }
    if (swimlaneBy === 'priority') {
      return ['CRITICAL','HIGH','MEDIUM','LOW'].map(p => ({ key: p, label: p, items: items.filter(i => (i.priority || 'MEDIUM') === p) })).filter(s => s.items.length > 0);
    }
    if (swimlaneBy === 'epic') {
      // Group by parent Epic (or "No Epic" if no parent)
      const epicMap = {};
      items.forEach(item => {
        const epicId = item.parentId || 'no-epic';
        if (!epicMap[epicId]) epicMap[epicId] = [];
        epicMap[epicId].push(item);
      });
      return Object.entries(epicMap).map(([epicId, epicItems]) => {
        const epic = allItems.find(i => i.id === epicId && i.type === 'Epic');
        return {
          key: epicId,
          label: epic ? `⚡ ${epic.title}` : epicId === 'no-epic' ? 'No Epic' : epicId,
          items: epicItems
        };
      }).sort((a, b) => {
        if (a.label === 'No Epic') return 1;
        if (b.label === 'No Epic') return -1;
        return a.label.localeCompare(b.label);
      });
    }
    if (swimlaneBy === 'tag') {
      const tagMap = { 'No Tags': [] };
      items.forEach(item => {
        if (!item.tags || item.tags.length === 0) {
          tagMap['No Tags'].push(item);
        } else {
          item.tags.forEach(tag => {
            if (!tagMap[tag]) tagMap[tag] = [];
            tagMap[tag].push(item);
          });
        }
      });
      return Object.entries(tagMap)
        .filter(([, tagItems]) => tagItems.length > 0)
        .map(([tag, tagItems]) => ({ key: tag, label: `🏷 ${tag}`, items: tagItems }))
        .sort((a, b) => {
          if (a.label === '🏷 No Tags') return 1;
          if (b.label === '🏷 No Tags') return -1;
          return a.label.localeCompare(b.label);
        });
    }
    return [{ key: 'all', label: null, items }];
  };

  return (
    <div className="flex-1 overflow-auto">
      {getSwimlanes().map(lane => (
        <div key={lane.key}>
          {lane.label && (
            <div className="flex items-center gap-2 mb-2 mt-4 px-1">
              <div className="h-px flex-1 bg-neutral-200"></div>
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider px-2">{lane.label}</span>
              <div className="h-px flex-1 bg-neutral-200"></div>
            </div>
          )}
          <div className="flex gap-4 min-h-40">
            {columns.map(col => {
              const colItems = lane.items.filter(i => i.status === col.name);
              return (
                <div key={col.name} className="flex-1 min-w-48 flex flex-col bg-neutral-100 rounded-xl p-3"
                  onDragOver={onDragOver} onDrop={(e) => onDrop(e, col.name)}>
                  {!lane.label && (
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${col.dot}`}></span>
                        <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">{col.name}</h3>
                      </div>
                      <span className="text-xs bg-white text-neutral-500 px-2 py-0.5 rounded-full shadow-sm">{colItems.length}</span>
                    </div>
                  )}
                  <div className="space-y-2 flex-1">
                    {colItems.length === 0 && <div className="flex items-center justify-center py-6 border-2 border-dashed border-neutral-200 rounded-lg"><p className="text-xs text-neutral-300">Drop here</p></div>}
                    {colItems.map(item => (
                      <div key={item.id} draggable onDragStart={(e) => onDragStart(e, item.id)}
                        className={`bg-white rounded-lg shadow-sm border border-neutral-200 cursor-grab hover:shadow-md transition-shadow group ${pad[density]}`}>
                        <div className="flex items-start justify-between mb-1.5">
                          <span className="font-mono text-[10px] text-neutral-400">{item.id}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => onSelect(item)} className="text-neutral-400 hover:text-brand-navy text-xs p-0.5">✏</button>
                            <button onClick={() => onDelete(item.id)} className="text-neutral-400 hover:text-semantic-danger text-xs p-0.5">✕</button>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-neutral-900 leading-snug mb-2 cursor-pointer" onClick={() => onSelect(item)}>{item.title}</p>
                        <div className="flex items-center justify-between">
                          <TypeBadge type={item.type} compact={density === 'compact'} />
                          <div className="flex items-center gap-1.5">
                            {(item.storyPoints > 0) && <span className="text-[10px] text-neutral-400 font-medium">{item.storyPoints}pt</span>}
                            {item.assigneeId && <Avatar name={users.find(u => u.id === item.assigneeId)?.fullName || ''} size={5} />}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
