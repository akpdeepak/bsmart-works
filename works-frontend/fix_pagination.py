import re

with open('src/app/AppShell.jsx', 'r') as f:
    content = f.read()

# Add totalBacklogCount state
content = content.replace(
    "const [backlogItems, setBacklogItems] = useState([]);",
    "const [backlogItems, setBacklogItems] = useState([]);\n  const [totalBacklogCount, setTotalBacklogCount] = useState(0);"
)

# Update fetchBacklog
new_fetch_backlog = """  function fetchBacklog(page = 0, size = 200) {
    api.raw(`/work-items/backlog?workspaceId=${encodeURIComponent(activeWorkspaceId)}&page=${page}&size=${size}`)
      .then(async r => {
        const total = r.headers.get('X-Total-Count');
        if (total !== null) setTotalBacklogCount(Number(total));
        if (!r.ok) {
           if (r.status === 401) window.dispatchEvent(new Event('auth-expired'));
           throw new Error('fetch failed');
        }
        return await r.json();
      })
      .then(d => {
        const list = Array.isArray(d) ? d : [];
        setBacklogItems(prev => page === 0 ? list : [...prev, ...list]);
      }).catch(reportError);
  }"""
content = re.sub(r'  function fetchBacklog\(\) \{\n.*?\}\n', new_fetch_backlog + '\n', content, flags=re.DOTALL)

# Update fetchAll to support pagination
content = content.replace('function fetchAll() {', 'function fetchAll(page = 0, size = 200) {')
content = content.replace(
    'api.raw(`/work-items?workspaceId=${encodeURIComponent(activeWorkspaceId)}`).then(async r => {',
    'api.raw(`/work-items?workspaceId=${encodeURIComponent(activeWorkspaceId)}&page=${page}&size=${size}`).then(async r => {'
)
content = content.replace(
    'setWorkItems(Array.isArray(items) ? items : []);',
    'setWorkItems(prev => page === 0 ? (Array.isArray(items) ? items : []) : [...prev, ...(Array.isArray(items) ? items : [])]);'
)

# Add fetchAll and fetchBacklog to context
content = content.replace('fetchBacklog,', 'fetchBacklog, fetchAll,')
# Make sure total counts are in context
content = content.replace('totalWorkItemCount,', 'totalWorkItemCount, totalBacklogCount,')

with open('src/app/AppShell.jsx', 'w') as f:
    f.write(content)
print("Updated pagination in AppShell.jsx")
