import os

files = [
    'src/hooks/useComplianceState.test.js',
    'src/views/notifications-view.test.jsx',
    'src/app/workspaces/useWorkspaceContext.test.js'
]

for filepath in files:
    with open(filepath, 'r') as f:
        content = f.read()

    new_content = content.replace('expect(api.raw)', 'expect(api.send)')
    new_content = new_content.replace('api.raw.mock', 'api.send.mock')
    
    if content != new_content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

