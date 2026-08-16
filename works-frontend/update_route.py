import re

with open('src/app/routes/RouteOutlet.jsx', 'r') as f:
    content = f.read()

if 'totalBacklogCount' not in content:
    content = content.replace('totalWorkItemCount,', 'totalWorkItemCount, totalBacklogCount,')
    
content = content.replace('backlogItems={backlogItems}', 'backlogItems={backlogItems} totalBacklogCount={totalBacklogCount} fetchBacklog={fetchBacklog}')

with open('src/app/routes/RouteOutlet.jsx', 'w') as f:
    f.write(content)

