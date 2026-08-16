import re

with open('src/app/workspaces/useWorkspaceContext.test.js', 'r') as f:
    content = f.read()

content = content.replace(
    """    const api = {
      raw: vi.fn().mockResolvedValue({ json: async () => [{ id: 'WS-A', name: 'Alpha' }] }),
    };""",
    """    const api = {
      send: vi.fn().mockResolvedValue([{ id: 'WS-A', name: 'Alpha' }]),
    };"""
)

content = content.replace(
    "const api = { raw: vi.fn() };",
    "const api = { send: vi.fn() };"
)

with open('src/app/workspaces/useWorkspaceContext.test.js', 'w') as f:
    f.write(content)
