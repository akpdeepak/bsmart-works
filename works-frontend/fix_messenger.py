import re

with open('src/app/routes/RouteOutlet.jsx', 'r') as f:
    content = f.read()

content = content.replace(
    '<MessengerView workspaceId={activeWorkspaceId} />',
    '<MessengerView workspaceId={activeWorkspaceId} users={users} />'
)

with open('src/app/routes/RouteOutlet.jsx', 'w') as f:
    f.write(content)

