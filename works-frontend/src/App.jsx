import React, { useState, useEffect } from 'react';

export default function App() {
  // --- AUTHENTICATION STATE ---
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [authForm, setAuthForm] = useState({ email: '', password: '', fullName: '' });
  const [authError, setAuthError] = useState('');

  // --- APP STATE ---
  const [workItems, setWorkItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('Task');
  const [validationError, setValidationError] = useState('');

  // Check if we are already logged in when the app opens
  useEffect(() => {
    const savedUser = localStorage.getItem('bSmartUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
    fetchWorkItems();
  }, []);

  const fetchWorkItems = () => {
    fetch('http://localhost:8080/api/v1/work-items')
      .then(res => res.json())
      .then(data => { setWorkItems(data); setLoading(false); })
      .catch(err => console.error(err));
  };

  // --- AUTHENTICATION LOGIC ---
  const handleAuthSubmit = (e) => {
    e.preventDefault();
    setAuthError('');
    
    const endpoint = authMode === 'login' ? '/login' : '/signup';
    
    fetch(`http://localhost:8080/api/v1/auth${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authForm)
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      return data;
    })
    .then(user => {
      setCurrentUser(user);
      localStorage.setItem('bSmartUser', JSON.stringify(user)); // Remember me!
    })
    .catch(err => setAuthError(err.message));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('bSmartUser');
  };

  // --- WORK ITEM LOGIC ---
  const handleCreate = () => {
    if (newTitle.trim() === '' || newTitle.length < 5) {
      setValidationError('Title must be at least 5 characters.');
      return; 
    }
    setValidationError('');
    
    fetch('http://localhost:8080/api/v1/work-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle, type: newType, status: 'Todo' })
    })
    .then(res => res.json())
    .then(savedItem => {
      setWorkItems([...workItems, savedItem]);
      setNewTitle('');
      setIsModalOpen(false);
    });
  };

  const handleDragStart = (e, id) => e.dataTransfer.setData('itemId', id);
  const handleDragOver = (e) => e.preventDefault(); 
  
  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('itemId');
    const itemToMove = workItems.find(i => i.id === itemId);
    if (!itemToMove || itemToMove.status === newStatus) return;

    const updatedItems = workItems.map(item => item.id === itemId ? { ...item, status: newStatus } : item);
    setWorkItems(updatedItems);

    fetch(`http://localhost:8080/api/v1/work-items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...itemToMove, status: newStatus })
    }).catch(err => console.error(err));
  };

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.split(' ');
    return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  const columns = [
    { name: 'Todo', color: 'bg-[#5A6B7E]' },
    { name: 'In Progress', color: 'bg-[#1E4D8C]' },
    { name: 'Done', color: 'bg-[#0E7C5E]' }
  ];

  // ==========================================
  // SCREEN 1: LOGIN / SIGNUP
  // ==========================================
  if (!currentUser) {
    return (
      <div className="flex h-screen bg-[#F2F4F8] items-center justify-center font-sans">
        <div className="bg-white p-8 rounded-lg shadow-xl w-96 border border-[#E5E9EF]">
          
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-8 h-8 bg-[#0B2F5C] rounded-md flex items-end p-1 relative overflow-hidden">
              <div className="w-2 h-2.5 bg-white absolute bottom-1 left-1.5"></div>
              <div className="w-2 h-4 bg-white absolute bottom-1 left-4"></div>
              <div className="w-3 h-3 bg-[#E94E1B] absolute top-0 right-0 transform rotate-45 translate-x-1.5 -translate-y-1.5"></div>
            </div>
            <span className="font-light text-[#5A6B7E] text-2xl leading-none tracking-tight">bSmart</span>
            <span className="font-bold text-[#0B2F5C] text-2xl leading-none tracking-tight">Works</span>
          </div>

          <h2 className="text-xl font-bold text-[#0B2F5C] text-center mb-6">
            {authMode === 'login' ? 'Sign in to your account' : 'Create your workspace account'}
          </h2>

          {authError && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md mb-4 border border-red-100 text-center">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-[#2A3B52] mb-1">Full Name</label>
                <input 
                  type="text" required
                  value={authForm.fullName}
                  onChange={e => setAuthForm({...authForm, fullName: e.target.value})}
                  className="w-full border border-[#E5E9EF] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#0B2F5C]"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-[#2A3B52] mb-1">Email Address</label>
              <input 
                type="email" required
                value={authForm.email}
                onChange={e => setAuthForm({...authForm, email: e.target.value})}
                className="w-full border border-[#E5E9EF] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#0B2F5C]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2A3B52] mb-1">Password</label>
              <input 
                type="password" required
                value={authForm.password}
                onChange={e => setAuthForm({...authForm, password: e.target.value})}
                className="w-full border border-[#E5E9EF] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#0B2F5C]"
              />
            </div>
            <button type="submit" className="w-full bg-[#0B2F5C] text-white py-2.5 rounded-md text-sm font-bold hover:bg-[#1E4D8C] transition-colors mt-2">
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-[#5A6B7E]">
            {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button 
              onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); }}
              className="text-[#E94E1B] font-bold hover:underline">
              {authMode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // SCREEN 2: THE MAIN APPLICATION (Logged In)
  // ==========================================
  return (
    <div className="flex h-screen bg-[#F7F9FC] font-sans text-[#0F1A2A]">
      <aside className="w-64 bg-white border-r border-[#E5E9EF] flex flex-col z-10">
        <div className="h-14 flex items-center px-4 border-b border-[#E5E9EF]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#0B2F5C] rounded-md flex items-end p-1 relative overflow-hidden">
              <div className="w-1.5 h-2 bg-white absolute bottom-1 left-1"></div>
              <div className="w-1.5 h-3 bg-white absolute bottom-1 left-3"></div>
              <div className="w-2 h-2 bg-[#E94E1B] absolute top-0 right-0 transform rotate-45 translate-x-1 -translate-y-1"></div>
            </div>
            <span className="font-light text-[#5A6B7E] text-lg leading-none tracking-tight">bSmart</span>
            <span className="font-bold text-[#0B2F5C] text-lg leading-none tracking-tight">Works</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 text-sm">
          <div className="font-semibold text-[#5A6B7E] text-xs uppercase tracking-wider mb-2 mt-4 px-3">
            BCITS Master Workspace
          </div>
          <a href="#" className="block px-3 py-2 rounded-md bg-[#F2F4F8] text-[#0B2F5C] font-medium">Active Sprints</a>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col relative">
        <header className="h-14 bg-white border-b border-[#E5E9EF] flex items-center justify-between px-6">
          <div className="flex items-center bg-[#F2F4F8] rounded-md px-3 py-1.5 w-64">
            <span className="text-[#9AA8BC] text-sm">Search (Cmd+K)...</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-[#5A6B7E]">
              {currentUser.fullName}
            </span>
            <button 
              onClick={handleLogout}
              title="Click to Logout"
              className="w-8 h-8 rounded-full bg-[#0B2F5C] text-white flex items-center justify-center text-sm font-semibold hover:bg-[#E94E1B] transition-colors">
              {getInitials(currentUser.fullName)}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-[#0B2F5C]">WEB Project Board</h1>
            <button onClick={() => setIsModalOpen(true)} className="bg-[#E94E1B] text-white px-4 py-2 rounded-md text-sm hover:bg-[#d44315]">
              Create Work Item
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64 text-[#5A6B7E]">Loading real data...</div>
          ) : (
            <div className="flex gap-6 h-full">
              {columns.map(col => (
                <div 
                  key={col.name} 
                  className="flex-1 flex flex-col bg-[#F2F4F8] rounded-lg p-3 min-h-[500px]"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.name)}
                >
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="text-sm font-semibold text-[#2A3B52] uppercase tracking-wide">{col.name}</h3>
                    <span className="text-xs bg-[#E5E9EF] text-[#5A6B7E] px-2 py-0.5 rounded-full">
                      {workItems.filter(i => i.status === col.name).length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {workItems.filter(i => i.status === col.name).map(item => (
                      <div 
                        key={item.id} 
                        draggable
                        onDragStart={(e) => handleDragStart(e, item.id)}
                        className="bg-white p-4 rounded-md shadow-sm border border-[#E5E9EF] cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                      >
                        <div className="text-xs font-mono text-[#5A6B7E] mb-1">{item.id}</div>
                        <div className="text-sm font-medium text-[#0F1A2A] leading-snug mb-3">{item.title}</div>
                        <span className={`text-[10px] uppercase tracking-wider font-bold text-white px-2 py-0.5 rounded-sm ${col.color}`}>
                          {item.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CREATE MODAL */}
        {isModalOpen && (
          <div className="absolute inset-0 bg-[#0F1A2A]/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-96 overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E5E9EF] flex justify-between items-center">
                <h2 className="text-lg font-bold text-[#0B2F5C]">New Work Item</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-[#5A6B7E] hover:text-[#0F1A2A]">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {validationError && <div className="text-red-600 bg-red-50 p-2 text-sm rounded">{validationError}</div>}
                <div>
                  <label className="block text-sm mb-1 text-[#2A3B52]">Title</label>
                  <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full border p-2 rounded text-sm"/>
                </div>
                <div>
                  <label className="block text-sm mb-1 text-[#2A3B52]">Type</label>
                  <select value={newType} onChange={e => setNewType(e.target.value)} className="w-full border p-2 rounded text-sm">
                    <option>Task</option><option>Story</option><option>Bug</option>
                  </select>
                </div>
              </div>
              <div className="px-6 py-4 bg-[#F2F4F8] flex justify-end gap-3">
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-[#5A6B7E]">Cancel</button>
                <button onClick={handleCreate} className="bg-[#0B2F5C] text-white px-4 py-2 rounded text-sm">Create Item</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}