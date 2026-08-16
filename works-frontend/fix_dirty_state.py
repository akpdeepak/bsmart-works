import re

with open('src/views/reportbuilder-view.jsx', 'r') as f:
    content = f.read()

if 'useEffect(() => {' not in content or 'beforeunload' not in content:
    content = content.replace(
        "const { t } = useI18n();",
        "const { t } = useI18n();\n  React.useEffect(() => {\n    const onBeforeUnload = (e) => {\n      if (reportEditMode) {\n        e.preventDefault();\n        e.returnValue = '';\n      }\n    };\n    window.addEventListener('beforeunload', onBeforeUnload);\n    return () => window.removeEventListener('beforeunload', onBeforeUnload);\n  }, [reportEditMode]);"
    )
    with open('src/views/reportbuilder-view.jsx', 'w') as f:
        f.write(content)

with open('src/views/dashboards-view.jsx', 'r') as f:
    content2 = f.read()

if 'useEffect(() => {' not in content2 or 'beforeunload' not in content2:
    content2 = content2.replace(
        "const { t } = useI18n();",
        "const { t } = useI18n();\n  React.useEffect(() => {\n    const onBeforeUnload = (e) => {\n      if (dashboardEditMode) {\n        e.preventDefault();\n        e.returnValue = '';\n      }\n    };\n    window.addEventListener('beforeunload', onBeforeUnload);\n    return () => window.removeEventListener('beforeunload', onBeforeUnload);\n  }, [dashboardEditMode]);"
    )
    with open('src/views/dashboards-view.jsx', 'w') as f:
        f.write(content2)

