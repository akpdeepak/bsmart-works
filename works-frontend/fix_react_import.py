import re

for file_path in ['src/views/reportbuilder-view.jsx', 'src/views/dashboards-view.jsx']:
    with open(file_path, 'r') as f:
        content = f.read()

    # ensure React is imported or import useEffect from react
    if "import { useEffect" not in content and "import React" not in content:
        content = "import { useEffect } from 'react';\n" + content
    
    content = content.replace("React.useEffect", "useEffect")
    
    with open(file_path, 'w') as f:
        f.write(content)
