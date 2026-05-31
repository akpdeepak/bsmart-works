import re

with open(r'C:\Users\user\Documents\bsmart-works\works-frontend\src\App.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

def r(old, new):
    global c
    c = c.replace(old, new)

# ─── LAYOUT BACKGROUNDS ──────────────────────────────────────────────────────

r('className="flex h-screen bg-neutral-50 font-sans text-neutral-900"',
  'className="flex h-screen bg-neutral-50 dark:bg-neutral-900 font-sans text-neutral-900 dark:text-neutral-100"')

r('className="w-60 bg-white border-r border-neutral-200 flex flex-col z-10 flex-shrink-0"',
  'className="w-60 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-700 flex flex-col z-10 flex-shrink-0"')

r('className="h-14 flex items-center px-3 border-b border-neutral-200 relative"',
  'className="h-14 flex items-center px-3 border-b border-neutral-200 dark:border-neutral-700 relative"')

r('className="absolute top-full left-3 right-3 mt-1 bg-white rounded-lg shadow-xl border border-neutral-200 z-50 py-1"',
  'className="absolute top-full left-3 right-3 mt-1 bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 z-50 py-1"')

r('className="px-3 py-2 border-b border-neutral-100"',
  'className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-700"')

r('className="w-full flex items-center gap-2 px-3 py-2 hover:bg-neutral-50 text-left"',
  'className="w-full flex items-center gap-2 px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-left"')

r('className="border-t border-neutral-100 mt-1 pt-1"',
  'className="border-t border-neutral-100 dark:border-neutral-700 mt-1 pt-1"')

r('className="w-full px-3 py-2 text-xs text-neutral-400 hover:text-brand-navy hover:bg-neutral-50 text-left"',
  'className="w-full px-3 py-2 text-xs text-neutral-400 hover:text-brand-navy hover:bg-neutral-50 dark:hover:bg-neutral-700 text-left"')

r('className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-3 pt-3 pb-1"',
  'className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider px-3 pt-3 pb-1"')

r('className="p-3 border-t border-neutral-200"',
  'className="p-3 border-t border-neutral-200 dark:border-neutral-700"')

r('className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-neutral-50 cursor-pointer"',
  'className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer"')

r('className="ml-auto text-[10px] bg-neutral-100 text-neutral-600 rounded-full px-1.5 py-0.5">{myItems.length}',
  'className="ml-auto text-[10px] bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-full px-1.5 py-0.5">{myItems.length}')

r('"ml-auto text-[10px] bg-neutral-100 text-neutral-600 rounded-full px-1.5 py-0.5">{projects.length}</span>',
  '"ml-auto text-[10px] bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-full px-1.5 py-0.5">{projects.length}</span>')

r('className="h-14 bg-white border-b border-neutral-200 flex items-center justify-between px-6 flex-shrink-0 relative"',
  'className="h-14 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between px-6 flex-shrink-0 relative"')

r('className="bg-neutral-100 rounded-md px-3 py-1.5 w-72 text-sm focus:outline-none focus:ring-1 focus:ring-brand-navy"',
  'className="bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-100 rounded-md px-3 py-1.5 w-72 text-sm focus:outline-none focus:ring-1 focus:ring-brand-navy"')

r('className="absolute top-full mt-1 w-80 bg-white rounded-lg shadow-xl border border-neutral-200 z-50 max-h-64 overflow-y-auto"',
  'className="absolute top-full mt-1 w-80 bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 z-50 max-h-64 overflow-y-auto"')

r('className="w-full text-left px-4 py-2.5 hover:bg-neutral-50 border-b border-neutral-100 last:border-0"',
  'className="w-full text-left px-4 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-700 border-b border-neutral-100 dark:border-neutral-700 last:border-0"')

r('className="absolute top-full mt-1 w-80 bg-white rounded-lg shadow-xl border border-neutral-200 z-50 px-4 py-6 text-center"',
  'className="absolute top-full mt-1 w-80 bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 z-50 px-4 py-6 text-center"')

r('className="px-4 py-2 border-b border-neutral-100"',
  'className="px-4 py-2 border-b border-neutral-100 dark:border-neutral-700"')

r('className="flex-1 flex flex-col min-w-0"',
  'className="flex-1 flex flex-col min-w-0 dark:bg-neutral-900"')

r('className="w-8 h-8 rounded-md flex items-center justify-center text-neutral-400 hover:bg-neutral-100 transition-colors text-base"',
  'className="w-8 h-8 rounded-md flex items-center justify-center text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-base"')

# ─── DETAIL PANEL ────────────────────────────────────────────────────────────

r('className="w-[500px] bg-white border-l border-neutral-200 flex flex-col h-screen overflow-hidden flex-shrink-0"',
  'className="w-[500px] bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-700 flex flex-col h-screen overflow-hidden flex-shrink-0"')

r('className="h-14 flex items-center justify-between px-5 border-b border-neutral-200"',
  'className="h-14 flex items-center justify-between px-5 border-b border-neutral-200 dark:border-neutral-700"')

r('className="flex border-b border-neutral-200 px-5"',
  'className="flex border-b border-neutral-200 dark:border-neutral-700 px-5"')

r('className="flex-1 overflow-y-auto p-5 space-y-5"',
  'className="flex-1 overflow-y-auto p-5 space-y-5 dark:bg-neutral-900"')

r('className="text-neutral-400 hover:text-neutral-900 p-1 rounded hover:bg-neutral-50 transition-colors">✕',
  'className="text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 p-1 rounded hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">✕')

r('className="text-xs text-neutral-400 hover:text-semantic-danger px-2 py-1 rounded hover:bg-neutral-50 transition-colors">Delete',
  'className="text-xs text-neutral-400 hover:text-semantic-danger px-2 py-1 rounded hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">Delete')

r('className="w-full text-lg font-bold text-neutral-900 focus:outline-none border-b border-transparent focus:border-neutral-200 pb-1 bg-transparent"',
  'className="w-full text-lg font-bold text-neutral-900 dark:text-neutral-100 focus:outline-none border-b border-transparent focus:border-neutral-200 dark:focus:border-neutral-600 pb-1 bg-transparent"')

r('className="flex items-center gap-2 p-2 bg-neutral-50 rounded-lg border border-neutral-100 cursor-pointer hover:border-brand-navy/30 transition-colors"',
  'className="flex items-center gap-2 p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-100 dark:border-neutral-700 cursor-pointer hover:border-brand-navy/30 transition-colors"')

r("className={`flex-1 rounded-xl px-3 py-2.5 border ${c.isInternal ? 'bg-semantic-warning-surface border-semantic-warning/30' : 'bg-neutral-50 border-neutral-100'}`}",
  "className={`flex-1 rounded-xl px-3 py-2.5 border ${c.isInternal ? 'bg-semantic-warning-surface border-semantic-warning/30' : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-100 dark:border-neutral-700'}`}")

r('className="flex-1 bg-white rounded-lg px-3 py-2 border border-neutral-100"',
  'className="flex-1 bg-white dark:bg-neutral-800 rounded-lg px-3 py-2 border border-neutral-100 dark:border-neutral-700"')

r('className="w-full border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-brand-navy resize-none"',
  'className="w-full border border-neutral-200 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-brand-navy resize-none"')

r('className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-navy resize-none"',
  'className="w-full border border-neutral-200 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-navy resize-none"')

r('className="absolute bottom-full mb-1 left-9 w-56 bg-white rounded-lg shadow-xl border border-neutral-200 z-50 max-h-40 overflow-y-auto"',
  'className="absolute bottom-full mb-1 left-9 w-56 bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 z-50 max-h-40 overflow-y-auto"')

r('className="mb-4 bg-neutral-50 rounded-xl p-4 border border-neutral-100"',
  'className="mb-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4 border border-neutral-100 dark:border-neutral-700"')

r('className="flex items-center gap-3 p-2.5 bg-neutral-50 rounded-lg border border-neutral-100"',
  'className="flex items-center gap-3 p-2.5 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-100 dark:border-neutral-700"')

r('className="bg-neutral-50 rounded-lg border border-neutral-100 overflow-hidden"',
  'className="bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-100 dark:border-neutral-700 overflow-hidden"')

r('className="border-b border-neutral-100 bg-neutral-100 flex items-center justify-center p-2 max-h-48 overflow-hidden"',
  'className="border-b border-neutral-100 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center p-2 max-h-48 overflow-hidden"')

# ─── MAIN CONTENT AREA ───────────────────────────────────────────────────────

r('className="flex-1 overflow-auto"',
  'className="flex-1 overflow-auto dark:bg-neutral-900"')

# ─── DASHBOARD ───────────────────────────────────────────────────────────────

r('className="flex items-center gap-3 py-2 border-b border-neutral-50 last:border-0 cursor-pointer hover:bg-neutral-50 -mx-2 px-2 rounded"',
  'className="flex items-center gap-3 py-2 border-b border-neutral-50 dark:border-neutral-700 last:border-0 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700 -mx-2 px-2 rounded"')

r('className="flex items-center justify-between py-1 border-b border-neutral-50 last:border-0"',
  'className="flex items-center justify-between py-1 border-b border-neutral-50 dark:border-neutral-700 last:border-0"')

r('className="h-1.5 bg-neutral-100 rounded-full overflow-hidden"',
  'className="h-1.5 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden"')

# ─── MY WORKS ────────────────────────────────────────────────────────────────

r('className="flex gap-1 mb-5 border-b border-neutral-200"',
  'className="flex gap-1 mb-5 border-b border-neutral-200 dark:border-neutral-700"')

r('className="bg-white border border-neutral-200 rounded-lg p-4 flex items-center gap-4 hover:shadow-sm cursor-pointer transition-shadow"',
  'className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 flex items-center gap-4 hover:shadow-sm cursor-pointer transition-shadow"')

r('className="bg-white border border-brand-orange/30 rounded-lg p-4 flex items-center gap-4 hover:shadow-sm cursor-pointer transition-shadow"',
  'className="bg-white dark:bg-neutral-800 border border-brand-orange/30 rounded-lg p-4 flex items-center gap-4 hover:shadow-sm cursor-pointer transition-shadow"')

r("className={`bg-white border rounded-lg p-4 ${!n.read ? 'border-brand-navy-tint/30' : 'border-neutral-200'}`}",
  "className={`bg-white dark:bg-neutral-800 border rounded-lg p-4 ${!n.read ? 'border-brand-navy-tint/30' : 'border-neutral-200 dark:border-neutral-700'}`}")

r('className="bg-white border border-neutral-200 rounded-lg p-3 flex items-center gap-3 hover:shadow-sm cursor-pointer"',
  'className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 flex items-center gap-3 hover:shadow-sm cursor-pointer"')

# ─── BOARD ───────────────────────────────────────────────────────────────────

r('className="flex items-center gap-1 bg-neutral-100 rounded-lg p-1"',
  'className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1"')

r("className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${density === d ? 'bg-white shadow-sm text-brand-navy' : 'text-neutral-400 hover:text-neutral-700'}`}",
  "className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${density === d ? 'bg-white dark:bg-neutral-700 shadow-sm text-brand-navy' : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}")

r('className="flex-1 min-w-56 flex flex-col bg-neutral-100 rounded-xl p-3"',
  'className="flex-1 min-w-56 flex flex-col bg-neutral-100 dark:bg-neutral-800 rounded-xl p-3"')

r('className="text-xs bg-white text-neutral-500 px-2 py-0.5 rounded-full shadow-sm"',
  'className="text-xs bg-white dark:bg-neutral-700 text-neutral-500 dark:text-neutral-300 px-2 py-0.5 rounded-full shadow-sm"')

r("className={`bg-white rounded-lg shadow-sm border border-neutral-200 cursor-grab hover:shadow-md transition-shadow group ${densityPad[density]} ${item.starred ? 'border-brand-orange/40' : ''}`}",
  "className={`bg-white dark:bg-neutral-700 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-600 cursor-grab hover:shadow-md transition-shadow group ${densityPad[density]} ${item.starred ? 'border-brand-orange/40' : ''}`}")

r('className="mt-2 w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-neutral-400 hover:text-neutral-700 hover:bg-white rounded-lg transition-colors"',
  'className="mt-2 w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-white dark:hover:bg-neutral-700 rounded-lg transition-colors"')

r('className="text-[10px] bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded"',
  'className="text-[10px] bg-neutral-100 dark:bg-neutral-600 text-neutral-500 dark:text-neutral-300 px-1.5 py-0.5 rounded"')

# ─── PROJECTS ────────────────────────────────────────────────────────────────

r('className="bg-white border border-neutral-200 rounded-xl p-5 hover:shadow-sm transition-shadow"',
  'className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 hover:shadow-sm transition-shadow"')

r('className="text-[10px] font-mono bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded border border-neutral-200"',
  'className="text-[10px] font-mono bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-300 px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-600"')

# ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

r("className={`bg-white border rounded-xl p-4 flex gap-3 items-start transition-colors ${!n.read ? 'border-brand-navy-tint/30 bg-semantic-info-surface/30' : 'border-neutral-200'}`}",
  "className={`bg-white dark:bg-neutral-800 border rounded-xl p-4 flex gap-3 items-start transition-colors ${!n.read ? 'border-brand-navy-tint/30 bg-semantic-info-surface/30' : 'border-neutral-200 dark:border-neutral-700'}`}")

# ─── BACKLOG ─────────────────────────────────────────────────────────────────

r('className="bg-white border border-neutral-200 rounded-xl mb-4 overflow-hidden"',
  'className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl mb-4 overflow-hidden"')

r('className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 bg-neutral-50"',
  'className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900"')

r('className="bg-white border border-neutral-200 rounded-xl overflow-hidden"',
  'className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden"')

r("className={`flex items-center gap-3 px-5 py-3 border-b border-neutral-50 last:border-0 hover:bg-neutral-50 group transition-colors ${dragOverId === item.id ? 'border-t-2 border-t-brand-navy bg-brand-navy/5' : ''}`}",
  "className={`flex items-center gap-3 px-5 py-3 border-b border-neutral-50 dark:border-neutral-700 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-700 group transition-colors ${dragOverId === item.id ? 'border-t-2 border-t-brand-navy bg-brand-navy/5' : ''}`}")

r('className="text-xs border border-neutral-200 rounded px-1.5 py-1 focus:outline-none text-neutral-600"',
  'className="text-xs border border-neutral-200 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-300 rounded px-1.5 py-1 focus:outline-none text-neutral-600"')

r('className="w-14 text-xs border border-neutral-200 rounded px-1.5 py-1 focus:outline-none text-center"',
  'className="w-14 text-xs border border-neutral-200 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-300 rounded px-1.5 py-1 focus:outline-none text-center"')

r('className="text-xs bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">{item.storyPoints}pt',
  'className="text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-1.5 py-0.5 rounded">{item.storyPoints}pt')

r('className="text-sm border border-neutral-200 rounded-md px-2 py-1.5 focus:outline-none"',
  'className="text-sm border border-neutral-200 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 rounded-md px-2 py-1.5 focus:outline-none"')

r('className="mb-3 bg-white border border-neutral-200 rounded-lg px-4 py-2.5 flex items-center gap-4"',
  'className="mb-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2.5 flex items-center gap-4"')

r('className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden"',
  'className="flex-1 h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden"')

r("className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${JSON.stringify(activeFilter) === JSON.stringify(f.filter) ? 'bg-brand-navy text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}",
  "className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${JSON.stringify(activeFilter) === JSON.stringify(f.filter) ? 'bg-brand-navy text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}")

r('className="text-xs border border-neutral-200 rounded-md px-2 py-1.5 focus:outline-none text-neutral-600 ml-auto"',
  'className="text-xs border border-neutral-200 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 rounded-md px-2 py-1.5 focus:outline-none text-neutral-600 ml-auto"')

r('className="text-xs border border-neutral-200 rounded px-2 py-1 focus:outline-none"',
  'className="text-xs border border-neutral-200 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 rounded px-2 py-1 focus:outline-none"')

# ─── SPRINT SELECTOR CHIPS (reports) ─────────────────────────────────────────

r("className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedSprintId === s.id ? 'bg-brand-navy text-white' : 'bg-white border border-neutral-200 text-neutral-600 hover:border-brand-navy'}`}",
  "className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedSprintId === s.id ? 'bg-brand-navy text-white' : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-brand-navy'}`}")

r('className="h-8 bg-neutral-100 rounded-lg overflow-hidden flex mb-2"',
  'className="h-8 bg-neutral-100 dark:bg-neutral-700 rounded-lg overflow-hidden flex mb-2"')

r('className="flex-1 h-5 bg-neutral-100 rounded-full overflow-hidden"',
  'className="flex-1 h-5 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden"')

r('className="divide-y divide-neutral-50"',
  'className="divide-y divide-neutral-50 dark:divide-neutral-700"')

r('className="px-5 py-3 border-b border-neutral-100"',
  'className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-700"')

r('className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between"',
  'className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-700 flex items-center justify-between"')

# ─── WORKSPACE SETTINGS ──────────────────────────────────────────────────────

r('className="bg-white rounded-xl border border-neutral-200 p-6 mb-6"',
  'className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 mb-6"')

r('className="bg-white rounded-xl border border-neutral-200 p-6"',
  'className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6"')

r('className="flex items-center gap-3 py-2.5 border-b border-neutral-100 last:border-0"',
  'className="flex items-center gap-3 py-2.5 border-b border-neutral-100 dark:border-neutral-700 last:border-0"')

r('"text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">{m.role}',
  '"text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded-full">{m.role}')

r('className="flex items-center justify-between py-2.5 border-b border-neutral-100 last:border-0 cursor-pointer"',
  'className="flex items-center justify-between py-2.5 border-b border-neutral-100 dark:border-neutral-700 last:border-0 cursor-pointer"')

r('className="bg-white rounded-xl border border-neutral-200 p-6 mt-6"',
  'className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 mt-6"')

r('className="bg-neutral-50 border border-neutral-200 rounded-lg p-4"',
  'className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4"')

r('className="bg-white border border-neutral-300 rounded p-3 text-center mb-3"',
  'className="bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded p-3 text-center mb-3"')

r('className="text-xs bg-neutral-100 px-2 py-1 rounded font-mono break-all"',
  'className="text-xs bg-neutral-100 dark:bg-neutral-700 dark:text-neutral-200 px-2 py-1 rounded font-mono break-all"')

r('className="mb-4 p-3 bg-neutral-50 rounded-lg border border-neutral-200"',
  'className="mb-4 p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700"')

r('className="flex items-center gap-3 py-2 border-b border-neutral-100 last:border-0"',
  'className="flex items-center gap-3 py-2 border-b border-neutral-100 dark:border-neutral-700 last:border-0"')

r('className="text-xs border border-neutral-200 rounded px-2 py-1 focus:outline-none text-neutral-700"',
  'className="text-xs border border-neutral-200 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200 rounded px-2 py-1 focus:outline-none text-neutral-700"')

r('className="text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">{m.role}',
  'className="text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded-full">{m.role}')

# ─── ITER 3 ──────────────────────────────────────────────────────────────────

r('className="flex gap-1 mb-6 border-b border-neutral-200"',
  'className="flex gap-1 mb-6 border-b border-neutral-200 dark:border-neutral-700"')

r('className="text-xs bg-brand-navy/10 text-brand-navy px-2 py-0.5 rounded font-mono">{fd.fieldType}',
  'className="text-xs bg-brand-navy/10 dark:bg-brand-navy/20 text-brand-navy dark:text-blue-300 px-2 py-0.5 rounded font-mono">{fd.fieldType}')

r('className="w-full text-xs border border-neutral-200 rounded-xl overflow-hidden"',
  'className="w-full text-xs border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden dark:text-neutral-300"')

r('className="text-left px-4 py-2.5 font-semibold text-neutral-700 sticky left-0 bg-neutral-50"',
  'className="text-left px-4 py-2.5 font-semibold text-neutral-700 dark:text-neutral-300 sticky left-0 bg-neutral-50 dark:bg-neutral-900"')

r('className="px-3 py-2.5 font-semibold text-neutral-700 text-center min-w-[90px]"',
  'className="px-3 py-2.5 font-semibold text-neutral-700 dark:text-neutral-300 text-center min-w-[90px]"')

r('className="px-4 py-2 font-mono sticky left-0 bg-white"',
  'className="px-4 py-2 font-mono sticky left-0 bg-white dark:bg-neutral-800"')

r('className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center gap-3"',
  'className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 flex items-center gap-3"')

r('className="bg-white border border-brand-navy/20 rounded-xl p-4 flex items-center gap-3 relative group"',
  'className="bg-white dark:bg-neutral-800 border border-brand-navy/20 dark:border-brand-navy/30 rounded-xl p-4 flex items-center gap-3 relative group"')

r('className="bg-white border border-neutral-200 rounded-xl p-5 mb-4"',
  'className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 mb-4"')

r('className="flex items-center gap-2 bg-white border border-neutral-200 rounded-lg px-3 py-1.5 text-sm hover:border-brand-navy transition-colors group"',
  'className="flex items-center gap-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 text-sm hover:border-brand-navy transition-colors group"')

# ─── PM ARTIFACTS ────────────────────────────────────────────────────────────

r('className="flex gap-1 mb-5 border-b border-neutral-200 overflow-x-auto"',
  'className="flex gap-1 mb-5 border-b border-neutral-200 dark:border-neutral-700 overflow-x-auto"')

r('className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"',
  'className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50 p-4"')

r('className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6"',
  'className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-lg p-6"')

r('className="bg-white border border-neutral-200 rounded-xl p-5 cursor-pointer hover:shadow-sm transition-shadow"',
  'className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 cursor-pointer hover:shadow-sm transition-shadow"')

r('className="w-full text-sm text-neutral-900 border-none outline-none resize-none min-h-[100px] bg-transparent"',
  'className="w-full text-sm text-neutral-900 dark:text-neutral-100 border-none outline-none resize-none min-h-[100px] bg-transparent"')

r("bg = count === 0 ? 'bg-neutral-100' : heat >= 5 ? 'bg-semantic-danger' : heat >= 3 ? 'bg-semantic-warning' : 'bg-semantic-success'",
  "bg = count === 0 ? 'bg-neutral-100 dark:bg-neutral-700' : heat >= 5 ? 'bg-semantic-danger' : heat >= 3 ? 'bg-semantic-warning' : 'bg-semantic-success'")

# ─── TRASH ───────────────────────────────────────────────────────────────────

r('className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center gap-4"',
  'className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 flex items-center gap-4"')

# ─── AUTH SCREENS ────────────────────────────────────────────────────────────

r('className="flex h-screen bg-neutral-100 items-center justify-center font-sans"',
  'className="flex h-screen bg-neutral-100 dark:bg-neutral-900 items-center justify-center font-sans"')

r('className="bg-white p-8 rounded-xl shadow-xl w-96 border border-neutral-200"',
  'className="bg-white dark:bg-neutral-800 p-8 rounded-xl shadow-xl w-96 border border-neutral-200 dark:border-neutral-700"')

r('className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 mb-4"',
  'className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 mb-4"')

# ─── HELPER COMPONENTS ───────────────────────────────────────────────────────

# NavItem active / inactive
r("className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${active ? 'bg-neutral-100 text-brand-navy font-semibold' : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'}`}",
  "className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${active ? 'bg-neutral-100 dark:bg-neutral-800 text-brand-navy font-semibold' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100'}`}")

# Modal overlay
r('className="fixed inset-0 bg-neutral-900/50 flex items-center justify-center z-50 p-4"',
  'className="fixed inset-0 bg-neutral-900/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"')

# Modal box
r('className="bg-white rounded-xl shadow-2xl w-full max-w-md"',
  'className="bg-white dark:bg-neutral-800 rounded-xl shadow-2xl w-full max-w-md"')

# Modal header
r('className="px-6 py-4 border-b border-neutral-200 flex justify-between items-center"',
  'className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700 flex justify-between items-center"')

# Field label
r('className="block text-sm font-medium text-neutral-700 mb-1"',
  'className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"')

# StatCard
r('className="bg-white border border-neutral-200 rounded-xl p-5 cursor-pointer hover:shadow-md transition-shadow group"',
  'className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 cursor-pointer hover:shadow-md transition-shadow group"')

# PmArtifactList container
r('className="bg-white border border-neutral-200 rounded-xl overflow-hidden">',
  'className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">')

# PmArtifactList table header
r('className="bg-neutral-50 border-b border-neutral-200">',
  'className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700">')

r('className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider"',
  'className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider"')

r('className="divide-y divide-neutral-100">',
  'className="divide-y divide-neutral-100 dark:divide-neutral-700">')

r('className="hover:bg-neutral-50">',
  'className="hover:bg-neutral-50 dark:hover:bg-neutral-700">')

r('className={`px-4 py-3 ${i === 0 ? \'font-medium text-neutral-900 max-w-xs truncate\' : \'text-neutral-600 text-xs\'}`}',
  'className={`px-4 py-3 ${i === 0 ? \'font-medium text-neutral-900 dark:text-neutral-100 max-w-xs truncate\' : \'text-neutral-600 dark:text-neutral-300 text-xs\'}`}')

# SprintItemList
r('className="divide-y divide-neutral-50">',
  'className="divide-y divide-neutral-50 dark:divide-neutral-700">')

r('className="flex items-center gap-3 px-5 py-3 hover:bg-neutral-50 group"',
  'className="flex items-center gap-3 px-5 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-700 group"')

r('className="text-xs bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">{item.storyPoints}pt',
  'className="text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-1.5 py-0.5 rounded">{item.storyPoints}pt')

# RichTextEditor toolbar
r('className="border border-neutral-200 rounded-lg overflow-hidden focus-within:border-brand-navy transition-colors"',
  'className="border border-neutral-200 dark:border-neutral-600 rounded-lg overflow-hidden focus-within:border-brand-navy transition-colors dark:bg-neutral-800"')

r('className="flex items-center gap-0.5 px-2 py-1.5 bg-neutral-50 border-b border-neutral-200 flex-wrap"',
  'className="flex items-center gap-0.5 px-2 py-1.5 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 flex-wrap"')

r('className="h-4 w-px bg-neutral-200 mx-1"',
  'className="h-4 w-px bg-neutral-200 dark:bg-neutral-600 mx-1"')

r('className="min-h-[100px] max-h-64 overflow-y-auto px-3 py-2 text-sm text-neutral-900 focus:outline-none bg-white',
  'className="min-h-[100px] max-h-64 overflow-y-auto px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none bg-white dark:bg-neutral-800')

r("${active ? 'bg-brand-navy text-white' : 'text-neutral-600 hover:bg-neutral-200'}",
  "${active ? 'bg-brand-navy text-white' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'}")

# SprintBoard columns
r('className="flex-1 min-w-48 flex flex-col bg-neutral-100 rounded-xl p-3"',
  'className="flex-1 min-w-48 flex flex-col bg-neutral-100 dark:bg-neutral-800 rounded-xl p-3"')

r("className={`bg-white rounded-lg shadow-sm border border-neutral-200 cursor-grab hover:shadow-md transition-shadow group ${pad[density]}`}",
  "className={`bg-white dark:bg-neutral-700 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-600 cursor-grab hover:shadow-md transition-shadow group ${pad[density]}`}")

r('className="h-px flex-1 bg-neutral-200"',
  'className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700"')

# ─── TEXT COLORS THROUGHOUT ───────────────────────────────────────────────────

# p text
r('className="text-xs text-neutral-400 font-mono">{item.id}',
  'className="text-xs text-neutral-400 dark:text-neutral-500 font-mono">{item.id}')

# Swimlane divider text
r('className="text-xs font-semibold text-neutral-400 uppercase tracking-wider px-2"',
  'className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider px-2"')

# Link graph line
r('className="flex-1 h-px bg-neutral-200"',
  'className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700"')

# ─── REPORTS BG-WHITE P-5 ───────────────────────────────────────────────────

r('className="bg-white border border-neutral-200 rounded-xl p-5">',
  'className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">')

# Tab buttons (shared pattern across multiple views)
r("border-brand-navy text-brand-navy' : 'border-transparent text-neutral-400 hover:text-neutral-700'",
  "border-brand-navy text-brand-navy' : 'border-transparent text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200'")

# Knowledge articles list
r('className="w-full bg-white border border-neutral-200 rounded-xl p-4 text-left hover:border-brand-navy/30 transition-colors"',
  'className="w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 text-left hover:border-brand-navy/30 transition-colors"')

# Releases card
r('className="bg-white border border-neutral-200 rounded-xl p-5">',
  'className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">')

# Inline modal inputs (from modals at tail of file - shared pattern)
r('className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" placeholder=',
  'className="w-full border border-neutral-200 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100 rounded-lg px-3 py-2 text-sm" placeholder=')

r('className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" rows=',
  'className="w-full border border-neutral-200 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100 rounded-lg px-3 py-2 text-sm" rows=')

r('className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" value=',
  'className="w-full border border-neutral-200 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100 rounded-lg px-3 py-2 text-sm" value=')

# version history modal
r('className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0"',
  'className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-700 last:border-0"')

# Reports commitment bar
r('className="bg-white border border-neutral-200 rounded-xl p-5">',
  'className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">')

with open(r'C:\Users\user\Documents\bsmart-works\works-frontend\src\App.jsx', 'w', encoding='utf-8') as f:
    f.write(c)

print(f'Done. File size: {len(c)} chars')
