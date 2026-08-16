import re

with open('src/app/AppShell.jsx', 'r') as f:
    content = f.read()

if 'import { queryClient }' not in content:
    content = content.replace(
        "import { Link, useNavigate, useLocation } from 'react-router-dom';",
        "import { Link, useNavigate, useLocation } from 'react-router-dom';\nimport { queryClient } from '@/lib/query-client';"
    )

content = content.replace(
    """    // Soft reload of workspace-bound global state
    setRoleLoaded(false);
    fetchUserRole();
    fetchProjects(id);
    fetchAll(id);
    fetchReleases();
    fetchTeams();""",
    """    // Soft reload of workspace-bound global state
    queryClient.invalidateQueries();
    setRoleLoaded(false);
    fetchUserRole();
    fetchProjects(id);
    fetchAll(0, 200);
    fetchReleases();
    fetchTeams();"""
)

with open('src/app/AppShell.jsx', 'w') as f:
    f.write(content)

